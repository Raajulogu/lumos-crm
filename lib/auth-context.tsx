// lib/auth-context.tsx
'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { UserRole } from '@/lib/types'
import { api, getAuthToken, removeAuthToken, setAuthToken } from '@/lib/api'

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

interface AuthContextType {
  currentUser: UserSession
  isAuthenticated: boolean
  isLoading: boolean
  setCurrentUser: (user: UserSession) => void
  login: (credentials: { email: string; password: string }) => Promise<UserSession>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  currentUser: EMPTY_USER,
  isAuthenticated: false,
  isLoading: true,
  setCurrentUser: () => {},
  login: async () => EMPTY_USER,
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
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

  const setCurrentUser = useCallback((user: UserSession) => {
    setCurrentUserState(user)
    try {
      localStorage.setItem('crm_active_user', JSON.stringify(user))
    } catch {}
  }, [])

  // Verify active session with real backend API on mount
  useEffect(() => {
    let mounted = true
    const token = getAuthToken()

    if (!token) {
      setIsLoading(false)
      return
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
        localStorage.setItem('crm_active_user', JSON.stringify(session))
      })
      .catch(() => {
        // Token invalid or network issue; retain existing cached session if present
      })
      .finally(() => {
        if (mounted) setIsLoading(false)
      })

    // Listen for 401 unauthorized events from API client
    const handleUnauthorized = () => {
      removeAuthToken()
      setIsAuthenticated(false)
    }

    window.addEventListener('crm_auth_unauthorized', handleUnauthorized)
    return () => {
      mounted = false
      window.removeEventListener('crm_auth_unauthorized', handleUnauthorized)
    }
  }, [])

  // Real backend login
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
        setCurrentUserState(session)
        setIsAuthenticated(true)
        localStorage.setItem('crm_active_user', JSON.stringify(session))
        return session
      } finally {
        setIsLoading(false)
      }
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await api.auth.logout()
    } catch {}
    removeAuthToken()
    setIsAuthenticated(false)
    try {
      localStorage.removeItem('crm_active_user')
    } catch {}
  }, [])

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        isLoading,
        setCurrentUser,
        login,
        logout,
      }}
    >
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
