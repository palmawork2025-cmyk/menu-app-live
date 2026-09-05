import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/** How many times each menu has ever been placed on the weekly plan (all-time). */
export function useMenuUsageCounts(familyId) {
  const [counts, setCounts] = useState({}) // { [menu_id]: number }
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!familyId) return
    const { data, error } = await supabase
      .from('meal_plan_entries')
      .select('menu_id')
      .eq('family_id', familyId)
    if (error) {
      console.error(error)
      setLoading(false)
      return
    }
    const next = {}
    for (const row of data) {
      next[row.menu_id] = (next[row.menu_id] || 0) + 1
    }
    setCounts(next)
    setLoading(false)
  }, [familyId])

  useEffect(() => {
    reload()
    if (!familyId) return
    const channel = supabase
      .channel(`menu-usage-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_plan_entries', filter: `family_id=eq.${familyId}` }, reload)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [familyId, reload])

  return { counts, loading }
}
