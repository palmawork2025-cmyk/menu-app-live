import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useShoppingList(familyId) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!familyId) return
    const { data, error } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at')
    if (error) {
      console.error(error)
    } else {
      setItems(data)
    }
    setLoading(false)
  }, [familyId])

  useEffect(() => {
    reload()
    if (!familyId) return
    const channel = supabase
      .channel(`shopping-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shopping_list_items', filter: `family_id=eq.${familyId}` }, reload)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [familyId, reload])

  const toggleChecked = useCallback(async (id, isChecked) => {
    const { error } = await supabase
      .from('shopping_list_items')
      .update({ is_checked: isChecked, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    await reload()
  }, [reload])

  const deleteItem = useCallback(async (id) => {
    const { error } = await supabase.from('shopping_list_items').delete().eq('id', id)
    if (error) throw error
    await reload()
  }, [reload])

  const deleteItems = useCallback(async (ids) => {
    if (!ids.length) return
    const { error } = await supabase.from('shopping_list_items').delete().in('id', ids)
    if (error) throw error
    await reload()
  }, [reload])

  const clearChecked = useCallback(async () => {
    const { error } = await supabase
      .from('shopping_list_items')
      .delete()
      .eq('family_id', familyId)
      .eq('is_checked', true)
    if (error) throw error
    await reload()
  }, [familyId, reload])

  const addManualItem = useCallback(async ({ name, unit = '', quantity = null, displayText = null, source = 'manual', addedBy = null }) => {
    const { error } = await supabase.from('shopping_list_items').insert({
      family_id: familyId, name: name.trim(), unit, quantity, display_text: displayText, source, added_by: addedBy,
    })
    if (error) throw error
    await reload()
  }, [familyId, reload])

  /**
   * Add aggregated ingredient lines from one or more menus, merging into any
   * existing (unchecked) shopping-list line for the same name+unit.
   */
  const addFromMenuLines = useCallback(async (lines, addedBy = null) => {
    const { data: existing, error: fetchErr } = await supabase
      .from('shopping_list_items')
      .select('*')
      .eq('family_id', familyId)
      .eq('is_checked', false)
    if (fetchErr) throw fetchErr

    const toInsert = []
    const toUpdate = []

    for (const line of lines) {
      const numeric = typeof line.quantity === 'number'
      const match = existing.find((row) => row.name === line.name && (numeric ? row.unit === line.unit : true))
      if (match) {
        const mergedNames = Array.from(new Set([...(match.source_menu_names || []), ...(line.menuNames || [])]))
        if (numeric && typeof match.quantity === 'number') {
          toUpdate.push({ id: match.id, quantity: match.quantity + line.quantity, source_menu_names: mergedNames })
        } else {
          toUpdate.push({ id: match.id, source_menu_names: mergedNames })
        }
      } else {
        toInsert.push({
          family_id: familyId,
          name: line.name,
          unit: numeric ? (line.unit || '') : '',
          quantity: numeric ? line.quantity : null,
          display_text: numeric ? null : (line.displayText || null),
          source: 'menu',
          source_menu_names: line.menuNames || [],
          added_by: addedBy,
        })
      }
    }

    for (const upd of toUpdate) {
      const { id, ...patch } = upd
      const { error } = await supabase.from('shopping_list_items').update(patch).eq('id', id)
      if (error) throw error
    }
    if (toInsert.length) {
      const { error } = await supabase.from('shopping_list_items').insert(toInsert)
      if (error) throw error
    }
    await reload()
  }, [familyId, reload])

  return { items, loading, toggleChecked, deleteItem, deleteItems, clearChecked, addManualItem, addFromMenuLines, reload }
}
