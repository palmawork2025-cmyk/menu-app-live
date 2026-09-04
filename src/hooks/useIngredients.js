import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/** Ingredient master list (used by the 常備品 / staples screen and pickers). */
export function useIngredients(familyId) {
  const [ingredients, setIngredients] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!familyId) return
    const { data, error } = await supabase
      .from('ingredients')
      .select('id, name, default_unit, is_staple')
      .eq('family_id', familyId)
      .order('name')
    if (error) {
      console.error(error)
    } else {
      setIngredients(data)
    }
    setLoading(false)
  }, [familyId])

  useEffect(() => {
    reload()
    if (!familyId) return
    const channel = supabase
      .channel(`ingredients-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients', filter: `family_id=eq.${familyId}` }, reload)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [familyId, reload])

  const addIngredient = useCallback(async (name, unit, isStaple = false) => {
    const { error } = await supabase
      .from('ingredients')
      .upsert({ family_id: familyId, name: name.trim(), default_unit: unit || '', is_staple: isStaple }, { onConflict: 'family_id,name' })
    if (error) throw error
    await reload()
  }, [familyId, reload])

  const updateIngredient = useCallback(async (id, patch) => {
    const { error } = await supabase
      .from('ingredients')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    await reload()
  }, [reload])

  const deleteIngredient = useCallback(async (id) => {
    const { error } = await supabase.from('ingredients').delete().eq('id', id)
    if (error) throw error
    await reload()
  }, [reload])

  const toggleStaple = useCallback(async (id, isStaple) => {
    await updateIngredient(id, { is_staple: isStaple })
  }, [updateIngredient])

  return { ingredients, loading, addIngredient, updateIngredient, deleteIngredient, toggleStaple }
}
