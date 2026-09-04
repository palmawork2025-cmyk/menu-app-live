import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * All menus for the family, each with its ingredients embedded.
 * Subscribes to realtime changes so every family member's phone stays in sync.
 */
export function useMenus(familyId) {
  const [menus, setMenus] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!familyId) return
    const { data, error } = await supabase
      .from('menus')
      .select('id, name, category, steps, base_people, menu_ingredients(id, quantity, unit, display_text, sort_order, ingredient_id, ingredients(id, name, default_unit, is_staple))')
      .eq('family_id', familyId)
      .order('name')
    if (error) {
      console.error(error)
      setLoading(false)
      return
    }
    const shaped = data.map((m) => ({
      ...m,
      ingredients: [...m.menu_ingredients]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((mi) => ({
          menuIngredientId: mi.id,
          ingredientId: mi.ingredient_id,
          name: mi.ingredients?.name || '(削除済み)',
          quantity: mi.quantity,
          unit: mi.unit,
          displayText: mi.display_text,
          isStaple: mi.ingredients?.is_staple || false,
        })),
    }))
    setMenus(shaped)
    setLoading(false)
  }, [familyId])

  useEffect(() => {
    reload()
    if (!familyId) return
    const channel = supabase
      .channel(`menus-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menus', filter: `family_id=eq.${familyId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_ingredients', filter: `family_id=eq.${familyId}` }, reload)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [familyId, reload])

  const saveMenu = useCallback(async ({ id, name, category, steps, basePeople, ingredients }) => {
    let menuId = id
    if (menuId) {
      const { error } = await supabase
        .from('menus')
        .update({ name, category, steps, base_people: basePeople, updated_at: new Date().toISOString() })
        .eq('id', menuId)
      if (error) throw error
      await supabase.from('menu_ingredients').delete().eq('menu_id', menuId)
    } else {
      const { data, error } = await supabase
        .from('menus')
        .insert({ family_id: familyId, name, category, steps, base_people: basePeople })
        .select('id')
        .single()
      if (error) throw error
      menuId = data.id
    }

    // Resolve/create ingredient master rows for each line, then link them.
    const rows = []
    for (const [index, line] of ingredients.entries()) {
      const ingId = await resolveIngredientId(familyId, line.name, line.unit)
      rows.push({
        family_id: familyId,
        menu_id: menuId,
        ingredient_id: ingId,
        quantity: line.quantity,
        unit: line.unit || '',
        display_text: line.displayText || null,
        sort_order: index,
      })
    }
    if (rows.length) {
      const { error } = await supabase.from('menu_ingredients').insert(rows)
      if (error) throw error
    }
    await reload()
    return menuId
  }, [familyId, reload])

  const deleteMenu = useCallback(async (menuId) => {
    const { error } = await supabase.from('menus').delete().eq('id', menuId)
    if (error) throw error
    await reload()
  }, [reload])

  return { menus, loading, saveMenu, deleteMenu, reload }
}

async function resolveIngredientId(familyId, name, unit) {
  const trimmed = name.trim()
  const { data: existing } = await supabase
    .from('ingredients')
    .select('id')
    .eq('family_id', familyId)
    .eq('name', trimmed)
    .maybeSingle()
  if (existing) return existing.id

  const { data: created, error } = await supabase
    .from('ingredients')
    .insert({ family_id: familyId, name: trimmed, default_unit: unit || '' })
    .select('id')
    .single()
  if (error) throw error
  return created.id
}
