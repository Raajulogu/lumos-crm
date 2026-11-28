'use client'

// app/employee/dashboard/page.tsx
// Employee Dashboard — Actionable Tasks with Search, Real Project Names, Follow-up Evaluation, & AFFIXX Workspace Model.

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react'
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
} from '@/components/ui'
import {
  SearchBar,
  AffixxDashboardWidget,
  FollowUpEvaluationModal,
} from '@/components/common'
import { api } from '@/lib/api'
import type { Project, Client, FollowUp, FollowUpEvaluation, ProjectTask } from '@/lib/types'
import {
  Briefcase,
  AlertTriangle,
  Calendar,
  Phone,
  ArrowRight,
  AlertCircle,
  Clock,
  Play,
  Square,
  ListTodo,
  Plus,
  Check,
  Lock,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useTaskTimer } from '@/lib/task-timer-context'
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
  const { currentUser } = useAuth()
  const {
    activePunch,
    elapsedSeconds,
    openStopModal,
    startTaskTimer,
    pendingAutoClose,
    openAutoCloseModal,
  } = useTaskTimer()

  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [followups, setFollowups] = useState<FollowUp[]>([])
  const [myTasks, setMyTasks] = useState<ProjectTask[]>([])
  const [taskSearch, setTaskSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [evaluatingFollowUp, setEvaluatingFollowUp] = useState<FollowUp | null>(null)

  useEffect(() => {
    let mounted = true

    Promise.allSettled([
      api.projects.list({ limit: 100 }),
      api.clients.list({ limit: 100 }).catch(() => ({ clients: [] })),
      api.followups.list({ limit: 50 }),
      api.tasks.listMyAssigned(),
    ])
      .then(([projRes, clientRes, fuRes, taskRes]) => {
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

        if (taskRes.status === 'fulfilled') {
          setMyTasks(taskRes.value || [])
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // Listen for timer events to refresh tasks list
  useEffect(() => {
    const handlePunchEvent = () => {
      api.tasks.listMyAssigned().then((tasks) => setMyTasks(tasks)).catch(() => {})
    }
    window.addEventListener('crm_punch_stopped', handlePunchEvent)
    window.addEventListener('crm_punch_started', handlePunchEvent)
    return () => {
      window.removeEventListener('crm_punch_stopped', handlePunchEvent)
      window.removeEventListener('crm_punch_started', handlePunchEvent)
    }
  }, [])

  // Assigned projects from backend (backend automatically scopes to logged-in employee)
  const myProjects = useMemo(() => {
    return Array.isArray(projects) ? projects : []
  }, [projects])

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

  // Filter follow-ups respected by Admin visibility controls & ownership
  const myFollowUps = useMemo(() => {
    if (!Array.isArray(followups)) return []
    return followups.filter((f) => {
      if (!f || f.status !== 'pending') return false
      if (f.isVisibleToEmployee === false) return false
      if (currentUser.role !== 'admin' && currentUser.id && f.assignedToId) {
        return f.assignedToId === currentUser.id
      }
      return true
    })
  }, [followups, currentUser.id, currentUser.role])

  // Map clients safely: employee only gets client name and company name (no email, phone, or address)
  const clientMap = useMemo(
    () =>
      new Map(
        (Array.isArray(clients) ? clients : []).map((c) => [
          c.id || (c as unknown as { _id?: string })._id || '',
          { name: c.fullName, company: c.companyName },
        ]),
      ),
    [clients],
  )

  // Resolve real Project Name + Client Company cleanly for any task (no generic "Campaign Workspace")
  const getTaskProjectDisplay = useCallback(
    (task: ProjectTask): string => {
      const rawProjId = task.projectId as unknown as
        | string
        | { id?: string; _id?: string; name?: string }
      const tid =
        typeof rawProjId === 'object' && rawProjId !== null
          ? rawProjId.id || rawProjId._id
          : rawProjId
      const matchedProj = myProjects.find((p) => p.id === tid)
      const projName =
        matchedProj?.name ||
        (typeof rawProjId === 'object' && rawProjId !== null ? rawProjId.name : undefined) ||
        task.projectName ||
        'Assigned Project'

      const clientFromProj = matchedProj
        ? (matchedProj as unknown as { client?: { companyName?: string } }).client?.companyName ||
          clientMap.get(matchedProj.clientId)?.company
        : undefined
      const companyName = clientFromProj || task.clientName || ''

      if (companyName && !projName.toLowerCase().includes(companyName.toLowerCase())) {
        return `${projName} (${companyName})`
      }
      return projName
    },
    [myProjects, clientMap],
  )

  const filteredTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase()
    if (!q) return myTasks
    return myTasks.filter((task) => {
      const projLabel = getTaskProjectDisplay(task).toLowerCase()
      return (
        task.title.toLowerCase().includes(q) ||
        (task.description || '').toLowerCase().includes(q) ||
        projLabel.includes(q)
      )
    })
  }, [myTasks, taskSearch, getTaskProjectDisplay])

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

  function handleFollowUpEvaluated(followupId: string, evaluation: FollowUpEvaluation) {
    setFollowups((prev) =>
      prev.map((f) => (f.id === followupId ? { ...f, status: 'done', evaluation } : f)),
    )
  }

  const activeEmployeeName = currentUser.fullName || 'Team Member'
  const activeEmployeeRole = currentUser.designation || 'Specialist'

  return (
    <ContentWrapper>
      <PageHeader
        title={`Welcome, ${activeEmployeeName}!`}
        description={`${activeEmployeeRole} • Active assignments, deadline tracking, and client doubts.`}
        action={
          <div className="flex items-center gap-2">
            <Link href="/employee/tasks?action=add">
              <Button variant="secondary" size="sm">
                <Plus className="h-4 w-4" />
                <span>Add Task</span>
              </Button>
            </Link>
            <Link href="/employee/projects">
              <Button variant="primary" size="sm">
                <Briefcase className="h-4 w-4" />
                <span>My Projects</span>
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

      {/* Pending 8-Hour Auto-Punch Update Reminder */}
      {pendingAutoClose && (
        <div className="mb-6 p-4 rounded-2xl bg-warning-light/70 border border-warning/40 text-warning-dark flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-start gap-2.5 text-xs">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                Task Auto-Punched at 8-Hour Limit: {pendingAutoClose.taskTitle}
              </p>
              <p className="mt-0.5">
                Please submit a brief progress update and status for your 8-hour work block.
              </p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={openAutoCloseModal}>
            Submit Work Update
          </Button>
        </div>
      )}

      {/* Live Work Session Banner (if timer is active) */}
      {activePunch && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-300 flex items-center justify-between flex-wrap gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <div>
              <p className="text-xs font-bold text-emerald-950">
                Work Session Active: <span className="underline">{activePunch.taskTitle}</span>
              </p>
              <p className="text-[11px] text-emerald-800">
                {activePunch.projectName ? `Project: ${activePunch.projectName} • ` : ''}
                Auto-punches at 8h limit • Logging to your work timesheet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-emerald-950 bg-white px-3 py-1 rounded-lg border border-emerald-300 shadow-xs">
              {Math.floor(elapsedSeconds / 3600).toString().padStart(2, '0')}:
              {Math.floor((elapsedSeconds % 3600) / 60).toString().padStart(2, '0')}:
              {(elapsedSeconds % 60).toString().padStart(2, '0')}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={openStopModal}
              className="bg-white border-emerald-300 text-rose-700 hover:bg-rose-50"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              <span>Stop & Log Session</span>
            </Button>
          </div>
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
        {/* Left Column (2 Cols): Actionable Tasks & Assigned Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Actionable Tasks & Punch Timers with Search Bar */}
          <Card padding="md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary">My Actionable Tasks</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Direct deliverables delegated to you across active projects
                </p>
              </div>
              <SearchBar
                value={taskSearch}
                onChange={setTaskSearch}
                placeholder="Search tasks or project..."
                className="w-full sm:w-64"
              />
            </div>

            {loading ? (
              <TableSkeleton rows={3} cols={3} />
            ) : filteredTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-text-muted">
                <ListTodo className="h-8 w-8 text-slate-300 mx-auto mb-1.5" />
                <p className="font-semibold text-text-primary">
                  {taskSearch ? 'No matching tasks found' : '0 Actionable Tasks'}
                </p>
                <p className="mt-0.5">
                  {taskSearch
                    ? `No tasks matched "${taskSearch}".`
                    : 'You have no pending tasks assigned. Review your project workspaces or add a task.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {(taskSearch ? filteredTasks : filteredTasks.slice(0, 6)).map((task) => {
                  const isTaskActive = activePunch?.taskId === task.id
                  const projectLabel = getTaskProjectDisplay(task)

                  return (
                    <div
                      key={task.id}
                      className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-text-primary truncate">
                            {task.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              task.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : task.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : task.status === 'review'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-xs text-text-muted mt-0.5 truncate">
                          Project: <strong className="text-text-secondary">{projectLabel}</strong> • Logged: {task.totalLoggedMinutes || 0}m
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {isTaskActive ? (
                          <button
                            type="button"
                            onClick={openStopModal}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-rose-600 text-white font-semibold text-xs transition-colors cursor-pointer"
                          >
                            <Square className="h-3.5 w-3.5 fill-current" />
                            <span>Stop Timer</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              startTaskTimer({
                                id: task.id,
                                title: task.title,
                                projectId: task.projectId,
                                projectName: projectLabel,
                              })
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>Start Work Timer</span>
                          </button>
                        )}

                        <Link href={`/employee/projects/${task.projectId}`}>
                          <Button variant="ghost" size="sm">
                            Workspace
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

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
                  const projId = proj.id || (proj as unknown as { _id?: string })._id || ''
                  const client = (proj as unknown as { client?: { company?: string; companyName?: string } }).client || clientMap.get(proj.clientId)
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
                              {client?.company || (client as { companyName?: string })?.companyName || (proj as unknown as { clientName?: string }).clientName || 'Client'}
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

                        <Link href={`/employee/projects/${projId}`}>
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

        {/* Right Column: Pending Follow-ups + AFFIXX Dashboard Model */}
        <div className="space-y-6">
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
                  const hideNotes = fu.hideDetailsFromEmployee === true

                  return (
                    <div
                      key={fu.id}
                      className="p-3 rounded-lg border border-border bg-surface text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-text-primary truncate">
                          {client?.company || 'Client'}
                        </span>
                        <span className="text-[11px] text-text-muted flex items-center gap-1 whitespace-nowrap">
                          <Clock className="h-3 w-3" />
                          {formatDate(fu.scheduledAt)}
                        </span>
                      </div>

                      {hideNotes ? (
                        <p className="text-[11px] text-text-muted italic flex items-center gap-1">
                          <Lock className="h-3 w-3" />
                          <span>Call details restricted by Admin</span>
                        </p>
                      ) : (
                        fu.notes && (
                          <p className="text-text-secondary line-clamp-2">{fu.notes}</p>
                        )
                      )}

                      <div className="flex items-center justify-between pt-1.5 border-t border-border/60 gap-2">
                        <Badge variant="amber" size="sm">
                          Pending
                        </Badge>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => setEvaluatingFollowUp(fu)}
                        >
                          <Check className="h-3 w-3 text-success" />
                          <span>Done & Evaluate</span>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* AFFIXX Workspace & HRMS Overview Widget */}
          <AffixxDashboardWidget tasks={myTasks} />
        </div>
      </div>

      {/* Follow-up Evaluation Modal */}
      {evaluatingFollowUp && (
        <FollowUpEvaluationModal
          followUp={evaluatingFollowUp}
          clientCompanyName={clientMap.get(evaluatingFollowUp.clientId)?.company}
          employeeName={currentUser.fullName}
          isOpen={!!evaluatingFollowUp}
          onClose={() => setEvaluatingFollowUp(null)}
          onSubmitted={handleFollowUpEvaluated}
        />
      )}
    </ContentWrapper>
  )
}
