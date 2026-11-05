'use client'

// app/admin/settings/page.tsx
// Agency Settings & Administration — Service categories, automated global reminder milestones, and security.

import { useState, Suspense } from 'react'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card,
  CardHeader,
  Badge,
  Button,
  Input,
  Tabs,
  Toggle,
  Modal,
  PageLoader,
} from '@/components/ui'
import { mockCategories, mockProjects } from '@/lib/mock-data'
import { generateId } from '@/lib/utils'
import {
  Settings,
  Bell,
  Layers,
  User,
  Shield,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Mail,
  Lock,
} from 'lucide-react'
import type { ServiceCategory } from '@/lib/types'

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminSettingsContent />
    </Suspense>
  )
}

function AdminSettingsContent() {
  const [activeTab, setActiveTab] = useState('categories')

  // Categories state
  const [categories, setCategories] = useState<ServiceCategory[]>(mockCategories)
  const [newCatName, setNewCatName] = useState('')
  const [newCatColor, setNewCatColor] = useState('#3b82f6')
  const [catError, setCatError] = useState('')

  // Reminders state
  const [reminderDays, setReminderDays] = useState<number[]>([3, 2, 1, 0])
  const [newReminderDay, setNewReminderDay] = useState('')

  // Profile state
  const [adminName, setAdminName] = useState('Agency Head')
  const [adminEmail, setAdminEmail] = useState('admin@markcrm.com')
  const [adminPhone, setAdminPhone] = useState('+91 99887 76655')
  const [savedProfileSuccess, setSavedProfileSuccess] = useState(false)

  // Notification toggles
  const [emailDeadlineReminders, setEmailDeadlineReminders] = useState(true)
  const [emailOverdueAlerts, setEmailOverdueAlerts] = useState(true)
  const [emailDoubtAlerts, setEmailDoubtAlerts] = useState(true)
  const [emailFollowupReminders, setEmailFollowupReminders] = useState(true)

  // Add Category
  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault()
    setCatError('')
    if (!newCatName.trim()) return

    if (
      categories.some(
        (c) => c.name.toLowerCase() === newCatName.trim().toLowerCase(),
      )
    ) {
      setCatError('A service category with this name already exists.')
      return
    }

    const created: ServiceCategory = {
      id: `cat-${generateId()}`,
      name: newCatName.trim(),
      color: newCatColor,
      isDefault: false,
      createdAt: new Date().toISOString(),
    }

    mockCategories.push(created)
    setCategories([...categories, created])
    setNewCatName('')
  }

  // Delete Category with safety check
  function handleDeleteCategory(catId: string) {
    const isUsed = mockProjects.some((p) => p.serviceCategories.includes(catId))
    if (isUsed) {
      alert(
        'Cannot delete this service category: it is currently referenced by one or more active projects.',
      )
      return
    }

    setCategories((prev) => prev.filter((c) => c.id !== catId))
  }

  // Reminders
  function handleAddReminder() {
    const num = parseInt(newReminderDay, 10)
    if (!isNaN(num) && num >= 0 && !reminderDays.includes(num)) {
      setReminderDays([...reminderDays, num].sort((a, b) => b - a))
      setNewReminderDay('')
    }
  }

  function handleRemoveReminder(day: number) {
    setReminderDays(reminderDays.filter((d) => d !== day))
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavedProfileSuccess(true)
    setTimeout(() => setSavedProfileSuccess(false), 3000)
  }

  const tabs = [
    { id: 'categories', label: 'Service Categories' },
    { id: 'reminders', label: 'Global Reminders' },
    { id: 'profile', label: 'Admin Profile' },
    { id: 'notifications', label: 'Email Alerts' },
  ]

  const colorPresets = [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#f59e0b', // amber
    '#ef4444', // red
    '#22c55e', // green
    '#06b6d4', // cyan
    '#ec4899', // pink
  ]

  return (
    <ContentWrapper narrow>
      <PageHeader
        title="Settings & System Configuration"
        description="Configure agency service categories, default deadline reminder intervals, and notification channels."
      />

      <div className="mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab 1: Service Categories */}
      {activeTab === 'categories' && (
        <div className="space-y-6">
          <Card padding="lg">
            <CardHeader
              title="Marketing Service Categories"
              description="Customize the digital marketing offerings available when onboarding projects"
            />

            {/* Add Category Form */}
            <form onSubmit={handleAddCategory} className="mb-6 p-4 rounded-xl border border-border bg-surface space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                <div className="flex-1">
                  <Input
                    label="New Category Title"
                    placeholder="e.g. Influencer Marketing, Video Production"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    error={catError}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-text-primary block mb-1.5">
                    Color Accent
                  </label>
                  <div className="flex items-center gap-1.5 h-10">
                    {colorPresets.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCatColor(c)}
                        className={`h-6 w-6 rounded-full transition-transform ${
                          newCatColor === c
                            ? 'scale-110 ring-2 ring-brand-500 ring-offset-1'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                </div>

                <Button type="submit" variant="primary" size="md">
                  <Plus className="h-4 w-4" />
                  <span>Add Category</span>
                </Button>
              </div>
            </form>

            {/* Category List */}
            <div className="divide-y divide-border text-xs">
              {categories.map((cat) => {
                const projectCount = mockProjects.filter((p) =>
                  p.serviceCategories.includes(cat.id),
                ).length

                return (
                  <div
                    key={cat.id}
                    className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3.5 w-3.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <div>
                        <span className="font-semibold text-text-primary text-sm">
                          {cat.name}
                        </span>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {projectCount} active projects assigned
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {cat.isDefault && (
                        <span className="text-[10px] bg-surface text-text-muted px-2 py-0.5 rounded border border-border">
                          Default
                        </span>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCategory(cat.id)}
                        aria-label={`Delete ${cat.name}`}
                        className="text-text-muted hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Global Reminders */}
      {activeTab === 'reminders' && (
        <Card padding="lg" className="space-y-6">
          <CardHeader
            title="Global Deadline Reminder Schedule"
            description="Milestone days before project delivery when automated emails & alerts are triggered"
          />

          <p className="text-xs text-text-muted leading-relaxed">
            These timing rules will apply automatically to all newly created deliverables. Reminders stop automatically when a project is marked as <strong>Delivered</strong>.
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {reminderDays.map((day) => (
              <span
                key={day}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-xs font-semibold text-brand-700"
              >
                <Bell className="h-3.5 w-3.5" />
                <span>{day === 0 ? 'On Day of Deadline' : `${day} Days Before`}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveReminder(day)}
                  className="hover:text-danger ml-1"
                  aria-label={`Delete reminder for ${day} days`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>

          <div className="pt-4 border-t border-border flex items-center gap-3 max-w-sm">
            <Input
              type="number"
              min="0"
              max="60"
              placeholder="e.g. 5 days before"
              value={newReminderDay}
              onChange={(e) => setNewReminderDay(e.target.value)}
            />
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleAddReminder}
              disabled={!newReminderDay}
            >
              Add Milestone
            </Button>
          </div>
        </Card>
      )}

      {/* Tab 3: Admin Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile}>
          <Card padding="lg" className="space-y-6">
            <CardHeader
              title="Company Head Account"
              description="Primary agency administrator contact details"
            />

            {savedProfileSuccess && (
              <div className="p-3 rounded-lg bg-success-light text-success-dark text-xs flex items-center gap-2">
                <Check className="h-4 w-4" />
                <span>Administrator profile updated successfully!</span>
              </div>
            )}

            <div className="space-y-4">
              <Input
                label="Administrator Full Name"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                required
              />

              <Input
                label="Registered Admin Email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />

              <Input
                label="Direct Phone Number"
                type="tel"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                required
              />
            </div>

            <div className="pt-4 border-t border-border flex justify-end">
              <Button type="submit" variant="primary">
                Save Profile
              </Button>
            </div>
          </Card>
        </form>
      )}

      {/* Tab 4: Email Alerts */}
      {activeTab === 'notifications' && (
        <Card padding="lg" className="space-y-6">
          <CardHeader
            title="Notification & Email Dispatch Rules"
            description="Control which system events trigger email notifications"
          />

          <div className="divide-y divide-border text-xs">
            <div className="py-4 first:pt-0 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-text-primary text-sm">
                  Upcoming Deadline Reminders
                </p>
                <p className="text-text-muted mt-0.5">
                  Send reminder emails 3 days, 2 days, and 1 day before delivery dates.
                </p>
              </div>
              <Toggle
                checked={emailDeadlineReminders}
                onChange={setEmailDeadlineReminders}
              />
            </div>

            <div className="py-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-text-primary text-sm">
                  Overdue Project Alerts
                </p>
                <p className="text-text-muted mt-0.5">
                  Alert admin immediately if delivery date has passed without completion.
                </p>
              </div>
              <Toggle
                checked={emailOverdueAlerts}
                onChange={setEmailOverdueAlerts}
              />
            </div>

            <div className="py-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-text-primary text-sm">
                  Employee Doubt Notifications
                </p>
                <p className="text-text-muted mt-0.5">
                  Email admin when staff submits an urgent question or project blocker.
                </p>
              </div>
              <Toggle
                checked={emailDoubtAlerts}
                onChange={setEmailDoubtAlerts}
              />
            </div>

            <div className="py-4 last:pb-0 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-text-primary text-sm">
                  Scheduled Follow-up Reminders
                </p>
                <p className="text-text-muted mt-0.5">
                  Send notifications when a client callback date and time arrives.
                </p>
              </div>
              <Toggle
                checked={emailFollowupReminders}
                onChange={setEmailFollowupReminders}
              />
            </div>
          </div>
        </Card>
      )}
    </ContentWrapper>
  )
}
