import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from './supabaseClient'
import { seedInitialMenus } from './seedFamilyData'
import { joinCategoryOrder, normalizeGrocery, splitCategoryOrder } from './familySettings'

const FamilyContext = createContext(null)

const LOCAL_FAMILY_KEY = 'menu-app:family_id'
const LOCAL_NAME_KEY = 'menu-app:display_name'

export function FamilyProvider({ children }) {
  const [status, setStatus] = useState('loading') // loading | needs-family | ready | error
  const [error, setError] = useState(null)
  const [userId, setUserId] = useState(null)
  const [family, setFamily] = useState(null) // { id, name, join_code, people_count }
  const [displayName, setDisplayName] = useState(() => localStorage.getItem(LOCAL_NAME_KEY) || '')

  const loadFamily = useCallback(async (familyId) => {
    let { data, error: err } = await supabase
      .from('families')
      .select('id, name, join_code, people_count, category_order')
      .eq('id', familyId)
      .maybeSingle()
    if (err?.message?.includes('category_order')) {
      // category_order column not migrated in yet on this Supabase project --
      // fall back so older setups keep working until the migration is run.
      ;({ data, error: err } = await supabase
        .from('families')
        .select('id, name, join_code, people_count')
        .eq('id', familyId)
        .maybeSingle())
      if (data) data.category_order = []
    }
    if (err || !data) {
      localStorage.removeItem(LOCAL_FAMILY_KEY)
      setFamily(null)
      setStatus('needs-family')
      return
    }
    const { categoryOrder, grocery } = splitCategoryOrder(data.category_order)
    setFamily({ ...data, category_order: categoryOrder, grocery })
    setStatus('ready')
  }, [])

  // Keep family-level settings (people count, category order, 売り場 settings)
  // in sync across the family's phones.
  const familyId = family?.id
  useEffect(() => {
    if (!familyId) return
    const channel = supabase
      .channel(`family-${familyId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'families', filter: `id=eq.${familyId}` }, (payload) => {
        const row = payload.new || {}
        setFamily((f) => {
          if (!f) return f
          const next = { ...f }
          if (row.name !== undefined) next.name = row.name
          if (row.people_count !== undefined) next.people_count = row.people_count
          if (row.category_order !== undefined) {
            const { categoryOrder, grocery } = splitCategoryOrder(row.category_order)
            next.category_order = categoryOrder
            next.grocery = grocery
          }
          return next
        })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [familyId])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus('error')
      setError('SUPABASE_NOT_CONFIGURED')
      return
    }

    let cancelled = false

    async function init() {
      const { data: sessionData } = await supabase.auth.getSession()
      let uid = sessionData?.session?.user?.id

      if (!uid) {
        const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously()
        if (signInError) {
          if (!cancelled) {
            setStatus('error')
            setError(signInError.message)
          }
          return
        }
        uid = signInData?.user?.id
      }

      if (cancelled) return
      setUserId(uid)

      const cachedFamilyId = localStorage.getItem(LOCAL_FAMILY_KEY)
      if (cachedFamilyId) {
        await loadFamily(cachedFamilyId)
      } else {
        setStatus('needs-family')
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [loadFamily])

  const createFamily = useCallback(async (name, name2) => {
    const cleanDisplayName = name2?.trim() || '家族'
    const { data, error: err } = await supabase.rpc('create_family', {
      p_name: name.trim(),
      p_display_name: cleanDisplayName,
    })
    if (err) throw err
    const row = Array.isArray(data) ? data[0] : data
    localStorage.setItem(LOCAL_FAMILY_KEY, row.family_id)
    localStorage.setItem(LOCAL_NAME_KEY, cleanDisplayName)
    setDisplayName(cleanDisplayName)
    await loadFamily(row.family_id)
    try {
      await seedInitialMenus(row.family_id)
    } catch (seedError) {
      // Non-fatal: the family still works, just without starter menus.
      // The user can add menus manually if this fails.
      console.error('Failed to seed starter menus', seedError)
    }
    return row
  }, [loadFamily])

  const joinFamily = useCallback(async (code, name2) => {
    const cleanDisplayName = name2?.trim() || '家族'
    const { data, error: err } = await supabase.rpc('join_family', {
      p_join_code: code.trim(),
      p_display_name: cleanDisplayName,
    })
    if (err) throw err
    const row = Array.isArray(data) ? data[0] : data
    localStorage.setItem(LOCAL_FAMILY_KEY, row.family_id)
    localStorage.setItem(LOCAL_NAME_KEY, cleanDisplayName)
    setDisplayName(cleanDisplayName)
    await loadFamily(row.family_id)
    return row
  }, [loadFamily])

  const leaveFamily = useCallback(() => {
    localStorage.removeItem(LOCAL_FAMILY_KEY)
    setFamily(null)
    setStatus('needs-family')
  }, [])

  const updatePeopleCount = useCallback(async (count) => {
    if (!family) return
    setFamily((f) => (f ? { ...f, people_count: count } : f))
    const { error: err } = await supabase
      .from('families')
      .update({ people_count: count })
      .eq('id', family.id)
    if (err) throw err
  }, [family])

  const updateFamilyName = useCallback(async (name) => {
    if (!family) return
    const trimmed = name.trim()
    if (!trimmed) return
    setFamily((f) => (f ? { ...f, name: trimmed } : f))
    const { error: err } = await supabase
      .from('families')
      .update({ name: trimmed })
      .eq('id', family.id)
    if (err) throw err
  }, [family])

  const updateCategoryOrder = useCallback(async (order) => {
    if (!family) return
    setFamily((f) => (f ? { ...f, category_order: order } : f))
    const { error: err } = await supabase
      .from('families')
      .update({ category_order: joinCategoryOrder(order, family.grocery || normalizeGrocery()) })
      .eq('id', family.id)
    if (err) throw err
  }, [family])

  /**
   * Update the shared 売り場 settings. Reads the latest value first so two
   * phones editing at about the same time don't wipe each other's changes.
   * `mutate(grocery) => nextGrocery`
   */
  const updateGrocery = useCallback(async (mutate) => {
    if (!family) return
    const { data, error: readErr } = await supabase
      .from('families')
      .select('category_order')
      .eq('id', family.id)
      .maybeSingle()
    if (readErr) throw readErr
    const latest = splitCategoryOrder(data?.category_order)
    const nextGrocery = normalizeGrocery(mutate(latest.grocery))
    setFamily((f) => (f ? { ...f, category_order: latest.categoryOrder, grocery: nextGrocery } : f))
    const { error: err } = await supabase
      .from('families')
      .update({ category_order: joinCategoryOrder(latest.categoryOrder, nextGrocery) })
      .eq('id', family.id)
    if (err) throw err
  }, [family])

  const value = useMemo(() => ({
    status,
    error,
    userId,
    family,
    displayName,
    createFamily,
    joinFamily,
    leaveFamily,
    updatePeopleCount,
    updateFamilyName,
    updateCategoryOrder,
    updateGrocery,
  }), [status, error, userId, family, displayName, createFamily, joinFamily, leaveFamily, updatePeopleCount, updateFamilyName, updateCategoryOrder, updateGrocery])

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>
}

export function useFamily() {
  const ctx = useContext(FamilyContext)
  if (!ctx) throw new Error('useFamily must be used within FamilyProvider')
  return ctx
}
