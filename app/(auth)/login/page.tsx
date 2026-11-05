'use client'

// app/(auth)/login/page.tsx
// Redesigned modern, agency-grade login screen with 1-click persona switching
// for Rajesh Sharma (Admin Head), Priya Sharma (Employee 1), and Arjun Mehta (Employee 2).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  ArrowRight,
  Sparkles,
  Target,
  Megaphone,
} from 'lucide-react'
import { Input, Button, Card } from '@/components/ui'
import { APP_NAME, APP_TAGLINE } from '@/lib/constants'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const router = useRouter()
  const { loginAs, loginWithCredentials } = useAuth()

  const [email, setEmail] = useState('admin@markcrm.com')
  const [password, setPassword] = useState('admin123')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingRole, setLoadingRole] = useState<string | null>(null)
  const [error, setError] = useState('')

  // 1-Click Quick Demo Sign In
  function handleQuickLogin(userKey: 'admin' | 'emp-1' | 'emp-2') {
    setError('')
    setLoadingRole(userKey)

    // Call loginAs in context & localStorage
    loginAs(userKey)

    setTimeout(() => {
      if (userKey === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/employee/dashboard')
      }
    }, 400)
  }

  // Standard Form Submission
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please provide both your email address and password.')
      return
    }

    setIsLoading(true)

    setTimeout(() => {
      setIsLoading(false)
      const user = loginWithCredentials(email)

      if (user) {
        if (user.role === 'admin') {
          router.push('/admin/dashboard')
        } else {
          router.push('/employee/dashboard')
        }
      } else {
        // Fallback demo matching
        const clean = email.trim().toLowerCase()
        if (clean.includes('admin')) {
          loginAs('admin')
          router.push('/admin/dashboard')
        } else if (clean.includes('arjun')) {
          loginAs('emp-2')
          router.push('/employee/dashboard')
        } else {
          loginAs('emp-1')
          router.push('/employee/dashboard')
        }
      }
    }, 500)
  }

  return (
    <div className="w-full max-w-xl mx-auto py-6 px-4">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-xs font-semibold mb-3">
          <Sparkles className="h-3.5 w-3.5 text-brand-600" />
          <span>Marketing Agency Operations OS</span>
        </div>
        <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
          {APP_NAME}
        </h1>
        <p className="text-sm text-text-muted mt-1 max-w-sm mx-auto">
          {APP_TAGLINE} — Manage client onboarding, automated deadline alerts, and team doubts.
        </p>
      </div>

      {/* 1-Click Instant Demo Persona Cards */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-primary">
              ⚡ Instant 1-Click Demo Sign In
            </h2>
            <p className="text-[11px] text-text-muted">
              Select any account below to explore without typing credentials:
            </p>
          </div>
          <span className="text-[10px] font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
            3 Ready Personas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Persona 1: Admin Head (Rajesh) */}
          <button
            type="button"
            onClick={() => handleQuickLogin('admin')}
            disabled={loadingRole !== null}
            className="group relative p-3.5 rounded-xl border border-blue-200 bg-gradient-to-b from-blue-50/70 to-white hover:border-blue-500 hover:shadow-md text-left transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                  <Shield className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Head / Admin
                </span>
              </div>
              <h3 className="text-sm font-bold text-text-primary group-hover:text-blue-700 transition-colors">
                Rajesh Sharma
              </h3>
              <p className="text-[11px] text-text-muted mt-0.5 font-mono">
                admin@markcrm.com
              </p>
              <p className="text-[11px] text-text-secondary mt-2 line-clamp-2 leading-relaxed">
                All 8 projects, client financials, team capacity, and automated reminder dispatch.
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-blue-100 flex items-center justify-between text-xs font-semibold text-blue-700">
              <span>{loadingRole === 'admin' ? 'Signing in...' : 'Sign In as Head'}</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Persona 2: Employee 1 (Priya Sharma - SEO Lead) */}
          <button
            type="button"
            onClick={() => handleQuickLogin('emp-1')}
            disabled={loadingRole !== null}
            className="group relative p-3.5 rounded-xl border border-emerald-200 bg-gradient-to-b from-emerald-50/70 to-white hover:border-emerald-500 hover:shadow-md text-left transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <Target className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Employee 1
                </span>
              </div>
              <h3 className="text-sm font-bold text-text-primary group-hover:text-emerald-700 transition-colors">
                Priya Sharma
              </h3>
              <p className="text-[11px] text-text-muted mt-0.5 font-mono">
                priya@markcrm.com
              </p>
              <p className="text-[11px] text-text-secondary mt-2 line-clamp-2 leading-relaxed">
                SEO & Content Lead. 4 assigned projects, raised doubts, task followups. (Privacy protected)
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-emerald-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
              <span>{loadingRole === 'emp-1' ? 'Signing in...' : 'Sign In as Priya'}</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>

          {/* Persona 3: Employee 2 (Arjun Mehta - Performance Ads Lead) */}
          <button
            type="button"
            onClick={() => handleQuickLogin('emp-2')}
            disabled={loadingRole !== null}
            className="group relative p-3.5 rounded-xl border border-purple-200 bg-gradient-to-b from-purple-50/70 to-white hover:border-purple-500 hover:shadow-md text-left transition-all cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                  <Megaphone className="h-4 w-4" />
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  Employee 2
                </span>
              </div>
              <h3 className="text-sm font-bold text-text-primary group-hover:text-purple-700 transition-colors">
                Arjun Mehta
              </h3>
              <p className="text-[11px] text-text-muted mt-0.5 font-mono">
                arjun@markcrm.com
              </p>
              <p className="text-[11px] text-text-secondary mt-2 line-clamp-2 leading-relaxed">
                Ads & Social Lead. Paid Meta campaigns, influencer doubts, follow-ups. (Privacy protected)
              </p>
            </div>

            <div className="mt-3 pt-2.5 border-t border-purple-100 flex items-center justify-between text-xs font-semibold text-purple-700">
              <span>{loadingRole === 'emp-2' ? 'Signing in...' : 'Sign In as Arjun'}</span>
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>
      </div>

      {/* Manual Login Card */}
      <Card padding="lg" className="border-border shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-text-primary">
            Or Sign In with Credentials
          </h2>
          <span className="text-xs text-text-muted">Demo password: any 6+ chars</span>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Work Email Address"
            type="email"
            placeholder="admin@markcrm.com, priya@markcrm.com, arjun@markcrm.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="h-4 w-4 text-text-muted" />}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter password (e.g. admin123)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="h-4 w-4 text-text-muted" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-text-muted hover:text-text-secondary p-1 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            }
            required
            autoComplete="current-password"
          />

          {error && (
            <p className="text-xs font-medium text-danger bg-danger-light p-2.5 rounded-lg border border-danger/20" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-between text-xs -mt-1">
            <span className="text-text-muted">
              Auto-detects role based on email.
            </span>
            <Link
              href="/forgot-password"
              className="text-brand-600 hover:text-brand-700 font-medium hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-1 font-semibold"
          >
            Sign In to Portal
          </Button>
        </form>

        {/* Quick Credentials Info Box */}
        <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-text-secondary">
          <p className="font-semibold text-text-primary text-[11px] uppercase tracking-wider mb-1.5">
            🔑 Pre-configured Accounts
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div>
              <span className="font-bold text-text-primary">Admin:</span>{' '}
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@markcrm.com')
                  setPassword('admin123')
                }}
                className="text-brand-600 hover:underline font-mono"
              >
                admin@markcrm.com
              </button>
            </div>
            <div>
              <span className="font-bold text-text-primary">Emp 1:</span>{' '}
              <button
                type="button"
                onClick={() => {
                  setEmail('priya@markcrm.com')
                  setPassword('priya123')
                }}
                className="text-brand-600 hover:underline font-mono"
              >
                priya@markcrm.com
              </button>
            </div>
            <div>
              <span className="font-bold text-text-primary">Emp 2:</span>{' '}
              <button
                type="button"
                onClick={() => {
                  setEmail('arjun@markcrm.com')
                  setPassword('arjun123')
                }}
                className="text-brand-600 hover:underline font-mono"
              >
                arjun@markcrm.com
              </button>
            </div>
          </div>
        </div>
      </Card>

      <p className="text-center text-xs text-text-muted mt-6">
        Need employee account provisioning?{' '}
        <span className="text-text-secondary font-medium">
          Admin Head can invite staff from the Employees tab.
        </span>
      </p>
    </div>
  )
}
