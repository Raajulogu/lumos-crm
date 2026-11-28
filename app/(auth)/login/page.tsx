'use client'

// app/(auth)/login/page.tsx
// Production agency login screen connected to live backend API.

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Clock } from 'lucide-react'
import { Input, Button, Card, PageLoader } from '@/components/ui'
import { APP_NAME, APP_TAGLINE } from '@/lib/constants'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const cleanEmail = email.trim()
    if (!cleanEmail || !password) {
      setError('Please provide both your email address and password.')
      return
    }

    setIsLoading(true)

    try {
      const user = await login({ email: cleanEmail, password })
      if (user.role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/employee/dashboard')
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Invalid email or password. Please try again.'
      setError(errMsg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto py-10 px-4">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-3">
          <ShieldCheck className="h-3.5 w-3.5 text-brand-600" />
          <span>Agency Workspace Access</span>
        </div>
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
          {APP_NAME}
        </h1>
        <p className="text-sm text-text-muted mt-1.5 max-w-sm mx-auto">
          {APP_TAGLINE}
        </p>
      </div>

      {/* Session Expiry Notice */}
      {(reason === 'session_expired' || reason === 'unauthorized') && (
        <div
          className="mb-4 p-3.5 rounded-xl bg-warning-light border border-warning/40 text-warning-dark text-xs flex items-start gap-2.5"
          role="status"
        >
          <Clock className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              {reason === 'session_expired'
                ? 'Session Expired (20-Hour Security Limit)'
                : 'Session Timed Out'}
            </p>
            <p className="mt-0.5 opacity-90">
              {reason === 'session_expired'
                ? 'Your account was automatically signed out after 20 hours. Please sign in again to continue.'
                : 'Your authentication token is no longer active. Please sign in again.'}
            </p>
          </div>
        </div>
      )}

      {/* Login Card */}
      <Card padding="lg" className="border-border shadow-sm bg-white">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-text-primary">
            Sign In to your Account
          </h2>
          <p className="text-xs text-text-muted mt-1">
            Enter your work email and password to access your dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Work Email Address"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="h-4 w-4 text-text-muted" />}
            required
            autoComplete="email"
            autoFocus
          />

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-text-primary">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full h-10 rounded-lg border border-border bg-white pl-10 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                <Lock className="h-4 w-4" />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-secondary cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <p
              className="text-xs font-medium text-danger bg-danger-light p-3 rounded-lg border border-danger/20"
              role="alert"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2 font-semibold"
          >
            Sign In
          </Button>
        </form>
      </Card>

      <p className="text-center text-xs text-text-muted mt-6">
        Need employee account provisioning? Contact your agency administrator.
      </p>
    </div>
  )
}
