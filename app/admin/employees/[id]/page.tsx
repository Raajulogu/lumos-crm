'use client'

// app/admin/employees/[id]/page.tsx
// Employee Profile & Performance Metrics — Workload distribution, on-time delivery KPIs, and account management.

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card,
  CardHeader,
  Badge,
  Button,
  Avatar,
  Toggle,
  Modal,
  PageLoader,
  CardSkeleton,
  TableSkeleton,
} from '@/components/ui'
import { EmployeeWorksheetSection } from '@/components/common'
import { api } from '@/lib/api'
import type { Employee, Project, Client, Doubt } from '@/lib/types'
import {
  ArrowLeft,
  Award,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Check,
  Briefcase,
  ClipboardList,
} from 'lucide-react'
import {
  formatDate,
  formatCurrency,
  getStatusLabel,
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
  isOverdue,
} from '@/lib/utils'

export default function AdminEmployeeDetailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminEmployeeDetailContent />
    </Suspense>
  )
}

function AdminEmployeeDetailContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const empId = params?.id as string
  const [activeTab, setActiveTab] = useState<'overview' | 'worksheet'>(() =>
    searchParams.get('tab') === 'worksheet' ? 'worksheet' : 'overview',
  )

  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [doubts, setDoubts] = useState<Doubt[]>([])

  // Password management state (Admin control)
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.')
      return
    }

    setIsUpdatingPassword(true)
    try {
      await api.employees.updatePassword(empId, newPassword)
      setPasswordSuccess('Password successfully updated for this team member.')
      setNewPassword('')
      setTimeout(() => {
        setIsPasswordModalOpen(false)
        setPasswordSuccess('')
      }, 1500)
    } catch (err: unknown) {
      setPasswordError(
        err instanceof Error ? err.message : 'Failed to update employee password.',
      )
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  useEffect(() => {
    let mounted = true

    Promise.allSettled([
      api.employees.getById(empId),
      api.projects.list({ limit: 100 }),
      api.clients.list({ limit: 100 }),
    ])
      .then(async ([empRes, projRes, clientRes]) => {
        if (!mounted) return

        if (empRes.status === 'fulfilled' && empRes.value) {
          const detail = empRes.value
          setEmployee(detail.employee || (detail as unknown as Employee))
          if (detail.assignedProjects) setProjects(detail.assignedProjects)
        }

        let matchingProjects: Project[] = []
        if (projRes.status === 'fulfilled') {
          const allLoaded = projRes.value?.projects || []
          setAllProjects(allLoaded)
          matchingProjects = allLoaded.filter(
            (p) =>
              p.primaryEmployeeId === empId ||
              p.additionalMemberIds?.includes(empId),
          )
          setProjects(matchingProjects)
        }

        if (clientRes.status === 'fulfilled') {
          setClients(clientRes.value?.clients || [])
        }

        if (matchingProjects.length > 0) {
          const doubtResults = await Promise.allSettled(
            matchingProjects.map((p) => api.doubts.listByProject(p.id)),
          )
          if (!mounted) return
          const empDoubts = doubtResults
            .flatMap((res) => (res.status === 'fulfilled' ? res.value || [] : []))
            .filter((d) => d.raisedById === empId)
          setDoubts(empDoubts)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [empId])

  // Lookups
  const clientMap = useMemo(
    () =>
      new Map(
        (Array.isArray(clients) ? clients : []).map((c) => [
          c.id || (c as Client & { _id?: string })._id || '',
          c,
        ]),
      ),
    [clients],
  )

  const assignedProjects = Array.isArray(projects) ? projects : []

  if (loading) {
    return (
      <ContentWrapper>
        <div className="space-y-6">
          <CardSkeleton rows={2} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} rows={2} />
            ))}
          </div>
          <TableSkeleton rows={4} cols={4} />
        </div>
      </ContentWrapper>
    )
  }

  if (!employee) {
    return (
      <ContentWrapper>
        <Card padding="lg" className="text-center py-12">
          <p className="text-base font-semibold text-text-primary">Employee Not Found</p>
          <p className="text-sm text-text-muted mt-1">
            The team member profile you requested does not exist.
          </p>
          <Link href="/admin/employees" className="inline-block mt-4">
            <Button variant="primary" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Return to Staff List
            </Button>
          </Link>
        </Card>
      </ContentWrapper>
    )
  }

  // Performance calculations
  const totalHandled = assignedProjects.length
  const completedProjects = assignedProjects.filter(
    (p) => p.status === 'completed' || p.status === 'delivered',
  )
  const activeProjects = assignedProjects.filter((p) => p.status !== 'delivered')
  const overdueProjects = activeProjects.filter((p) =>
    isOverdue(p.deliveryDate, p.status),
  )

  // Calculate on-time rate
  const onTimeRate =
    totalHandled > 0
      ? Math.round(((totalHandled - overdueProjects.length) / totalHandled) * 100)
      : 100

  const employeeDoubts = doubts
  const openDoubts = doubts.filter((d) => d.status === 'open')

  async function toggleActiveStatus() {
    const nextStatus = employee!.status === 'active' ? 'inactive' : 'active'
    const updated = {
      ...employee!,
      status: nextStatus as 'active' | 'inactive',
    }
    setEmployee(updated)

    try {
      await api.employees.toggleStatus(employee!.id, nextStatus)
    } catch {}
  }

  return (
    <ContentWrapper>
      <PageHeader
        title={employee.fullName}
        description={`${employee.designation} • Joined ${formatDate(employee.joinDate)}`}
        breadcrumbs={[
          { label: 'Employees', href: '/admin/employees' },
          { label: employee.fullName },
        ]}
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-border">
              <span className="text-xs text-text-secondary font-medium">Account:</span>
              <Badge
                variant={employee.status === 'active' ? 'green' : 'gray'}
                size="sm"
              >
                {employee.status}
              </Badge>
              <Toggle
                checked={employee.status === 'active'}
                onChange={toggleActiveStatus}
                size="sm"
              />
            </div>
          </div>
        }
      />

      {/* KPI Performance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card padding="md">
          <p className="text-xs text-text-muted">Total Projects</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{totalHandled}</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {completedProjects.length} delivered
          </p>
        </Card>

        <Card padding="md">
          <p className="text-xs text-text-muted">Active Workload</p>
          <p className="text-2xl font-bold text-brand-700 mt-1">{activeProjects.length}</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {overdueProjects.length > 0 ? `${overdueProjects.length} overdue` : 'On track'}
          </p>
        </Card>

        <Card padding="md">
          <p className="text-xs text-text-muted">On-Time Delivery Rate</p>
          <div className="flex items-center gap-1.5 mt-1">
            <p className="text-2xl font-bold text-success-dark">{onTimeRate}%</p>
            <Award className="h-4 w-4 text-success" />
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">Performance index</p>
        </Card>

        <Card padding="md">
          <p className="text-xs text-text-muted">Open Inquiries / Doubts</p>
          <p className="text-2xl font-bold text-purple-dark mt-1">{openDoubts.length}</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {employeeDoubts.length} total submitted
          </p>
        </Card>
      </div>

      {/* Section Tabs: Overview & Projects vs. Work Sheet & Task Analytics */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white text-text-secondary border-border hover:bg-surface'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>Overview & Assigned Projects</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('worksheet')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
            activeTab === 'worksheet'
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white text-text-secondary border-border hover:bg-surface'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Work Sheet & Task Hours</span>
        </button>
      </div>

      {activeTab === 'worksheet' ? (
        <EmployeeWorksheetSection
          employeeId={employee.id}
          employeeName={employee.fullName}
          projects={allProjects.length > 0 ? allProjects : assignedProjects}
          clients={clients}
        />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Assigned Projects Portfolio */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="md">
            <CardHeader
              title="Assigned Projects"
              description="Deliverables currently managed or completed by this staff member"
            />

            {assignedProjects.length === 0 ? (
              <p className="text-sm text-text-muted py-8 text-center">
                No projects currently assigned to this employee.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {assignedProjects.map((proj) => {
                  const client = clientMap.get(proj.clientId)
                  const isLate = isOverdue(proj.deliveryDate, proj.status)

                  return (
                    <div
                      key={proj.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/projects/${proj.id}`}
                            className="font-semibold text-sm text-text-primary hover:text-brand-600 truncate"
                          >
                            {proj.name}
                          </Link>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              proj.status,
                            )}`}
                          >
                            {getStatusLabel(proj.status)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                              proj.priority,
                            )}`}
                          >
                            {getPriorityLabel(proj.priority)}
                          </span>
                        </div>

                        <p className="text-xs text-text-muted mt-1">
                          Client: <strong className="text-text-secondary">{client?.companyName}</strong> •{' '}
                          Role: {proj.primaryEmployeeId === empId ? 'Lead Manager' : 'Collaborator'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                        <div className="text-right text-xs">
                          <p className="text-text-muted">Deadline</p>
                          <p className={isLate ? 'text-danger font-semibold' : 'text-text-primary font-medium'}>
                            {formatDate(proj.deliveryDate)}
                          </p>
                        </div>

                        <Link href={`/admin/projects/${proj.id}`}>
                          <Button variant="secondary" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Submitted Doubts */}
          <Card padding="md">
            <CardHeader
              title="Recent Questions & Doubts"
              description="Inquiries submitted regarding active deliverables"
            />

            {employeeDoubts.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">
                No doubts submitted by this staff member.
              </p>
            ) : (
              <div className="space-y-3">
                {employeeDoubts.map((doubt) => (
                  <div
                    key={doubt.id}
                    className="p-3 rounded-lg border border-border bg-surface text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-primary">
                        {doubt.subject}
                      </span>
                      <Badge
                        variant={doubt.status === 'resolved' ? 'green' : 'amber'}
                        size="sm"
                      >
                        {doubt.status}
                      </Badge>
                    </div>
                    <p className="text-text-secondary">{doubt.description}</p>
                    {doubt.adminReply && (
                      <p className="text-brand-800 bg-brand-50 p-2 rounded text-[11px]">
                        <strong>Your Reply:</strong> {doubt.adminReply}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right (1 Col): Personal Profile & Compensation */}
        <div className="space-y-6">
          <Card padding="md">
            <CardHeader
              title="Staff Profile"
              description="Contact & compensation breakdown"
            />

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <Avatar name={employee.fullName} size="lg" />
                <div>
                  <h4 className="font-bold text-sm text-text-primary">{employee.fullName}</h4>
                  <p className="text-text-muted">{employee.designation}</p>
                </div>
              </div>

              <div>
                <p className="text-text-muted">Email Address</p>
                <a
                  href={`mailto:${employee.email}`}
                  className="font-medium text-brand-600 hover:underline mt-0.5 block"
                >
                  {employee.email}
                </a>
              </div>

              <div>
                <p className="text-text-muted">Phone Number</p>
                <a
                  href={`tel:${employee.phone}`}
                  className="font-medium text-text-primary hover:underline mt-0.5 block"
                >
                  {employee.phone}
                </a>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-text-muted">Employment Type</p>
                <p className="font-semibold text-text-primary mt-0.5 capitalize">
                  {employee.payType === 'salary'
                    ? 'Full-Time Salaried'
                    : employee.payType === 'intern'
                    ? 'Internship'
                    : 'Hourly Consultant'}
                </p>
              </div>

              <div>
                <p className="text-text-muted">Compensation Rate</p>
                <p className="font-bold text-base text-text-primary mt-0.5">
                  {formatCurrency(employee.payRate)}
                  <span className="text-xs font-normal text-text-muted ml-1">
                    {employee.payType === 'hourly' ? 'per hour' : 'per month'}
                  </span>
                </p>
              </div>

              {employee.notes && (
                <div className="pt-2 border-t border-border">
                  <p className="text-text-muted mb-1">Notes & Tool Proficiencies</p>
                  <p className="text-text-secondary bg-surface p-2.5 rounded-lg border border-border leading-relaxed">
                    {employee.notes}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Credentials & Access Security (Admin Exclusive Control) */}
          <Card padding="md">
            <CardHeader
              title="Credentials & Security"
              description="Admin-managed account credentials"
            />

            <div className="space-y-3 text-xs">
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Administrators decide and manage employee passwords. Staff members cannot self-change login credentials.
                </p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="w-full flex items-center justify-center gap-2 font-medium"
                onClick={() => {
                  setPasswordError('')
                  setPasswordSuccess('')
                  setNewPassword('')
                  setIsPasswordModalOpen(true)
                }}
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Reset Staff Password</span>
              </Button>
            </div>
          </Card>
        </div>
      </div>
      )}

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={`Change Password for ${employee.fullName}`}
        description="Set a new login password for this employee account"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={isUpdatingPassword}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleUpdatePassword}
              isLoading={isUpdatingPassword}
            >
              Save New Password
            </Button>
          </>
        }
      >
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          {passwordSuccess && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-lg bg-danger-light border border-danger/30 text-danger-dark text-xs font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{passwordError}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1.5">
              New Password (minimum 6 characters)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full h-10 rounded-lg border border-border bg-white pl-3 pr-10 text-xs text-text-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-text-secondary cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[11px] text-text-muted mt-1.5">
              Provide this updated password to the team member so they can sign in.
            </p>
          </div>
        </form>
      </Modal>
    </ContentWrapper>
  )
}
