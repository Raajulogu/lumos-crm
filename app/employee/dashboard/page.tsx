'use client'

// app/employee/dashboard/page.tsx
// Employee Dashboard — Connected to live backend API with skeletons and 0-data screen.

import { useState, useMemo, useEffect, Suspense } from 'react'
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
  EmptyState,
} from '@/components/ui'
import { api } from '@/lib/api'
import type { Project, Client, Doubt, FollowUp } from '@/lib/types'
import {
  Briefcase,
  AlertTriangle,
  Calendar,
  MessageCircle,
  Phone,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
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
  const { currentUser, loginAs } = useAuth()
  const currentEmpId = currentUser.role === 'employee' ? currentUser.id : 'emp-1'
  const isDemoAdminPreview = currentUser.role === 'admin'

  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [followups, setFollowups] = useState<FollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    Promise.allSettled([
      api.projects.list({ limit: 100 }),
      api.clients.list({ limit: 100 }).catch(() => ({ clients: [] })),
      api.followups.list({ limit: 50 }),
    ])
      .then(([projRes, clientRes, fuRes]) => {
        if (!mounted) return

        if (projRes.status === 'fulfilled') {
          setProjects(projRes.value?.projects || [])
        } else {
          setError('Failed to fetch assigned deliverables from server')
        }

        if (clientRes.status === 'fulfilled') {
          setClients(clientRes.value?.clients || [])
        }

        if (fuRes.status === 'fulfilled') {
          setFollowups(fuRes.value?.followups || [])
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // Filter projects assigned to this employee (if employee token, backend already filters)
  const myProjects = useMemo(() => {
    return (Array.isArray(projects) ? projects : []).filter(
      (p) =>
        !p ? false :
        p.primaryEmployeeId === currentEmpId ||
        (Array.isArray(p.additionalMemberIds) && p.additionalMemberIds.includes(currentEmpId)) ||
        isDemoAdminPreview,
    )
  }, [projects, currentEmpId, isDemoAdminPreview])

  const activeProjects = useMemo(
    () => myProjects.filter((p) => p && p.status !== 'delivered'),
    [myProjects],
  )
  const overdueProjects = useMemo(
    () => activeProjects.filter((p) => p && isOverdue(p.deliveryDate, p.status)),
    [activeProjects],
  )
  const upcomingDeadlines = useMemo(
    () =>
      activeProjects.filter((p) => {
        if (!p) return false
        const days = getDaysUntil(p.deliveryDate)
        return days >= 0 && days <= 7
      }),
    [activeProjects],
  )

  const myFollowUps = useMemo(
    () =>
      (Array.isArray(followups) ? followups : []).filter(
        (f) =>
          !f ? false :
          (f.assignedToId === currentEmpId || isDemoAdminPreview) &&
          f.status === 'pending',
      ),
    [followups, currentEmpId, isDemoAdminPreview],
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
      label: 'Pending Follow-ups',
      value: myFollowUps.length,
      icon: Phone,
      color: 'text-success-dark',
      bg: 'bg-success-light',
    },
  ]

  // Map clients safely: employee only gets client name and company name (no email, phone, or address)
  const clientMap = useMemo(
    () =>
      new Map(
        (Array.isArray(clients) ? clients : []).map((c) => [c.id || (c as any)._id, { name: c.fullName, company: c.companyName }]),
      ),
    [clients],
  )

  const activeEmployeeName = isDemoAdminPreview ? 'Priya Sharma' : currentUser.fullName
  const activeEmployeeRole = isDemoAdminPreview
    ? 'Senior SEO & Content Lead'
    : currentUser.designation

  return (
    <ContentWrapper>
      {/* Administrator Preview Mode Notice */}
      {isDemoAdminPreview && (
        <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-blue-200 text-blue-900 px-2 py-0.5 rounded-full">
              Admin Preview
            </span>
            <span>
              You are previewing employee portal as <strong>Priya Sharma (SEO Lead)</strong>.
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loginAs('emp-2')}
              className="text-blue-700 hover:text-blue-900 font-semibold underline cursor-pointer"
            >
              Switch to Arjun Mehta (Ads Lead)
            </button>
            <span className="text-blue-300">•</span>
            <Link
              href="/admin/dashboard"
              className="text-blue-700 hover:text-blue-900 font-semibold underline"
            >
              Back to Admin Portal
            </Link>
          </div>
        </div>
      )}

      <PageHeader
        title={isDemoAdminPreview ? 'Staff Workspace' : `Welcome, ${activeEmployeeName}!`}
        description={`${activeEmployeeRole} • Active assignments, deadline tracking, and client doubts.`}
        action={
          <Link href="/employee/projects">
            <Button variant="primary" size="sm">
              <Briefcase className="h-4 w-4" />
              <span>My Projects</span>
            </Button>
          </Link>
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

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mb-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
          : statCards.map((card) => {
              const Icon = card.icon
              return (
                <Card key={card.label} padding="md" hover>
                  <div className={`inline-flex p-2 rounded-lg ${card.bg} mb-3`}>
                    <Icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <p className="text-2xl font-bold text-text-primary">{card.value}</p>
                  <p className="text-xs text-text-muted mt-0.5 leading-snug">
                    {card.label}
                  </p>
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
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />

            {loading ? (
              <TableSkeleton rows={4} cols={3} />
            ) : activeProjects.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted">
                <Briefcase className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-text-primary text-sm">
                  0 Active Projects Assigned
                </p>
                <p className="mt-1">
                  When new accounts are delegated by the Agency Director, they will appear here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {activeProjects.map((proj) => {
                  const projId = proj.id || (proj as any)._id
                  const client = (proj as any).client || clientMap.get(proj.clientId)
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
                            href={`/employee/projects/${projId}`}
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

                        <div className="flex items-center gap-3 text-xs text-text-secondary mt-1">
                          <span>
                            Client:{' '}
                            <strong className="text-text-primary">
                              {client?.company || client?.companyName || (proj as any).clientName || 'Client'}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-text-muted">Delivery Due</p>
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

                        <Link href={`/employee/projects/${proj.id}`}>
                          <Button variant="secondary" size="sm">
                            Open Workspace
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

        {/* Right Column: Pending Follow-ups */}
        <div>
          <Card padding="md">
            <CardHeader
              title="My Follow-ups"
              description="Calls & check-ins assigned to you"
              action={
                <Link
                  href="/employee/followups"
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium inline-flex items-center gap-1"
                >
                  All <ArrowRight className="h-3 w-3" />
                </Link>
              }
            />

            {loading ? (
              <TableSkeleton rows={3} cols={2} />
            ) : myFollowUps.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                <Phone className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                <p className="font-medium text-text-primary">0 Follow-ups Pending</p>
                <p className="mt-0.5">You have no upcoming client calls scheduled.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myFollowUps.map((fu) => {
                  const client = clientMap.get(fu.clientId)

                  return (
                    <div
                      key={fu.id}
                      className="p-3 rounded-lg border border-border bg-surface text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-text-primary truncate">
                          {client?.company || 'Client'}
                        </span>
                        <span className="text-[11px] text-text-muted flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(fu.scheduledAt)}
                        </span>
                      </div>

                      {fu.notes && (
                        <p className="text-text-secondary line-clamp-2">{fu.notes}</p>
                      )}

                      <div className="flex items-center justify-between pt-1 border-t border-border/60">
                        <Badge variant="green" size="sm">
                          Pending
                        </Badge>
                        <Link href="/employee/followups">
                          <Button variant="ghost" size="sm" className="h-6 text-[11px]">
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
        </div>
      </div>
    </ContentWrapper>
  )
}
