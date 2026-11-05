'use client'

// hooks/useMediaQuery.ts
import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  const subscribe = (callback: () => void) => {
    const media = window.matchMedia(query)
    media.addEventListener('change', callback)
    return () => media.removeEventListener('change', callback)
  }

  const getSnapshot = () => {
    return window.matchMedia(query).matches
  }

  const getServerSnapshot = () => false

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useIsMobile(): boolean {
  return !useMediaQuery('(min-width: 768px)')
}

export function useIsTablet(): boolean {
  const isMinTablet = useMediaQuery('(min-width: 768px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  return isMinTablet && !isDesktop
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)')
}
