import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export interface Route {
  name: string
  param: string | null
}

interface RouterValue {
  route: Route
  navigate: (path: string) => void
}

const RouterContext = createContext<RouterValue | null>(null)

function readRoute(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [name = '', param = ''] = raw.split('/')
  return { name: name === '' ? 'overview' : name, param: param === '' ? null : param }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(readRoute)

  useEffect(() => {
    const update = () => setRoute(readRoute())
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  const navigate = useCallback((path: string) => {
    window.location.hash = path.startsWith('/') ? path : `/${path}`
  }, [])

  const value = useMemo(() => ({ route, navigate }), [route, navigate])
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

export function useRouter(): RouterValue {
  const value = useContext(RouterContext)
  if (!value) throw new Error('useRouter must be used inside RouterProvider')
  return value
}
