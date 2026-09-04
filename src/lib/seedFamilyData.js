import { supabase } from './supabaseClient'
import { SEED_MENUS, STAPLE_NAMES } from '../data/seedMenus'

/**
 * Populate a brand new family with the starter ingredient master list and
 * the ~30 default menus. Called once, right after a family is created
 * (never on join — the family already has data by then).
 */
export async function seedInitialMenus(familyId) {
  // 1. Build the unique ingredient list (name -> default unit / staple flag)
  const ingredientMap = new Map()
  for (const menu of SEED_MENUS) {
    for (const line of menu.ingredients) {
      if (!ingredientMap.has(line.name)) {
        ingredientMap.set(line.name, {
          family_id: familyId,
          name: line.name,
          default_unit: line.unit || '',
          is_staple: STAPLE_NAMES.includes(line.name),
        })
      }
    }
  }

  const { data: insertedIngredients, error: ingErr } = await supabase
    .from('ingredients')
    .upsert(Array.from(ingredientMap.values()), { onConflict: 'family_id,name' })
    .select('id, name')
  if (ingErr) throw ingErr

  const ingredientIdByName = new Map(insertedIngredients.map((row) => [row.name, row.id]))

  // 2. Insert the menus themselves
  const menuRows = SEED_MENUS.map((m) => ({
    family_id: familyId,
    name: m.name,
    category: m.category,
    steps: m.steps,
    base_people: m.basePeople,
  }))

  const { data: insertedMenus, error: menuErr } = await supabase
    .from('menus')
    .insert(menuRows)
    .select('id, name')
  if (menuErr) throw menuErr

  const menuIdByName = new Map(insertedMenus.map((row) => [row.name, row.id]))

  // 3. Insert menu_ingredients, linking the two above
  const menuIngredientRows = []
  for (const menu of SEED_MENUS) {
    const menuId = menuIdByName.get(menu.name)
    menu.ingredients.forEach((line, index) => {
      menuIngredientRows.push({
        family_id: familyId,
        menu_id: menuId,
        ingredient_id: ingredientIdByName.get(line.name),
        quantity: line.quantity,
        unit: line.unit || '',
        display_text: line.displayText || null,
        sort_order: index,
      })
    })
  }

  const { error: miErr } = await supabase.from('menu_ingredients').insert(menuIngredientRows)
  if (miErr) throw miErr
}
