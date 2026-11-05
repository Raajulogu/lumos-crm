'use client'

// app/admin/clients/new/page.tsx
// Add New Client Form — responsive, validated, with option to proceed directly to project onboarding.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, Input, Textarea, Button } from '@/components/ui'
import { mockClients } from '@/lib/mock-data'
import { generateId } from '@/lib/utils'
import { Building2, User, Mail, Phone, MapPin, ArrowLeft, ArrowRight, Check } from 'lucide-react'

export default function NewClientPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form fields
  const [fullName, setFullName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [createProjectAfter, setCreateProjectAfter] = useState(true)

  // Errors
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)

    const newClient = {
      id: `cli-${generateId()}`,
      fullName: fullName.trim(),
      companyName: companyName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    // Append to mock data
    mockClients.unshift(newClient)

    setTimeout(() => {
      setIsSubmitting(false)
      if (createProjectAfter) {
        // Redirect to project creation pre-selecting this newly created client
        router.push(`/admin/projects/new?clientId=${newClient.id}`)
      } else {
        router.push(`/admin/clients/${newClient.id}`)
      }
    }, 600)
  }

  return (
    <ContentWrapper narrow>
      <PageHeader
        title="Add New Client"
        description="Onboard a new digital marketing client or business account."
        breadcrumbs={[
          { label: 'Clients', href: '/admin/clients' },
          { label: 'New Client' },
        ]}
        action={
          <Link href="/admin/clients">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} noValidate>
        <Card padding="lg" className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
              Business Information
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
                label="Business Email"
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
              label="Physical Address / Office Location"
              placeholder="Suite, building, street, city (optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              leftIcon={<MapPin className="h-4 w-4" />}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
              Initial Requirements & Notes
            </h3>

            <Textarea
              label="Notes / Client Needs"
              placeholder="Enter any initial discussion notes, target goals, budget expectations, or preferred communication channels..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Next action checkbox */}
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

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border">
            <Link href="/admin/clients" className="w-full sm:w-auto">
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
              {createProjectAfter ? (
                <>
                  <span>Save & Add Project</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Save Client</span>
                </>
              )}
            </Button>
          </div>
        </Card>
      </form>
    </ContentWrapper>
  )
}

