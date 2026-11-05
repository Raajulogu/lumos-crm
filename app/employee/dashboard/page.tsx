'use client'

// app/employee/dashboard/page.tsx
// Employee Dashboard — overview of assigned work, deadlines, doubts, and follow-ups.

import { Suspense } from 'react'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, Badge, Button, PageLoader } from '@/components/ui'
import { mockProjects, mockDoubts, mockFollowUps, mockClients } from '@/lib/mock-data'
import {
  Briefcase,
  AlertTriangle,
  Calendar,
  MessageCircle,
  Phone,
  ArrowRight,
} from 'lucide-react'
import {
  formatDate,
  getStatusLabel,
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
  getDaysUntil,
  isOverdue,
} from '@/lib/utils'

export default function EmployeeDashboardPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EmployeeDashboardContent />
    </Suspense>
  )
}

function EmployeeDashboardContent() {
  // Mock current employee is emp-1 (Priya Sharma)
  const currentEmpId = 'emp-1'

  // Filter projects assigned to this employee (primary or member)
  const myProjects = mockProjects.filter(
    (p) =>
      p.primaryEmployeeId === currentEmpId ||
      p.additionalMemberIds.includes(currentEmpId),
  )

  const activeProjects = myProjects.filter((p) => p.status !== 'delivered')
  const overdueProjects = activeProjects.filter((p) =>
    isOverdue(p.deliveryDate, p.status),
  )
  const upcomingDeadlines = activeProjects.filter((p) => {
    const days = getDaysUntil(p.deliveryDate)
    return days >= 0 && days <= 7
  })

  const myDoubts = mockDoubts.filter((d) => d.raisedById === currentEmpId)
  const openDoubts = myDoubts.filter((d) => d.status === 'open')

  const myFollowUps = mockFollowUps.filter(
    (f) => f.assignedToId === currentEmpId && f.status === 'pending',
  )

  const statCards = [
    {
      label: 'My Active Projects',
      value: activeProjects.length,
      icon: Briefcase,
      color: 'text-brand-700',
      bg: 'bg-brand-100',
    },
    {
      label: 'Overdue Deliveries',
      value: overdueProjects.length,
      icon: AlertTriangle,
      color: 'text-danger',
      bg: 'bg-danger-light',
    },
    {
      label: 'Due in 7 Days',
      value: upcomingDeadlines.length,
      icon: Calendar,
      color: 'text-warning-dark',
      bg: 'bg-warning-light',
    },
    {
      label: 'Open Doubts',
      value: openDoubts.length,
      icon: MessageCircle,
      color: 'text-purple-dark',
      bg: 'bg-purple-light',
    },
    {
      label: 'Pending Follow-ups',
      value: myFollowUps.length,
      icon: Phone,
      color: 'text-success-dark',
      bg: 'bg-success-light',
    },
  ]

  // Map clients safely: employee only gets client name and company name (no email, phone, or address)
  const clientMap = new Map(
    mockClients.map((c) => [c.id, { name: c.fullName, company: c.companyName }]),
  )

  return (
    <ContentWrapper>
      <PageHeader
        title="My Dashboard"
        description="Welcome back, Priya! Here are your active projects and tasks."
        action={
          <Link href="/employee/projects">
            <Button variant="primary" size="sm">
              <Briefcase className="h-4 w-4" />
              View All Projects
            </Button>
          </Link>
        }
      />

      {/* Top Stat Cards — Mobile: 2 cols, Tablet: 3 cols, Desktop: 5 cols */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label} padding="md" hover>
              <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-3`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-text-primary">{card.value}</p>
              <p className="text-xs text-text-muted mt-0.5 leading-snug">{card.label}</p>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Active Projects List — Takes 2 cols on desktop */}
        <div className="lg:col-span-2">
          <Card padding="md">
            <CardHeader
              title="Assigned Projects"
              description="Projects you are currently working on"
              action={
                <Link
                  href="/employee/projects"
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
                >
                  See all <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />

            <div className="divide-y divide-border">
              {myProjects.length === 0 ? (
                <p className="text-sm text-text-muted py-6 text-center">
                  No projects currently assigned to you.
                </p>
              ) : (
                myProjects.map((proj) => {
                  const client = clientMap.get(proj.clientId)
                  const daysLeft = getDaysUntil(proj.deliveryDate)
                  const isLate = isOverdue(proj.deliveryDate, proj.status)

                  return (
                    <div
                      key={proj.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-semibold text-text-primary truncate">
                            {proj.name}
                          </h4>
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

                        {/* Restricted Client Info (Name + Company Only) */}
                        <p className="text-xs text-text-secondary mt-1">
                          Client: <span className="font-medium text-text-primary">{client?.company || 'N/A'}</span>
                          {client?.name && ` (${client.name})`}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-text-muted">Deadline</p>
                          <p
                            suppressHydrationWarning
                            className={`text-xs font-medium ${
                              isLate ? 'text-danger' : 'text-text-primary'
                            }`}
                          >
                            {formatDate(proj.deliveryDate)}
                            {isLate && ' (Overdue)'}
                            {!isLate && daysLeft <= 3 && ` (${daysLeft}d left)`}
                          </p>
                        </div>

                        <Link href={`/employee/projects/${proj.id}`}>
                          <Button variant="secondary" size="sm">
                            Open
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar widgets: Doubts & Pending Follow-ups */}
        <div className="space-y-6">
          {/* Open Doubts Card */}
          <Card padding="md">
            <CardHeader
              title="My Doubts"
              description="Questions submitted to admin"
            />
            <div className="space-y-3">
              {openDoubts.length === 0 ? (
                <p className="text-xs text-text-muted py-2">
                  No open doubts pending.
                </p>
              ) : (
                openDoubts.map((doubt) => (
                  <div
                    key={doubt.id}
                    className="p-3 rounded-lg border border-border bg-surface text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-primary truncate">
                        {doubt.subject}
                      </span>
                      <Badge
                        variant={doubt.priority === 'urgent' ? 'red' : 'amber'}
                        size="sm"
                      >
                        {doubt.priority}
                      </Badge>
                    </div>
                    <p className="text-text-secondary line-clamp-2">
                      {doubt.description}
                    </p>
                    {doubt.adminReply && (
                      <div className="mt-2 pt-2 border-t border-border text-brand-700 bg-brand-50 p-2 rounded">
                        <p className="font-medium">Admin reply:</p>
                        <p className="line-clamp-2">{doubt.adminReply}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Pending Follow-ups */}
          <Card padding="md">
            <CardHeader
              title="Upcoming Follow-ups"
              description="Calls and client communications"
            />
            <div className="space-y-3">
              {myFollowUps.length === 0 ? (
                <p className="text-xs text-text-muted py-2">
                  No pending follow-ups.
                </p>
              ) : (
                myFollowUps.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg border border-border bg-surface text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-primary">
                        {formatDate(item.scheduledAt)}
                      </span>
                      <Badge variant="green" size="sm">
                        Pending
                      </Badge>
                    </div>
                    {item.notes && (
                      <p className="text-text-secondary line-clamp-2">
                        {item.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </ContentWrapper>
  )
}
