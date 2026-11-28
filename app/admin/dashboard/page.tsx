'use client'

// app/admin/dashboard/page.tsx
// Admin Dashboard — Real API data integration with loading skeletons and 0-data screens.

import { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card,
  CardHeader,
  Badge,
  Button,
  PageLoader,
  MetricCardSkeleton,
  TableSkeleton,
  CardSkeleton,
  EmptyState,
} from '@/components/ui'
import { api } from '@/lib/api'
import type {
  Project,
  Client,
  Employee,
  FollowUp,
  Doubt,
  AppNotification,
  LeaveRequest,
  PermissionRequest,
} from '@/lib/types'
import {
  AlertTriangle,
  Calendar,
  MessageCircle,
  Phone,
  Briefcase,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  CalendarOff,
  FileCheck,
} from 'lucide-react'
import {
  formatDate,
  formatRelativeTime,
  getStatusLabel,
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
  getDaysUntil,
  isOverdue,
  formatCurrency,
} from '@/lib/utils'

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminDashboardContent />
    </Suspense>
  )
}

function AdminDashboardContent() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [followups, setFollowups] = useState<FollowUp[]>([])
  const [doubts, setDoubts] = useState<Doubt[]>([])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRequest[]>([])
  const [pendingPermissions, setPendingPermissions] = useState<PermissionRequest[]>([])

  useEffect(() => {
    let mounted = true

    Promise.allSettled([
      api.projects.list({ limit: 100 }),
      api.clients.list({ limit: 100 }),
      api.employees.list(),
      api.followups.list({ limit: 50 }),
      api.notifications.list(),
      api.hrms.getLeaves({ status: 'pending' }),
      api.hrms.getPermissions({ status: 'pending' }),
    ])
      .then(([projRes, clientRes, empRes, fuRes, notifRes, leaveRes, permRes]) => {
        if (!mounted) return

        if (projRes.status === 'fulfilled') {
          const list = projRes.value?.projects || []
          setProjects(list)
          // Fetch open doubts across projects if needed
        }
        if (clientRes.status === 'fulfilled') {
          setClients(clientRes.value?.clients || [])
        }
        if (empRes.status === 'fulfilled') {
          setEmployees(empRes.value || [])
        }
        if (fuRes.status === 'fulfilled') {
          setFollowups(fuRes.value?.followups || [])
        }
        if (notifRes.status === 'fulfilled') {
          setNotifications(notifRes.value || [])
        }
        if (leaveRes.status === 'fulfilled') {
          setPendingLeaves(leaveRes.value || [])
        }
        if (permRes.status === 'fulfilled') {
          setPendingPermissions(permRes.value || [])
        }
      })
      .catch((err) => {
        if (mounted) setError(err?.message || 'Failed to connect to backend server')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // Dynamic calculations from real API data
  const activeProjects = useMemo(
    () => (Array.isArray(projects) ? projects.filter((p) => p && p.status !== 'delivered') : []),
    [projects],
  )
  const overdueProjects = useMemo(
    () => activeProjects.filter((p) => p && isOverdue(p.deliveryDate, p.status)),
    [activeProjects],
  )
  const upcomingProjects = useMemo(
    () =>
      activeProjects.filter((p) => {
        if (!p) return false
        const days = getDaysUntil(p.deliveryDate)
        return days >= 0 && days <= 7
      }),
    [activeProjects],
  )
  const openDoubts = useMemo(
    () => (Array.isArray(doubts) ? doubts.filter((d) => d && d.status === 'open') : []),
    [doubts],
  )
  const pendingFollowups = useMemo(
    () => (Array.isArray(followups) ? followups.filter((f) => f && f.status === 'pending') : []),
    [followups],
  )

  // Fast map joins
  const clientMap = useMemo(
    () => new Map(Array.isArray(clients) ? clients.map((c) => [c.id || (c as any)._id, c]) : []),
    [clients],
  )
  const employeeMap = useMemo(
    () => new Map(Array.isArray(employees) ? employees.map((e) => [e.id || (e as any)._id, e]) : []),
    [employees],
  )

  const statCards = [
    {
      label: 'Overdue Projects',
      value: overdueProjects.length,
      icon: AlertTriangle,
      color: 'text-danger',
      bg: 'bg-danger-light',
      link: '/admin/projects?filter=overdue',
    },
    {
      label: 'Due Within 7 Days',
      value: upcomingProjects.length,
      icon: Calendar,
      color: 'text-warning-dark',
      bg: 'bg-warning-light',
      link: '/admin/projects?filter=upcoming',
    },
    {
      label: 'Unread / Open Doubts',
      value: openDoubts.length,
      icon: MessageCircle,
      color: 'text-brand-700',
      bg: 'bg-brand-100',
      link: '/admin/projects',
    },
    {
      label: 'Follow-ups Pending',
      value: pendingFollowups.length,
      icon: Phone,
      color: 'text-success-dark',
      bg: 'bg-success-light',
      link: '/admin/followups',
    },
    {
      label: 'Active Projects',
      value: activeProjects.length,
      icon: Briefcase,
      color: 'text-purple-dark',
      bg: 'bg-purple-light',
      link: '/admin/projects',
    },
  ]

  const urgentAttentionProjects = useMemo(
    () => [...overdueProjects, ...upcomingProjects].slice(0, 5),
    [overdueProjects, upcomingProjects],
  )

  return (
    <ContentWrapper>
      <PageHeader
        title="Admin Dashboard"
        description="Here is the live snapshot of your marketing agency operations today."
        action={
          <div className="flex items-center gap-2">
            <Link href="/admin/clients/new">
              <Button variant="secondary" size="sm">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Client</span>
              </Button>
            </Link>
            <Link href="/admin/projects/new">
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </Button>
            </Link>
          </div>
        }
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-danger-light border border-danger/30 text-danger-dark flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* 5 KPI Stat Cards — Skeletons during loading */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => <MetricCardSkeleton key={i} />)
          : statCards.map((card) => {
              const Icon = card.icon
              return (
                <Link key={card.label} href={card.link}>
                  <Card padding="md" hover className="h-full">
                    <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-3`}>
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <p className="text-2xl font-bold text-text-primary">{card.value}</p>
                    <p className="text-xs text-text-muted mt-0.5 leading-snug">
                      {card.label}
                    </p>
                  </Card>
                </Link>
              )
            })}
      </div>

      {/* Main Grid: Projects Needing Attention + Sidebar Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Column (2 Cols): Projects needing attention & Open doubts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Projects Needing Immediate Attention */}
          <Card padding="md">
            <CardHeader
              title="Projects Needing Attention"
              description="Overdue tasks and deadlines due this week"
              action={
                <Link
                  href="/admin/projects"
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
                >
                  View all projects <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />

            {loading ? (
              <TableSkeleton rows={3} cols={3} />
            ) : urgentAttentionProjects.length === 0 ? (
              <div className="py-10 text-center text-sm text-text-muted">
                <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-text-primary">All Clear</p>
                <p className="text-xs text-text-muted mt-1">
                  All projects are on track! No overdue or urgent deadlines.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {urgentAttentionProjects.map((proj) => {
                  const projId = proj.id || (proj as any)._id
                  const client = (proj as any).client || clientMap.get(proj.clientId)
                  const primaryEmp = (proj as any).primaryEmployee || (proj.primaryEmployeeId ? employeeMap.get(proj.primaryEmployeeId) : null)
                  const isLate = isOverdue(proj.deliveryDate, proj.status)
                  const daysLeft = getDaysUntil(proj.deliveryDate)

                  return (
                    <div
                      key={projId}
                      className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/projects/${projId}`}
                            className="text-sm font-semibold text-text-primary hover:text-brand-600 truncate"
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

                        <div className="flex items-center gap-3 text-xs text-text-secondary mt-1 flex-wrap">
                          <span>
                            Client:{' '}
                            <strong className="text-text-primary">
                              {client?.companyName || 'Unknown Client'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Assigned:{' '}
                            <strong className="text-text-primary">
                              {primaryEmp?.fullName || 'Unassigned'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Budget:{' '}
                            <strong className="text-text-primary">
                              {formatCurrency(proj.budget)}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-text-muted">Delivery Date</p>
                          <p
                            suppressHydrationWarning
                            className={`text-xs font-semibold ${
                              isLate ? 'text-danger' : 'text-text-primary'
                            }`}
                          >
                            {formatDate(proj.deliveryDate)}
                            {isLate
                              ? ' (Overdue)'
                              : daysLeft <= 3
                              ? ` (${daysLeft}d left)`
                              : ''}
                          </p>
                        </div>

                        <Link href={`/admin/projects/${proj.id}`}>
                          <Button variant="secondary" size="sm">
                            Inspect
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Open Doubts Raised by Employees */}
          <Card padding="md">
            <CardHeader
              title="Doubts Raised by Employees"
              description="Internal inquiries blocking team progress"
            />

            {loading ? (
              <CardSkeleton rows={2} />
            ) : openDoubts.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                <MessageCircle className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="font-medium text-text-primary">No Open Doubts</p>
                <p className="mt-0.5">Your team has no blockers or unresolved questions right now.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {openDoubts.map((doubt) => {
                  const emp = employeeMap.get(doubt.raisedById)
                  const proj = projects.find((p) => p.id === doubt.projectId)

                  return (
                    <div
                      key={doubt.id}
                      className="p-3.5 rounded-xl border border-border bg-surface text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-text-primary">
                            {doubt.subject}
                          </p>
                          <p className="text-text-muted text-[11px] mt-0.5">
                            Raised by{' '}
                            <strong className="text-text-secondary">
                              {emp?.fullName || 'Employee'}
                            </strong>{' '}
                            on <span className="font-medium">{proj?.name || 'Project'}</span> •{' '}
                            {formatRelativeTime(doubt.createdAt)}
                          </p>
                        </div>
                        <Badge
                          variant={doubt.priority === 'urgent' ? 'red' : 'amber'}
                          size="sm"
                        >
                          {doubt.priority}
                        </Badge>
                      </div>

                      <p className="text-text-secondary leading-relaxed bg-white p-2.5 rounded-lg border border-border/60">
                        {doubt.description}
                      </p>

                      <div className="flex justify-end pt-1">
                        <Link href={`/admin/projects/${doubt.projectId}`}>
                          <Button variant="primary" size="sm">
                            <MessageCircle className="h-3.5 w-3.5" />
                            Reply to Doubt
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: HRMS Approvals, Follow-ups & Recent Notifications */}
        <div className="space-y-6">
          {/* Pending Leave & Permission Requests */}
          <Card padding="md">
            <CardHeader
              title="Leave & Permission Approvals"
              description="Pending staff HRMS requests"
              action={
                <Link
                  href="/admin/hrms"
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
                >
                  Open HRMS <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />

            {loading ? (
              <CardSkeleton rows={2} />
            ) : pendingLeaves.length === 0 && pendingPermissions.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-muted">
                <CalendarOff className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                <p className="font-medium text-text-primary">All HRMS Requests Reviewed</p>
                <p className="mt-0.5">No pending leave or permission applications right now.</p>
              </div>
            ) : (
              <div className="space-y-2.5 text-xs">
                {pendingLeaves.slice(0, 3).map((l) => {
                  const empName =
                    l.employeeName || employeeMap.get(l.userId)?.fullName || 'Team Member'
                  return (
                    <div
                      key={l.id}
                      className="p-2.5 rounded-lg border border-amber-200/80 bg-amber-50/40 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-text-primary inline-flex items-center gap-1.5">
                          <CalendarOff className="h-3.5 w-3.5 text-amber-600" />
                          <span>{empName}</span>
                        </span>
                        <Badge variant="amber" size="sm">
                          Leave
                        </Badge>
                      </div>
                      <p className="text-[11px] text-text-secondary capitalize">
                        {l.type} Leave • {formatDate(l.startDate)} – {formatDate(l.endDate)}
                      </p>
                      <div className="flex justify-end pt-1">
                        <Link
                          href="/admin/hrms?tab=leaves"
                          className="text-[11px] font-semibold text-brand-600 hover:underline"
                        >
                          Review & Approve →
                        </Link>
                      </div>
                    </div>
                  )
                })}

                {pendingPermissions.slice(0, 2).map((p) => {
                  const empName =
                    p.employeeName || employeeMap.get(p.userId)?.fullName || 'Team Member'
                  return (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-lg border border-border bg-surface space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-text-primary inline-flex items-center gap-1.5">
                          <FileCheck className="h-3.5 w-3.5 text-brand-600" />
                          <span>{empName}</span>
                        </span>
                        <Badge variant="blue" size="sm">
                          Permission
                        </Badge>
                      </div>
                      <p className="text-[11px] text-text-secondary">
                        {formatDate(p.date)}
                        {p.fromTime ? ` • ${p.fromTime}–${p.toTime || ''}` : ''}
                      </p>
                      <div className="flex justify-end pt-1">
                        <Link
                          href="/admin/hrms?tab=permissions"
                          className="text-[11px] font-semibold text-brand-600 hover:underline"
                        >
                          Review & Approve →
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Scheduled Client Follow-ups */}
          <Card padding="md">
            <CardHeader
              title="Client Follow-ups"
              description="Calls & scheduled check-ins"
              action={
                <Link
                  href="/admin/followups"
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
                >
                  All <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />

            {loading ? (
              <CardSkeleton rows={3} />
            ) : pendingFollowups.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                <Phone className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                <p className="font-medium text-text-primary">0 Pending Follow-ups</p>
                <p className="mt-0.5">No upcoming calls or meetings scheduled.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingFollowups.slice(0, 5).map((fu) => {
                  const client = clientMap.get(fu.clientId)
                  const assigned =
                    fu.assignedToId === 'admin'
                      ? 'Admin (You)'
                      : employeeMap.get(fu.assignedToId)?.fullName || 'Staff'

                  return (
                    <div
                      key={fu.id}
                      className="p-3 rounded-lg border border-border bg-surface text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary truncate">
                          {client?.companyName || 'Client'}
                        </span>
                        <span className="text-[11px] text-text-muted flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(fu.scheduledAt)}
                        </span>
                      </div>

                      {fu.notes && (
                        <p className="text-text-secondary line-clamp-2">{fu.notes}</p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[11px] text-text-muted">
                        <span>
                          Owner:{' '}
                          <strong className="text-text-secondary">{assigned}</strong>
                        </span>
                        <Badge variant="green" size="sm">
                          Pending
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Recent System Activity */}
          <Card padding="md">
            <CardHeader
              title="Recent Activity"
              description="Notifications and system audit trail"
            />

            {loading ? (
              <CardSkeleton rows={3} />
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                <AlertCircle className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                <p className="font-medium text-text-primary">No Recent Activity</p>
                <p className="mt-0.5">Activity and alerts will appear here in real-time.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.slice(0, 4).map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-2.5 text-xs pb-3 border-b border-border last:border-b-0 last:pb-0"
                  >
                    <div className="p-1.5 rounded-full bg-brand-50 text-brand-600 mt-0.5 flex-shrink-0">
                      <AlertCircle className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-text-primary leading-tight">
                        {n.title}
                      </p>
                      <p className="text-text-muted text-[11px] mt-0.5 leading-snug">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-text-muted mt-1">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </ContentWrapper>
  )
}
