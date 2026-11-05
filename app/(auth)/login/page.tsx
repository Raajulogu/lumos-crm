'use client'

// app/(auth)/login/page.tsx
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { Input, Button, Card } from '@/components/ui'
import { APP_NAME, APP_TAGLINE } from '@/lib/constants'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('Please enter your email and password.')
      return
    }

    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      if (email === 'admin@markcrm.com') {
        router.push('/admin/dashboard')
      } else {
        router.push('/employee/dashboard')
      }
    }, 600)
  }

  return (
    <div className="w-full max-w-sm">
      {/* Brand */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{APP_NAME}</h1>
        <p className="text-sm text-text-muted mt-1">{APP_TAGLINE}</p>
      </div>

      <Card padding="lg">
        <h2 className="text-lg font-semibold text-text-primary mb-6">
          Sign in to your account
        </h2>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <Input
            label="Email address"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="h-4 w-4" />}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="h-4 w-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-text-muted hover:text-text-secondary"
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
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end -mt-1">
            <Link
              href="/forgot-password"
              className="text-xs text-brand-600 hover:text-brand-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-1"
          >
            Sign In
          </Button>
        </form>

        {/* Quick 1-Click Role Switcher for Demo / Testing */}
        <div className="mt-6 pt-5 border-t border-border space-y-2">
          <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider text-center">
            Instant Demo Sign In
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@markcrm.com')
                setPassword('admin123')
                router.push('/admin/dashboard')
              }}
              className="px-2.5 py-2 rounded-lg border border-border bg-surface hover:bg-slate-100 text-left transition-colors cursor-pointer"
            >
              <p className="text-xs font-bold text-text-primary">⚡ Admin Head</p>
              <p className="text-[10px] text-text-muted truncate">admin@markcrm.com</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('priya@markcrm.com')
                setPassword('priya123')
                router.push('/employee/dashboard')
              }}
              className="px-2.5 py-2 rounded-lg border border-border bg-surface hover:bg-slate-100 text-left transition-colors cursor-pointer"
            >
              <p className="text-xs font-bold text-text-primary">👤 Employee</p>
              <p className="text-[10px] text-text-muted truncate">priya@markcrm.com</p>
            </button>
          </div>
        </div>
      </Card>

      <p className="text-center text-xs text-text-muted mt-6">
        Don&apos;t have an account?{' '}
        <span className="text-text-secondary">Contact your admin.</span>
      </p>
    </div>
  )
}

