import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/** Meal plan entries (date -> menus) for a family, within [startISO, endISO] inclusive. */
export function useMealPlan(familyId, startISO, endISO) {
  const [entries, setEntries] = useState([]) // [{id, plan_date, menu_id, menu:{id,name,category}}]
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!familyId || !startISO || !endISO) return
    const { data, error } = await supabase
      .from('meal_plan_entries')
      .select('id, plan_date, menu_id, sort_order, menus(id, name, category)')
      .eq('family_id', familyId)
      .gte('plan_date', startISO)
      .lte('plan_date', endISO)
      .order('sort_order')
      .order('created_at')
    if (error) {
      console.error(error)
    } else {
      setEntries(data)
    }
    setLoading(false)
  }, [familyId, startISO, endISO])

  useEffect(() => {
    reload()
    if (!familyId) return
    const channel = supabase
      .channel(`plan-${familyId}-${startISO}-${endISO}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_plan_entries', filter: `family_id=eq.${familyId}` }, reload)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [familyId, startISO, endISO, reload])

  const addMenuToDate = useCallback(async (date, menuId) => {
    const sortOrder = entries.filter((e) => e.plan_date === date).length
    const { error } = await supabase
      .from('meal_plan_entries')
      .insert({ family_id: familyId, plan_date: date, menu_id: menuId, sort_order: sortOrder })
    if (error) throw error
    await reload()
  }, [familyId, entries, reload])

  const removeEntry = useCallback(async (entryId) => {
    const { error } = await supabase.from('meal_plan_entries').delete().eq('id', entryId)
    if (error) throw error
    await reload()
  }, [reload])

  /**
   * ドラッグでの並び替え・別の日への移動を保存する。
   * updates: [{ id, plan_date, sort_order }] — 変わったものだけ
   */
  const moveEntries = useCallback(async (updates) => {
    if (!updates.length) return
    const byId = new Map(updates.map((u) => [u.id, u]))
    setEntries((prev) => prev.map((e) => (byId.has(e.id) ? { ...e, ...byId.get(e.id) } : e)))
    const results = await Promise.all(
      updates.map((u) =>
        supabase.from('meal_plan_entries').update({ plan_date: u.plan_date, sort_order: u.sort_order }).eq('id', u.id)
      )
    )
    const firstError = results.find((r) => r.error)?.error
    await reload()
    if (firstError) throw firstError
  }, [reload])

  const entriesByDate = {}
  for (const e of entries) {
    if (!entriesByDate[e.plan_date]) entriesByDate[e.plan_date] = []
    entriesByDate[e.plan_date].push(e)
  }

  return { entries, entriesByDate, loading, addMenuToDate, removeEntry, moveEntries, reload }
}
