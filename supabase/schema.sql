-- ============================================================================
-- 献立アプリ (menu-app) Supabase schema
-- ============================================================================
-- Setup steps (see README.md for full detail):
--   1. In Supabase Dashboard → Authentication → Providers → enable "Anonymous
--      Sign-Ins" (the app signs each phone in anonymously; family sharing is
--      done via a 6-character join code, not email/password).
--   2. Open SQL Editor → paste this whole file → Run.
--   3. Copy your Project URL and anon/public key into the app's .env file.
--      Never use the service_role / secret key in the app.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- families: one row per "family room". Sharing happens via join_code.
-- ----------------------------------------------------------------------------
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null unique,
  people_count int not null default 2 check (people_count between 1 and 10),
  -- Preferred display order for menu categories, e.g. ["野菜","肉","その他"].
  -- Categories not listed here keep their default relative order and are
  -- appended after the ones that are.
  category_order jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Migration for existing projects created before category_order existed:
-- alter table families add column if not exists category_order jsonb not null default '[]'::jsonb;

-- ----------------------------------------------------------------------------
-- family_members: links an anonymous auth user to a family.
-- ----------------------------------------------------------------------------
create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid not null,
  display_name text not null default '家族',
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

-- ----------------------------------------------------------------------------
-- ingredients: master list of ingredient names/units, per family.
-- ----------------------------------------------------------------------------
create table if not exists ingredients (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  default_unit text not null default '',
  is_staple boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (family_id, name)
);

-- ----------------------------------------------------------------------------
-- menus: recipes.
-- ----------------------------------------------------------------------------
create table if not exists menus (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  category text not null default 'その他',
  steps jsonb not null default '[]'::jsonb, -- array of strings, ordered
  base_people int not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- menu_ingredients: ingredients required by a menu, quantities are "per
-- base_people" (normally 2) so the app can scale them.
-- ----------------------------------------------------------------------------
create table if not exists menu_ingredients (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  menu_id uuid not null references menus(id) on delete cascade,
  ingredient_id uuid not null references ingredients(id) on delete cascade,
  quantity numeric, -- null when not scalable (e.g. "適量")
  unit text not null default '',
  display_text text, -- override display, e.g. "適量" / "少々"
  sort_order int not null default 0
);

-- ----------------------------------------------------------------------------
-- meal_plan_entries: a menu assigned to a calendar date for a family.
-- Weekly planning is just a UI concept over 7 consecutive dates.
-- ----------------------------------------------------------------------------
create table if not exists meal_plan_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  plan_date date not null,
  menu_id uuid not null references menus(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- shopping_list_items: the live, checkable shopping list.
-- ----------------------------------------------------------------------------
create table if not exists shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  unit text not null default '',
  quantity numeric,
  display_text text, -- override display, e.g. "適量"
  is_checked boolean not null default false,
  source text not null default 'manual', -- 'menu' | 'manual' | 'staple'
  source_menu_names text[] not null default '{}',
  added_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
-- ============================================================================

create or replace function public.is_family_member(fid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from family_members
    where family_id = fid and user_id = auth.uid()
  );
$$;

alter table families enable row level security;
alter table family_members enable row level security;
alter table ingredients enable row level security;
alter table menus enable row level security;
alter table menu_ingredients enable row level security;
alter table meal_plan_entries enable row level security;
alter table shopping_list_items enable row level security;

create policy "member can read own family" on families
  for select using (is_family_member(id));

create policy "member can update own family settings" on families
  for update using (is_family_member(id)) with check (is_family_member(id));

create policy "member can read own membership rows" on family_members
  for select using (is_family_member(family_id));
-- No insert/update/delete policy on family_members: joining/creating a
-- family is only possible through the SECURITY DEFINER functions below.

create policy "member can manage ingredients" on ingredients
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "member can manage menus" on menus
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "member can manage menu_ingredients" on menu_ingredients
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "member can manage meal_plan_entries" on meal_plan_entries
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

create policy "member can manage shopping_list_items" on shopping_list_items
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

-- ============================================================================
-- Family create / join (SECURITY DEFINER so an anonymous user who is not
-- a member yet can still look up a family by code and join it).
-- ============================================================================

create or replace function public.generate_join_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I to avoid confusion
  code text;
  exists_already boolean;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    select exists(select 1 from families where join_code = code) into exists_already;
    exit when not exists_already;
  end loop;
  return code;
end;
$$;

create or replace function public.create_family(p_name text, p_display_name text)
returns table (family_id uuid, join_code text, name text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_code text := generate_join_code();
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  insert into families (name, join_code) values (p_name, v_code) returning id into v_id;
  insert into family_members (family_id, user_id, display_name)
    values (v_id, auth.uid(), coalesce(nullif(trim(p_display_name), ''), '家族'));

  return query select v_id, v_code, p_name;
end;
$$;

create or replace function public.join_family(p_join_code text, p_display_name text)
returns table (family_id uuid, join_code text, name text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_family families%rowtype;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select * into v_family from families where families.join_code = upper(trim(p_join_code));
  if not found then
    raise exception 'INVALID_CODE';
  end if;

  insert into family_members (family_id, user_id, display_name)
    values (v_family.id, auth.uid(), coalesce(nullif(trim(p_display_name), ''), '家族'))
    on conflict (family_id, user_id)
    do update set display_name = excluded.display_name;

  return query select v_family.id, v_family.join_code, v_family.name;
end;
$$;

grant execute on function public.create_family(text, text) to anon, authenticated;
grant execute on function public.join_family(text, text) to anon, authenticated;
grant execute on function public.generate_join_code() to anon, authenticated;
grant execute on function public.is_family_member(uuid) to anon, authenticated;

-- ============================================================================
-- Realtime: allow the app to subscribe to live changes for family sync.
-- ============================================================================
alter publication supabase_realtime add table shopping_list_items;
alter publication supabase_realtime add table meal_plan_entries;
alter publication supabase_realtime add table menus;
alter publication supabase_realtime add table menu_ingredients;
alter publication supabase_realtime add table ingredients;
alter publication supabase_realtime add table families;
