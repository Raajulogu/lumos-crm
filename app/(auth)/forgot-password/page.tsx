'use client'

// app/(auth)/forgot-password/page.tsx
import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { Input, Button, Card } from '@/components/ui'
import { APP_NAME } from '@/lib/constants'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email) {
      setError('Please enter your email address.')
      return
    }
    setIsLoading(true)
    // TODO: Replace with real password reset API call
    setTimeout(() => {
      setIsLoading(false)
      setSubmitted(true)
    }, 1000)
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{APP_NAME}</h1>
      </div>

      <Card padding="lg">
        {submitted ? (
          <div className="flex flex-col items-center text-center gap-3 py-4">
            <CheckCircle className="h-12 w-12 text-success" />
            <h2 className="text-base font-semibold text-text-primary">
              Check your email
            </h2>
            <p className="text-sm text-text-muted">
              We&apos;ve sent a password reset link to{' '}
              <span className="font-medium text-text-primary">{email}</span>.
              It expires in 30 minutes.
            </p>
            <Link href="/login">
              <Button variant="secondary" size="sm" className="mt-2">
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-text-primary mb-1">
              Reset your password
            </h2>
            <p className="text-sm text-text-muted mb-6">
              Enter your registered email address and we&apos;ll send you a reset link.
            </p>

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
                error={error}
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full"
              >
                Send Reset Link
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link
                href="/login"
                className="text-sm text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

