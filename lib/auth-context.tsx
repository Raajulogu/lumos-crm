// lib/auth-context.tsx
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { UserRole } from '@/lib/types'
import { api, getAuthToken, removeAuthToken } from '@/lib/api'

export interface UserSession {
  id: string
  fullName: string
  email: string
  role: UserRole
  designation: string
  mustChangePassword?: boolean
}

export const EMPTY_USER: UserSession = {
  id: '',
  fullName: '',
  email: '',
  role: 'employee',
  designation: '',
}

// 20-hour session limit (in milliseconds)
export const SESSION_MAX_DURATION_MS = 20 * 60 * 60 * 1000
const SESSION_EXPIRES_KEY = 'crm_session_expires_at'

function decodeJwtExpiryMs(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const payload = JSON.parse(atob(padded))
    if (typeof payload.exp === 'number' && payload.exp > 0) {
      return payload.exp * 1000
    }
  } catch {}
  return null
}

function resolveSessionExpiryMs(token: string): number {
  const jwtExp = decodeJwtExpiryMs(token)
  const fallbackExp = Date.now() + SESSION_MAX_DURATION_MS
  if (typeof window === 'undefined') return jwtExp || fallbackExp

  const storedRaw = localStorage.getItem(SESSION_EXPIRES_KEY)
  const storedExp = storedRaw ? Number(storedRaw) : NaN

  // Cap effective expiry at both JWT exp (if present) and 20h from login
  if (!isNaN(storedExp) && storedExp > 0) {
    return jwtExp ? Math.min(jwtExp, storedExp) : storedExp
  }

  const targetExp = jwtExp ? Math.min(jwtExp, fallbackExp) : fallbackExp
  try {
    localStorage.setItem(SESSION_EXPIRES_KEY, String(targetExp))
  } catch {}
  return targetExp
}

interface AuthContextType {
  currentUser: UserSession
  isAuthenticated: boolean
  isLoading: boolean
  sessionExpiresAt: number | null
  setCurrentUser: (user: UserSession) => void
  login: (credentials: { email: string; password: string }) => Promise<UserSession>
  logout: (reason?: 'manual' | 'session_expired' | 'unauthorized') => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  currentUser: EMPTY_USER,
  isAuthenticated: false,
  isLoading: true,
  sessionExpiresAt: null,
  setCurrentUser: () => {},
  login: async () => EMPTY_USER,
  logout: async () => {},
})

