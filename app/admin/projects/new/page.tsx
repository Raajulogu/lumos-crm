'use client'

// app/admin/projects/new/page.tsx
// Project Onboarding Form — client association, service category multi-select, team assignment, and reminder customization.

import { useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, Input, Textarea, Button, Badge, PageLoader } from '@/components/ui'
import {
  mockClients,
  mockEmployees,
  mockCategories,
  mockProjects,
} from '@/lib/mock-data'
import { generateId, formatCurrency } from '@/lib/utils'
import {
  Briefcase,
  Building2,
  Calendar,
  Clock,
  User,
  Users,
  IndianRupee,
  Plus,
  X,
  ArrowLeft,
  Check,
  Bell,
  AlertCircle,
} from 'lucide-react'
import type { ProjectPriority, ReminderConfig } from '@/lib/types'

export default function NewProjectPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <NewProjectForm />
    </Suspense>
  )
}

function NewProjectForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedClientId = searchParams.get('clientId') || ''

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form Fields
  const [name, setName] = useState('')
  const [clientId, setClientId] = useState(preselectedClientId)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [actualCost, setActualCost] = useState('')
  const [startDate, setStartDate] = useState('2026-11-05')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [priority, setPriority] = useState<ProjectPriority>('medium')
  const [primaryEmployeeId, setPrimaryEmployeeId] = useState('')
  const [additionalMemberIds, setAdditionalMemberIds] = useState<string[]>([])

  // Custom Reminders (days before deadline)
  const [reminderDays, setReminderDays] = useState<number[]>([3, 2, 1, 0])
  const [newReminderDay, setNewReminderDay] = useState('')

  // Validation Errors
  const [errors, setErrors] = useState<{
    name?: string
    clientId?: string
    categories?: string
    budget?: string
    startDate?: string
    deliveryDate?: string
  }>({})

  // Category toggle
  function toggleCategory(catId: string) {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId],
    )
  }

  // Member toggle
  function toggleMember(empId: string) {
    if (empId === primaryEmployeeId) return // already primary
    setAdditionalMemberIds((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId],
    )
  }

  // Reminder tag management
  function addReminder() {
    const day = parseInt(newReminderDay, 10)
    if (!isNaN(day) && day >= 0 && !reminderDays.includes(day)) {
      setReminderDays((prev) => [...prev, day].sort((a, b) => b - a))
      setNewReminderDay('')
    }
  }

  function removeReminder(day: number) {
    setReminderDays((prev) => prev.filter((d) => d !== day))
  }

  // Validation
  function validate() {
    const errs: typeof errors = {}
    if (!name.trim()) errs.name = 'Project title is required'
    if (!clientId) errs.clientId = 'Please select a client account'
    if (selectedCategories.length === 0)
      errs.categories = 'Select at least one service category'
    if (!budget || isNaN(Number(budget)) || Number(budget) <= 0)
      errs.budget = 'Please enter a valid agreed budget amount'
    if (!startDate) errs.startDate = 'Start date is required'
    if (!deliveryDate) errs.deliveryDate = 'Delivery deadline date is required'
    else if (startDate && deliveryDate < startDate)
      errs.deliveryDate = 'Delivery date cannot be before start date'

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Submit
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)

    const numBudget = Number(budget)
    const numCost = actualCost ? Number(actualCost) : undefined

    const newProject = {
      id: `proj-${generateId()}`,
      name: name.trim(),
      clientId,
      serviceCategories: selectedCategories,
      description: description.trim(),
      budget: numBudget,
      actualCost: numCost,
      startDate,
      deliveryDate,
      priority,
      status: 'new' as const,
      primaryEmployeeId: primaryEmployeeId || undefined,
      additionalMemberIds,
      reminderOverrides: reminderDays.map((d) => ({ daysBeforeDeadline: d })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    mockProjects.unshift(newProject)

    setTimeout(() => {
      setIsSubmitting(false)
      router.push(`/admin/projects/${newProject.id}`)
    }, 600)
  }

  // Live profit calculation preview
  const profitPreview = useMemo(() => {
    const b = Number(budget) || 0
    const c = Number(actualCost) || 0
    return b - c
  }, [budget, actualCost])

  return (
    <ContentWrapper narrow>
      <PageHeader
        title="Onboard New Project"
        description="Set up deliverables, assign marketing staff, configure deadlines and reminders."
        breadcrumbs={[
          { label: 'Projects', href: '/admin/projects' },
          { label: 'New Project' },
        ]}
        action={
          <Link href="/admin/projects">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </Link>
        }
      />

      <form onSubmit={handleSubmit} noValidate>
        <Card padding="lg" className="space-y-6">
          {/* Section 1: Client & Project Identity */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
              Project & Client Identity
            </h3>

            <div>
              <label className="text-sm font-medium text-text-primary block mb-1.5">
                Client Account <span className="text-danger">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className={`flex-1 h-10 rounded-lg border bg-white px-3 text-sm text-text-primary ${
                    errors.clientId
                      ? 'border-danger focus:ring-danger'
                      : 'border-border hover:border-border-strong'
                  }`}
                >
                  <option value="">-- Select Client --</option>
                  {mockClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} ({c.fullName})
                    </option>
                  ))}
                </select>

                <Link href="/admin/clients/new">
                  <Button type="button" variant="secondary" size="md">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Client</span>
                  </Button>
                </Link>
              </div>
              {errors.clientId && (
                <p className="text-xs text-danger mt-1">{errors.clientId}</p>
              )}
            </div>

            <Input
              label="Project / Campaign Title"
              placeholder="e.g. Acme — Q4 SEO & Content Optimization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              leftIcon={<Briefcase className="h-4 w-4" />}
              required
            />

            {/* Service Categories Multi-select */}
            <div>
              <label className="text-sm font-medium text-text-primary block mb-1.5">
                Service Categories <span className="text-danger">*</span>
              </label>
              <p className="text-xs text-text-muted mb-2">
                Select all marketing services included in this client deliverable.
              </p>
              <div className="flex flex-wrap gap-2">
                {mockCategories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat.id)
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-brand-600 text-white shadow-sm ring-2 ring-brand-500 ring-offset-1'
                          : 'bg-white border border-border text-text-secondary hover:bg-surface'
                      }`}
                    >
                      {cat.name}
                    </button>
                  )
                })}
              </div>
              {errors.categories && (
                <p className="text-xs text-danger mt-1.5">{errors.categories}</p>
              )}
            </div>

            <Textarea
              label="Scope & Deliverable Requirements"
              placeholder="Detail specific deliverables, targets (e.g. 10 blog posts, 50 backlinks, ₹1L ad spend), target audience, and client guidelines..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          {/* Section 2: Timeline & Priority */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
              Timeline & Urgency
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                error={errors.startDate}
                required
              />

              <Input
                label="Delivery Deadline"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                error={errors.deliveryDate}
                required
              />

              <div>
                <label className="text-sm font-medium text-text-primary block mb-1.5">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ProjectPriority)}
                  className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text-primary"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Financials & Profit Margin */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
              Financial Agreement (Admin Only)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Agreed Project Budget (₹)"
                type="number"
                placeholder="e.g. 50000"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                error={errors.budget}
                leftIcon={<IndianRupee className="h-4 w-4" />}
                required
              />

              <Input
                label="Estimated / Incurred Cost (₹)"
                type="number"
                placeholder="e.g. 25000 (optional)"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                leftIcon={<IndianRupee className="h-4 w-4" />}
                hint="Ad spend, freelance writer costs, or direct tools."
              />
            </div>

            {budget && Number(budget) > 0 && (
              <div className="p-3 bg-surface rounded-lg border border-border flex items-center justify-between text-xs">
                <span className="text-text-muted">Estimated Agency Profit Margin:</span>
                <span
                  className={`font-bold text-sm ${
                    profitPreview >= 0 ? 'text-success-dark' : 'text-danger'
                  }`}
                >
                  {formatCurrency(profitPreview)}
                  {Number(budget) > 0 && (
                    <span className="text-xs font-normal text-text-muted ml-1">
                      ({Math.round((profitPreview / Number(budget)) * 100)}%)
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          {/* Section 4: Team Assignment */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-text-primary border-b border-border pb-2">
              Staff Assignment
            </h3>

            <div>
              <label className="text-sm font-medium text-text-primary block mb-1.5">
                Primary Account Manager / Lead Employee
              </label>
              <select
                value={primaryEmployeeId}
                onChange={(e) => setPrimaryEmployeeId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text-primary"
              >
                <option value="">-- Unassigned (Assign Later) --</option>
                {mockEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} — {emp.designation} ({emp.payType})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-text-primary block mb-1">
                Additional Team Members (Collaborators)
              </label>
              <p className="text-xs text-text-muted mb-2">
                Team members can view project scope and raise questions.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mockEmployees
                  .filter((emp) => emp.id !== primaryEmployeeId)
                  .map((emp) => {
                    const isChecked = additionalMemberIds.includes(emp.id)
                    return (
                      <label
                        key={emp.id}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-brand-50 border-brand-300 text-brand-900 font-medium'
                            : 'bg-white border-border text-text-secondary hover:bg-surface'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleMember(emp.id)}
                          className="h-3.5 w-3.5 rounded border-border text-brand-600 focus:ring-brand-500"
                        />
                        <span>
                          {emp.fullName} ({emp.designation})
                        </span>
                      </label>
                    )
                  })}
              </div>
            </div>
          </div>

          {/* Section 5: Automated Deadline Reminder Triggers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <h3 className="text-sm font-semibold text-text-primary">
                Deadline Reminders (Email & In-App)
              </h3>
              <Badge variant="blue" size="sm">
                Customizable
              </Badge>
            </div>

            <p className="text-xs text-text-muted">
              Notifications will trigger automatically for assigned employees and admin on these intervals:
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {reminderDays.map((day) => (
                <span
                  key={day}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-200 text-xs font-semibold text-brand-700"
                >
                  <Bell className="h-3 w-3" />
                  {day === 0 ? 'On Deadline Day' : `${day} days before`}
                  <button
                    type="button"
                    onClick={() => removeReminder(day)}
                    className="hover:text-danger ml-0.5"
                    aria-label={`Remove ${day} day reminder`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 max-w-xs pt-1">
              <Input
                type="number"
                min="0"
                max="60"
                placeholder="Days before (e.g. 5)"
                value={newReminderDay}
                onChange={(e) => setNewReminderDay(e.target.value)}
                className="h-9 text-xs"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addReminder}
                disabled={!newReminderDay}
              >
                Add Alert
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4 border-t border-border">
            <Link href="/admin/projects" className="w-full sm:w-auto">
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
              <span>Create Project</span>
            </Button>
          </div>
        </Card>
      </form>
    </ContentWrapper>
  )
}
