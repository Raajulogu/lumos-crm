'use client'

// app/admin/dashboard/page.tsx
// Admin Dashboard — Central command center with live mock metrics, quick actions, and activity feeds.

import { Suspense } from 'react'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, Badge, Button, PageLoader } from '@/components/ui'
import {
  mockProjects,
  mockClients,
  mockEmployees,
  mockDoubts,
  mockFollowUps,
  mockNotifications,
} from '@/lib/mock-data'
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
  // Dynamic metrics calculations
  const activeProjects = mockProjects.filter((p) => p.status !== 'delivered')
  const overdueProjects = activeProjects.filter((p) =>
    isOverdue(p.deliveryDate, p.status),
  )
  const upcomingProjects = activeProjects.filter((p) => {
    const days = getDaysUntil(p.deliveryDate)
    return days >= 0 && days <= 7
  })

  const openDoubts = mockDoubts.filter((d) => d.status === 'open')
  const pendingFollowups = mockFollowUps.filter((f) => f.status === 'pending')

  // Lookup maps for fast joining
  const clientMap = new Map(mockClients.map((c) => [c.id, c]))
  const employeeMap = new Map(mockEmployees.map((e) => [e.id, e]))

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

  // Priority Attention list: overdue + upcoming projects
  const urgentAttentionProjects = [...overdueProjects, ...upcomingProjects].slice(0, 5)

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

      {/* 5 KPI Stat Cards — Mobile: 2 cols, Tablet: 3 cols, Desktop: 5 cols */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.label} href={card.link}>
              <Card padding="md" hover className="h-full">
                <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-3`}>
                  <Icon className={`h-5 w-5 ${card.color}`} />
                </div>
                <p className="text-2xl font-bold text-text-primary">{card.value}</p>
                <p className="text-xs text-text-muted mt-0.5 leading-snug">{card.label}</p>
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

            {urgentAttentionProjects.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-muted">
                <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2 opacity-80" />
                All projects are on track! No overdue or urgent deadlines.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {urgentAttentionProjects.map((proj) => {
                  const client = clientMap.get(proj.clientId)
                  const primaryEmp = proj.primaryEmployeeId
                    ? employeeMap.get(proj.primaryEmployeeId)
                    : null
                  const isLate = isOverdue(proj.deliveryDate, proj.status)
                  const daysLeft = getDaysUntil(proj.deliveryDate)

                  return (
                    <div
                      key={proj.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/projects/${proj.id}`}
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
                            Client: <strong className="text-text-primary">{client?.companyName}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Assigned: <strong className="text-text-primary">{primaryEmp?.fullName || 'Unassigned'}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Budget: <strong className="text-text-primary">{formatCurrency(proj.budget)}</strong>
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
                            {isLate ? ' (Overdue)' : daysLeft <= 3 ? ` (${daysLeft}d left)` : ''}
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

            {openDoubts.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">
                No open doubts. Your team has no blockers right now.
              </p>
            ) : (
              <div className="space-y-3">
                {openDoubts.map((doubt) => {
                  const emp = employeeMap.get(doubt.raisedById)
                  const proj = mockProjects.find((p) => p.id === doubt.projectId)

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
                            Raised by <strong className="text-text-secondary">{emp?.fullName || 'Employee'}</strong> on{' '}
                            <span className="font-medium">{proj?.name}</span> •{' '}
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

        {/* Right Column: Follow-ups & Recent Notifications/Activity */}
        <div className="space-y-6">
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

            <div className="space-y-3">
              {pendingFollowups.length === 0 ? (
                <p className="text-xs text-text-muted py-4 text-center">
                  No pending follow-ups scheduled.
                </p>
              ) : (
                pendingFollowups.map((fu) => {
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
                          {client?.companyName}
                        </span>
                        <span className="text-[11px] text-text-muted flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(fu.scheduledAt)}
                        </span>
                      </div>

                      {fu.notes && (
                        <p className="text-text-secondary line-clamp-2">
                          {fu.notes}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-border/60 text-[11px] text-text-muted">
                        <span>Owner: <strong className="text-text-secondary">{assigned}</strong></span>
                        <Badge variant="green" size="sm">Pending</Badge>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>

          {/* Recent System Activity */}
          <Card padding="md">
            <CardHeader
              title="Recent Activity"
              description="Notifications and system audit trail"
            />

            <div className="space-y-3">
              {mockNotifications.slice(0, 4).map((n) => (
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
          </Card>
        </div>
      </div>
    </ContentWrapper>
  )
}