function AuthRouteGuard({
  isLoading,
  isAuthenticated,
}: {
  isLoading: boolean
  isAuthenticated: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated && (pathname?.startsWith('/admin') || pathname?.startsWith('/employee'))) {
      router.replace('/login')
    }
  }, [isLoading, isAuthenticated, pathname, router])

  return null
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isLoggingOutRef = useRef(false)

  const [currentUser, setCurrentUserState] = useState<UserSession>(() => {
    if (typeof window === 'undefined') return EMPTY_USER
    try {
      const stored = localStorage.getItem('crm_active_user')
      if (stored) {
        return JSON.parse(stored)
      }
    } catch {}
    return EMPTY_USER
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return !!getAuthToken()
  })
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const token = getAuthToken()
    if (!token) return null
    return resolveSessionExpiryMs(token)
  })

  const setCurrentUser = useCallback((user: UserSession) => {
    setCurrentUserState(user)
    try {
      localStorage.setItem('crm_active_user', JSON.stringify(user))
    } catch {}
  }, [])

  const clearClientSession = useCallback(() => {
    removeAuthToken()
    setIsAuthenticated(false)
    setCurrentUserState(EMPTY_USER)
    setSessionExpiresAt(null)
    try {
      localStorage.removeItem('crm_active_user')
      localStorage.removeItem(SESSION_EXPIRES_KEY)
    } catch {}
  }, [])

  const logout = useCallback(
    async (reason: 'manual' | 'session_expired' | 'unauthorized' = 'manual') => {
      if (isLoggingOutRef.current) return
      isLoggingOutRef.current = true
      try {
        if (reason === 'manual') {
          await api.auth.logout().catch(() => {})
        }
      } finally {
        clearClientSession()
        isLoggingOutRef.current = false
        if (reason === 'session_expired') {
          router.replace('/login?reason=session_expired')
        } else if (reason === 'unauthorized') {
          router.replace('/login?reason=unauthorized')
        }
      }
    },
    [clearClientSession, router],
  )

  // Verify active session & token expiry on mount
  useEffect(() => {
    let mounted = true
    const token = getAuthToken()

    if (!token) {
      const t = setTimeout(() => {
        if (!mounted) return
        setIsAuthenticated(false)
        setIsLoading(false)
      }, 0)
      return () => {
        mounted = false
        clearTimeout(t)
      }
    }

    const expMs = resolveSessionExpiryMs(token)
    if (Date.now() >= expMs) {
      const t = setTimeout(() => {
        if (!mounted) return
        setIsLoading(false)
        logout('session_expired')
      }, 0)
      return () => {
        mounted = false
        clearTimeout(t)
      }
    }

    api.auth
      .getMe()
      .then((user) => {
        if (!mounted) return
        const session: UserSession = {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          designation: user.designation,
          mustChangePassword: user.mustChangePassword,
        }
        setCurrentUserState(session)
        setIsAuthenticated(true)
        setSessionExpiresAt(expMs)
        localStorage.setItem('crm_active_user', JSON.stringify(session))
      })
      .catch(() => {
        // Token invalid or network issue; 401 listener handles invalid tokens
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    const handleUnauthorized = () => {
      logout('unauthorized')
    }

    window.addEventListener('crm_auth_unauthorized', handleUnauthorized)
    return () => {
      mounted = false
      window.removeEventListener('crm_auth_unauthorized', handleUnauthorized)
    }
  }, [logout])

  // Token expiry watcher: enforces 20-hour auto-logout across timers & tab resume
  useEffect(() => {
    if (!isAuthenticated || !sessionExpiresAt) return

    const checkExpiry = () => {
      const token = getAuthToken()
      if (!token) return
      const expMs = resolveSessionExpiryMs(token)
      if (Date.now() >= expMs) {
        logout('session_expired')
      }
    }

    // Periodic check every 30s (handles computer sleep / clock skew reliably)
    const interval = setInterval(checkExpiry, 30_000)

    // Immediate check when user returns to browser tab
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkExpiry()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    // Exact timer if remaining duration fits safely inside 32-bit setTimeout
    const remainingMs = Math.max(0, sessionExpiresAt - Date.now())
    const timeout =
      remainingMs <= 2_147_483_647 ? setTimeout(checkExpiry, remainingMs + 500) : null

    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      if (timeout) clearTimeout(timeout)
    }
  }, [isAuthenticated, sessionExpiresAt, logout])

  // Real backend login (sets 20-hour token expiry window)
  const login = useCallback(
    async (credentials: { email: string; password: string }): Promise<UserSession> => {
      setIsLoading(true)
      try {
        const result = await api.auth.login(credentials)
        const session: UserSession = {
          id: result.user.id,
          fullName: result.user.fullName,
          email: result.user.email,
          role: result.user.role,
          designation: result.user.designation,
          mustChangePassword: result.user.mustChangePassword,
        }
        const nowExp = Date.now() + SESSION_MAX_DURATION_MS
        const jwtExp = result.token ? decodeJwtExpiryMs(result.token) : null
        const effectiveExp = jwtExp ? Math.min(jwtExp, nowExp) : nowExp

        try {
          localStorage.setItem(SESSION_EXPIRES_KEY, String(effectiveExp))
          localStorage.setItem('crm_active_user', JSON.stringify(session))
        } catch {}

        setSessionExpiresAt(effectiveExp)
        setCurrentUserState(session)
        setIsAuthenticated(true)
        return session
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        sessionExpiresAt,
        setCurrentUser,
        login,
        logout,
      }}
    >
      <Suspense fallback={null}>
        <AuthRouteGuard isLoading={isLoading} isAuthenticated={isAuthenticated} />
      </Suspense>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
