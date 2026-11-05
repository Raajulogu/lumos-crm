// lib/auth-context.tsx
'use client'

import React, { createContext, useContext, useSyncExternalStore, useCallback } from 'react'
import type { UserRole } from '@/lib/types'

export interface UserSession {
  id: string
  fullName: string
  email: string
  role: UserRole
  designation: string
}

export const DEMO_USERS: Record<string, UserSession> = {
  admin: {
    id: 'admin',
    fullName: 'Rajesh Sharma',
    email: 'admin@markcrm.com',
    role: 'admin',
    designation: 'Agency Director & Head',
  },
  'emp-1': {
    id: 'emp-1',
    fullName: 'Priya Sharma',
    email: 'priya@markcrm.com',
    role: 'employee',
    designation: 'Senior SEO & Content Lead',
  },
  'emp-2': {
    id: 'emp-2',
    fullName: 'Arjun Mehta',
    email: 'arjun@markcrm.com',
    role: 'employee',
    designation: 'Performance Ads & Social Lead',
  },
}

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('storage', callback)
  window.addEventListener('crm_user_change', callback)
  return () => {
    window.removeEventListener('storage', callback)
    window.removeEventListener('crm_user_change', callback)
  }
}

function getSnapshot(): string {
  if (typeof window === 'undefined') return 'admin'
  try {
    const stored = localStorage.getItem('crm_active_user')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed?.id && (parsed.id === 'admin' || DEMO_USERS[parsed.id])) {
        return parsed.id
      }
    }
  } catch {}
  return 'admin'
}

function getServerSnapshot(): string {
  return 'admin'
}

interface AuthContextType {
  currentUser: UserSession
  setCurrentUser: (user: UserSession) => void
  loginAs: (userKey: 'admin' | 'emp-1' | 'emp-2') => void
  loginWithCredentials: (email: string) => UserSession | null
  logout: () => void
}

const AuthContext = createContext<AuthContextType>({
  currentUser: DEMO_USERS['admin'],
  setCurrentUser: () => {},
  loginAs: () => {},
  loginWithCredentials: () => null,
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const activeUserId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const currentUser = DEMO_USERS[activeUserId] || DEMO_USERS['admin']

  const setCurrentUser = useCallback((user: UserSession) => {
    try {
      localStorage.setItem('crm_active_user', JSON.stringify(user))
      window.dispatchEvent(new Event('crm_user_change'))
    } catch {}
  }, [])

  const loginAs = useCallback((userKey: 'admin' | 'emp-1' | 'emp-2') => {
    const user = DEMO_USERS[userKey]
    if (user) {
      try {
        localStorage.setItem('crm_active_user', JSON.stringify(user))
        window.dispatchEvent(new Event('crm_user_change'))
      } catch {}
    }
  }, [])

  const loginWithCredentials = useCallback((email: string): UserSession | null => {
    const cleanEmail = email.trim().toLowerCase()
    const found = Object.values(DEMO_USERS).find(
      (u) => u.email.toLowerCase() === cleanEmail,
    )
    if (found) {
      try {
        localStorage.setItem('crm_active_user', JSON.stringify(found))
        window.dispatchEvent(new Event('crm_user_change'))
      } catch {}
      return found
    }
    return null
  }, [])

  const logout = useCallback(() => {
    try {
      localStorage.removeItem('crm_active_user')
      window.dispatchEvent(new Event('crm_user_change'))
    } catch {}
  }, [])

  return (
    <AuthContext.Provider
      value={{ currentUser, setCurrentUser, loginAs, loginWithCredentials, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
