'use client'

// app/admin/employees/new/page.tsx
// Add Employee Form — Onboard full-time, interns, or hourly consultants with initial credentials.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, Input, Textarea, Button } from '@/components/ui'
import { api } from '@/lib/api'
import {
  User,
  Mail,
  Phone,
  Briefcase,
  IndianRupee,
  Lock,
  Calendar,
  ArrowLeft,
  Check,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react'
import type { PayType } from '@/lib/types'

export default function NewEmployeePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverError, setServerError] = useState('')

  // Fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [designation, setDesignation] = useState('')
  const [payType, setPayType] = useState<PayType>('salary')
  const [payRate, setPayRate] = useState('')
  const [joinDate, setJoinDate] = useState('')
  const [initialPassword, setInitialPassword] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    setJoinDate(new Date().toISOString().split('T')[0])
  }, [])

  // Validation
  const [errors, setErrors] = useState<{
    fullName?: string
    email?: string
    phone?: string
    designation?: string
    payRate?: string
    initialPassword?: string
  }>({})

  function validate() {
    const errs: typeof errors = {}
    if (!fullName.trim()) errs.fullName = 'Full name is required'
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = 'Valid corporate or personal email is required'
    if (!phone.trim() || phone.length < 8)
      errs.phone = 'Valid phone number is required'
    if (!designation.trim()) errs.designation = 'Role / Designation is required'
    if (!payRate || isNaN(Number(payRate)) || Number(payRate) < 0)
      errs.payRate = 'Please enter a valid numeric pay rate'
    if (!initialPassword || initialPassword.length < 6)
      errs.initialPassword = 'Initial password must be at least 6 characters'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError('')
    if (!validate()) return

    setIsSubmitting(true)

    try {
      const created = await api.employees.create({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        designation: designation.trim(),
        payType,
        payRate: Number(payRate),
        joinDate: new Date(joinDate).toISOString(),
        initialPassword,
        notes: notes.trim() || undefined,
      })

      const empId = created?.id || 'new'
      router.push(`/admin/employees/${empId}`)
    } catch (err: any) {
      setServerError(err?.message || 'Failed to onboard employee on backend server.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ContentWrapper narrow>
      <PageHeader
        title="Add Team Member"
        description="Create employee profile, configure compensation type, and assign initial login password."
        breadcrumbs={[
          { label: 'Employees', href: '/admin/employees' },
          { label: 'New Employee' },
        ]}
        action={
          <Link href="/admin/employees">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </Link>
        }
      />

      {serverError && (
        <div className="mb-4 p-3 rounded-lg bg-danger-light border border-danger/30 text-danger-dark text-sm font-medium">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Card padding="lg" className="space-y-6">
          {/* Section 1: Personal & Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
              Staff Identity & Contact
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                placeholder="e.g. John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                error={errors.fullName}
                leftIcon={<User className="h-4 w-4" />}
                required
              />

              <Input
                label="Role / Designation"
                placeholder="e.g. SEO Lead, Copywriter, PPC Analyst"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                error={errors.designation}
                leftIcon={<Briefcase className="h-4 w-4" />}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Login Email Address"
                type="email"
                placeholder="staff@markcrm.com"
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
          </div>

          {/* Section 2: Compensation & Pay Type */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
              Employment & Compensation
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-text-primary block mb-1.5">
                  Employment / Pay Type <span className="text-danger">*</span>
                </label>
                <select
                  value={payType}
                  onChange={(e) => setPayType(e.target.value as PayType)}
                  className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text-primary cursor-pointer"
                >
                  <option value="salary">Salary (Full-Time Monthly)</option>
                  <option value="intern">Internship (Monthly Stipend)</option>
                  <option value="hourly">Hourly Consultant / Freelancer</option>
                </select>
              </div>

              <Input
                label={
                  payType === 'hourly'
                    ? 'Hourly Rate (₹/hr) *'
                    : 'Monthly Pay Rate (₹/mo) *'
                }
                type="number"
                placeholder={payType === 'hourly' ? '350' : '35000'}
                value={payRate}
                onChange={(e) => setPayRate(e.target.value)}
                error={errors.payRate}
                leftIcon={<IndianRupee className="h-4 w-4" />}
                required
              />

              <Input
                label="Joining Date"
                type="date"
                value={joinDate}
                onChange={(e) => setJoinDate(e.target.value)}
                leftIcon={<Calendar className="h-4 w-4" />}
                required
              />
            </div>
          </div>

          {/* Section 3: Credentials Setup */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-semibold text-text-primary">
                Portal Access Credentials
              </h3>
              <span className="text-xs text-text-muted flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-success" />
                Admin Created
              </span>
            </div>

            <p className="text-xs text-text-muted">
              Enter the initial password for this staff member. Administrators alone decide and manage employee passwords; staff members cannot self-change credentials.
            </p>

            <Input
              label="Employee Login Password"
              type="text"
              placeholder="Set a secure password (min 6 characters)"
              value={initialPassword}
              onChange={(e) => setInitialPassword(e.target.value)}
              error={errors.initialPassword}
              leftIcon={<Lock className="h-4 w-4" />}
              required
            />
          </div>

          <Textarea
            label="Internal Notes / Skills (Optional)"
            placeholder="Specialized tools (e.g. Ahrefs, SEMrush, Meta Ads Manager, Figma) or background notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border">
            <Link href="/admin/employees" className="w-full sm:w-auto">
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
              <Check className="h-4 w-4" />
              <span>Create Employee Account</span>
            </Button>
          </div>
        </Card>
      </form>
    </ContentWrapper>
  )
}
