import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const NavContext = createContext(null)

export function NavProvider({ children }) {
  const [stack, setStack] = useState([])

  const push = useCallback((view) => setStack((s) => [...s, view]), [])
  const pop = useCallback(() => setStack((s) => s.slice(0, -1)), [])
  const popToRoot = useCallback(() => setStack([]), [])
  const replace = useCallback((view) => setStack((s) => [...s.slice(0, -1), view]), [])

  const value = useMemo(() => ({ stack, push, pop, popToRoot, replace, top: stack[stack.length - 1] || null }), [stack, push, pop, popToRoot, replace])

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used within NavProvider')
  return ctx
}
