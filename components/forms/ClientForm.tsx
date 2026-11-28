'use client'

// components/forms/ClientForm.tsx
// Reusable Client Form shared by Add Client (/admin/clients/new) and Edit Client (/admin/clients/[id]/edit).

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, Input, Textarea, Button } from '@/components/ui'
import { api } from '@/lib/api'
import type { Client, ClientStatus } from '@/lib/types'
import { Building2, User, Mail, Phone, MapPin, ArrowRight, Check } from 'lucide-react'

interface ClientFormProps {
  mode: 'create' | 'edit'
  initialClient?: Client | null
}

export function ClientForm({ mode, initialClient }: ClientFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  const [fullName, setFullName] = useState(initialClient?.fullName || '')
  const [companyName, setCompanyName] = useState(initialClient?.companyName || '')
  const [email, setEmail] = useState(initialClient?.email || '')
  const [phone, setPhone] = useState(initialClient?.phone || '')
  const [address, setAddress] = useState(initialClient?.address || '')
  const [notes, setNotes] = useState(initialClient?.notes || '')
  const [status, setStatus] = useState<ClientStatus>(initialClient?.status || 'active')
  const [createProjectAfter, setCreateProjectAfter] = useState(mode === 'create')

  const [errors, setErrors] = useState<{
    fullName?: string
    companyName?: string
    email?: string
    phone?: string
  }>({})

  function validate() {
    const newErrors: typeof errors = {}
    if (!fullName.trim()) newErrors.fullName = 'Primary contact name is required'
    if (!companyName.trim()) newErrors.companyName = 'Company / Brand name is required'
    if (!email.trim()) {
      newErrors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (phone.trim().length < 8) {
      newErrors.phone = 'Please enter a valid phone number (at least 8 digits)'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')
    if (!validate()) return

    setIsSubmitting(true)

    try {
      const payload = {
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      }

      if (mode === 'edit' && initialClient) {
        await api.clients.update(initialClient.id, { ...payload, status })
        router.push(`/admin/clients/${initialClient.id}`)
      } else {
        const created = await api.clients.create(payload)
        const clientId = created?.id || 'new'
        if (createProjectAfter) {
          router.push(`/admin/projects/new?clientId=${clientId}`)
        } else {
          router.push(`/admin/clients/${clientId}`)
        }
      }
    } catch (err: unknown) {
      setServerError(
        err instanceof Error
          ? err.message
          : `Failed to ${mode === 'edit' ? 'update' : 'create'} client on server.`,
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const cancelHref =
    mode === 'edit' && initialClient
      ? `/admin/clients/${initialClient.id}`
      : '/admin/clients'

  return (
    <>
      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-danger-light border border-danger/30 text-danger-dark text-sm font-medium">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Card padding="lg" className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
              Business & Company Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Company / Brand Name"
                placeholder="e.g. Acme Marketing Co."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                error={errors.companyName}
                leftIcon={<Building2 className="h-4 w-4" />}
                required
              />

              <Input
                label="Primary Contact Person"
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={errors.fullName}
                leftIcon={<User className="h-4 w-4" />}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="contact@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                leftIcon={<Mail className="h-4 w-4" />}
                required
              />

              <Input
                label="Phone Number"
                type="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                error={errors.phone}
                leftIcon={<Phone className="h-4 w-4" />}
                required
              />
            </div>

            <Input
              label="Office Address"
              placeholder="Suite, building, street, city (optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              leftIcon={<MapPin className="h-4 w-4" />}
            />

            {mode === 'edit' && (
              <div className="max-w-xs">
                <label className="text-sm font-medium text-text-primary block mb-1.5">
                  Account Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ClientStatus)}
                  className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text-primary"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
              Onboarding Notes & Requirements
            </h3>

            <Textarea
              label="Onboarding Notes / Client Needs"
              placeholder="Enter discussion notes, target goals, budget expectations, or preferred communication channels..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {mode === 'create' && (
            <div className="pt-2 border-t border-border">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createProjectAfter}
                  onChange={(e) => setCreateProjectAfter(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border text-brand-600 focus:ring-brand-500"
                />
                <div>
                  <span className="text-sm font-medium text-text-primary">
                    Immediately onboard this client&apos;s first project
                  </span>
                  <p className="text-xs text-text-muted mt-0.5">
                    After saving, you&apos;ll be directed to the project setup form with this client already selected.
                  </p>
                </div>
              </label>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border">
            <Link href={cancelHref} className="w-full sm:w-auto">
              <Button type="button" variant="secondary" className="w-full sm:w-auto">
                Cancel
              </Button>
            </Link>

            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="w-full sm:w-auto"
            >
              {mode === 'create' && createProjectAfter ? (
                <>
                  <span>Save & Add Project</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{mode === 'edit' ? 'Save Changes' : 'Save Client'}</span>
                </>
              )}
            </Button>
          </div>
        </Card>
      </form>
    </>
  )
}

