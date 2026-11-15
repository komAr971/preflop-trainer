import { useEffect, useState } from 'react'

export type Route =
  | { page: 'train' }
  | { page: 'charts' }
  | { page: 'edit'; chartId: number }
  | { page: 'stats' }
  | { page: 'settings' }
  | { page: 'draw' }

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/')
  if (parts[0] === 'charts' && parts[1] !== undefined && /^\d+$/.test(parts[1])) {
    return { page: 'edit', chartId: Number(parts[1]) }
  }
  if (parts[0] === 'charts') return { page: 'charts' }
  if (parts[0] === 'stats') return { page: 'stats' }
  if (parts[0] === 'settings') return { page: 'settings' }
  if (parts[0] === 'draw') return { page: 'draw' }
  return { page: 'train' }
}

export function hrefFor(route: Route): string {
  if (route.page === 'charts') return '#/charts'
  if (route.page === 'edit') return `#/charts/${route.chartId}`
  if (route.page === 'stats') return '#/stats'
  if (route.page === 'settings') return '#/settings'
  if (route.page === 'draw') return '#/draw'
  return '#/'
}

export function navigate(route: Route): void {
  window.location.hash = hrefFor(route)
}

/** Hash routing works on GitHub Pages without server rewrites. */
export function useHashRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
