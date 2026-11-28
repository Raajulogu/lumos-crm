'use client'

// components/common/EmployeeWorksheetSection.tsx
// Admin-facing individual employee task worksheet, hours worked breakdown, punch timesheet, & CSV export.

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardHeader, Badge, Button, TableSkeleton, MetricCardSkeleton } from '@/components/ui'
import { SearchBar } from '@/components/common/SearchBar'
import { api } from '@/lib/api'
import type { Project, Client, EmployeeWorksheet, TaskStatus } from '@/lib/types'
import {
  Clock,
  CheckCircle2,
  ListTodo,
  History,
  Download,
  Calendar,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import {
  formatDate,
  formatDateTime,
  getPriorityColor,
  getPriorityLabel,
} from '@/lib/utils'

interface EmployeeWorksheetSectionProps {
  employeeId: string
  employeeName: string
  projects: Project[]
  clients: Client[]
}

type DatePreset = 'today' | 'week' | 'month' | 'all' | 'custom'

function toIsoDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getPresetRange(preset: DatePreset, customFrom: string, customTo: string): { from?: string; to?: string } {
  const now = new Date()
  if (preset === 'today') {
    const today = toIsoDate(now)
    return { from: today, to: today }
  }
  if (preset === 'week') {
    const start = new Date(now)
    start.setDate(now.getDate() - 6)
    return { from: toIsoDate(start), to: toIsoDate(now) }
  }
  if (preset === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: toIsoDate(start), to: toIsoDate(now) }
  }
  if (preset === 'custom') {
    return {
      from: customFrom || undefined,
      to: customTo || undefined,
    }
  }
  return {}
}

function formatDurationSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.round(totalSeconds))
  if (clamped === 0) return '0m'
  const hrs = Math.floor(clamped / 3600)
  const mins = Math.floor((clamped % 3600) / 60)
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`
  if (hrs > 0) return `${hrs}h`
  return `${Math.max(1, mins)}m`
}

function getTaskStatusBadge(status: TaskStatus) {
  switch (status) {
    case 'completed':
      return { variant: 'green' as const, label: 'Completed' }
    case 'in_progress':
      return { variant: 'blue' as const, label: 'In Progress' }
    case 'review':
      return { variant: 'purple' as const, label: 'In Review' }
    case 'blocked':
      return { variant: 'red' as const, label: 'Blocked' }
    default:
      return { variant: 'gray' as const, label: 'To Do' }
  }
}

function escapeCsvCell(val: string | number | undefined | null): string {
  const str = String(val ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function EmployeeWorksheetSection({
  employeeId,
  employeeName,
  projects,
  clients,
}: EmployeeWorksheetSectionProps) {
  const [preset, setPreset] = useState<DatePreset>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [activeView, setActiveView] = useState<'tasks' | 'punches'>('tasks')
  const [taskSearch, setTaskSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [worksheet, setWorksheet] = useState<EmployeeWorksheet | null>(null)

  const activeRange = useMemo(
    () => getPresetRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  )

  useEffect(() => {
    let mounted = true
    api.employees
      .getWorksheet(employeeId, activeRange, {
        projects,
        clients,
      })
      .then((data) => {
        if (mounted) setWorksheet(data)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [employeeId, activeRange, projects, clients])

  const reloadWorksheet = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.employees.getWorksheet(employeeId, activeRange, {
        projects,
        clients,
      })
      setWorksheet(data)
    } finally {
      setLoading(false)
    }
  }, [employeeId, activeRange, projects, clients])

  useEffect(() => {
    const handler = () => reloadWorksheet()
    window.addEventListener('crm_punch_started', handler)
    window.addEventListener('crm_punch_stopped', handler)
    return () => {
      window.removeEventListener('crm_punch_started', handler)
      window.removeEventListener('crm_punch_stopped', handler)
    }
  }, [reloadWorksheet])

  const filteredTasks = useMemo(() => {
    const tasks = worksheet?.tasks || []
    const q = taskSearch.trim().toLowerCase()
    if (!q) return tasks
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.projectName || '').toLowerCase().includes(q) ||
        (t.clientName || '').toLowerCase().includes(q),
    )
  }, [worksheet, taskSearch])

  const filteredPunches = useMemo(() => {
    const punches = worksheet?.punches || []
    const q = taskSearch.trim().toLowerCase()
    if (!q) return punches
    return punches.filter(
      (p) =>
        (p.taskTitle || '').toLowerCase().includes(q) ||
        (p.projectName || '').toLowerCase().includes(q) ||
        (p.notes || '').toLowerCase().includes(q),
    )
  }, [worksheet, taskSearch])

  function handleExportCsv() {
    if (!worksheet) return
    const headers = [
      'Employee',
      'Task Title',
      'Project',
      'Client',
      'Status',
      'Priority',
      'Estimated Hours',
      'Hours Worked',
      'Formatted Time',
      'Punch Sessions',
      'Last Worked',
      'Notes / Auto-Close Update',
    ]
    const rows = filteredTasks.map((t) => [
      employeeName,
      t.title,
      t.projectName || '',
      t.clientName || '',
      t.status,
      t.priority,
      t.estimatedHours ?? '',
      t.workedHours,
      formatDurationSeconds(t.workedSeconds),
      t.punchCount,
      t.lastWorkedAt ? formatDateTime(t.lastWorkedAt) : '',
      t.autoCloseUpdateText || '',
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const slug = employeeName.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    const dateTag = activeRange.from || 'all'
    link.href = url
    link.download = `${slug}-worksheet-${dateTag}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const summary = worksheet?.summary

  return (
    <Card padding="md">
      <CardHeader
        title="Work Sheet & Task Analytics"
        description={`Task completion metrics and exact time worked by ${employeeName}`}
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportCsv}
            disabled={!worksheet || filteredTasks.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        }
      />

      {/* Date Range Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-border">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom Range' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPreset(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                preset === opt.id
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-surface text-text-secondary hover:bg-slate-100 border border-border/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Calendar className="h-3.5 w-3.5 text-text-muted" />
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-8 rounded-lg border border-border bg-white px-2.5 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
              aria-label="Worksheet from date"
            />
            <span className="text-text-muted">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-8 rounded-lg border border-border bg-white px-2.5 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
              aria-label="Worksheet to date"
            />
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {loading || !summary ? (
          Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <div className="p-3.5 rounded-xl bg-surface border border-border/80">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Total Hours Worked</span>
                <Clock className="h-3.5 w-3.5 text-brand-600" />
              </div>
              <p className="text-xl font-bold text-text-primary">
                {formatDurationSeconds(summary.totalWorkedSeconds)}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {summary.totalWorkedHours.toFixed(2)} hrs logged
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-border/80">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Tasks Completed</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              </div>
              <p className="text-xl font-bold text-success-dark">
                {summary.tasksCompleted}
                <span className="text-xs font-normal text-text-muted ml-1">
                  / {summary.totalTasksAssigned}
                </span>
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {summary.totalTasksAssigned > 0
                  ? `${Math.round((summary.tasksCompleted / summary.totalTasksAssigned) * 100)}% completion`
                  : 'No tasks assigned'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-border/80">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Active / Pending</span>
                <ListTodo className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <p className="text-xl font-bold text-text-primary">
                {summary.tasksInProgress + summary.tasksTodo}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {summary.tasksInProgress} in progress • {summary.tasksTodo} to do
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-border/80">
              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                <span>Punch Sessions</span>
                <History className="h-3.5 w-3.5 text-purple-600" />
              </div>
              <p className="text-xl font-bold text-text-primary">
                {summary.totalPunchSessions}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {summary.autoPunchedCount > 0
                  ? `${summary.autoPunchedCount} auto-punched at 8h`
                  : 'All closed within limit'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Sub-navigation & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1 bg-surface p-1 rounded-lg border border-border w-fit">
          <button
            type="button"
            onClick={() => setActiveView('tasks')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeView === 'tasks'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Task Breakdown ({filteredTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveView('punches')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
              activeView === 'punches'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Punch Timesheet ({filteredPunches.length})
          </button>
        </div>

        <SearchBar
          value={taskSearch}
          onChange={setTaskSearch}
          placeholder="Search task, project, or notes..."
          className="sm:max-w-xs w-full"
        />
      </div>

      {/* Content View */}
      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : activeView === 'tasks' ? (
        filteredTasks.length === 0 ? (
          <div className="py-10 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
            <ListTodo className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-text-primary">No Tasks Found</p>
            <p className="mt-0.5">
              {taskSearch
                ? 'Try clearing your search filter.'
                : 'No tasks are assigned to this employee yet.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Task Worksheet Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {filteredTasks.map((t) => {
                const statusBadge = getTaskStatusBadge(t.status)
                return (
                  <div
                    key={t.taskId}
                    className="p-3.5 rounded-xl border border-border bg-white space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/projects/${t.projectId}`}
                          className="font-semibold text-sm text-text-primary hover:text-brand-600 inline-flex items-center gap-1"
                        >
                          <span>{t.title}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </Link>
                        <p className="text-[11px] text-text-muted truncate mt-0.5">
                          {t.projectName}
                          {t.clientName ? ` (${t.clientName})` : ''}
                        </p>
                      </div>
                      <Badge variant={statusBadge.variant} size="sm">
                        {statusBadge.label}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/70">
                      <div>
                        <p className="text-[10px] text-text-muted">Worked</p>
                        <p className="font-bold text-text-primary">
                          {formatDurationSeconds(t.workedSeconds)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-muted">Estimated</p>
                        <p className="font-medium text-text-secondary">
                          {t.estimatedHours ? `${t.estimatedHours}h` : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-text-muted">Punches</p>
                        <p className="font-medium text-text-secondary">{t.punchCount}</p>
                      </div>
                    </div>

                    {t.autoCloseUpdateText && (
                      <p className="p-2 rounded bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px]">
                        <strong>8h Auto-Close Update:</strong> {t.autoCloseUpdateText}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Desktop Task Worksheet Table */}
            <div className="hidden md:block overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs text-text-secondary">
                <thead className="bg-surface border-b border-border text-text-primary font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Task Deliverable</th>
                    <th className="py-3 px-3">Project / Client</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-center">Punches</th>
                    <th className="py-3 px-3 text-right">Est. vs Worked</th>
                    <th className="py-3 px-4 text-right">Last Activity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {filteredTasks.map((t) => {
                    const statusBadge = getTaskStatusBadge(t.status)
                    return (
                      <tr key={t.taskId} className="hover:bg-surface/50">
                        <td className="py-3 px-4">
                          <Link
                            href={`/admin/projects/${t.projectId}`}
                            className="font-semibold text-text-primary hover:text-brand-600 inline-flex items-center gap-1"
                          >
                            <span>{t.title}</span>
                            <ExternalLink className="h-3 w-3 flex-shrink-0 text-text-muted" />
                          </Link>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getPriorityColor(
                                t.priority,
                              )}`}
                            >
                              {getPriorityLabel(t.priority)}
                            </span>
                            {t.autoCloseUpdateText && (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px]"
                                title={t.autoCloseUpdateText}
                              >
                                <AlertTriangle className="h-2.5 w-2.5" />
                                <span>8h Update</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-text-primary truncate max-w-[200px]">
                            {t.projectName || 'Project'}
                          </p>
                          {t.clientName && (
                            <p className="text-[11px] text-text-muted truncate max-w-[200px]">
                              {t.clientName}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={statusBadge.variant} size="sm">
                            {statusBadge.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center font-medium text-text-primary">
                          {t.punchCount}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span className="font-bold text-text-primary">
                            {formatDurationSeconds(t.workedSeconds)}
                          </span>
                          <span className="text-text-muted ml-1">
                            {t.estimatedHours ? `/ ${t.estimatedHours}h` : ''}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-text-muted whitespace-nowrap">
                          {t.lastWorkedAt ? formatDate(t.lastWorkedAt) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )
      ) : filteredPunches.length === 0 ? (
        <div className="py-10 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
          <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="font-semibold text-text-primary">No Punch Logs In Selected Range</p>
          <p className="mt-0.5">
            Work punch sessions appear here once the employee starts a timer on an assigned task.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Punch Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredPunches.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-xl border border-border bg-white space-y-2 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-text-primary">
                      {p.taskTitle || 'Task'}
                    </p>
                    <p className="text-[11px] text-text-muted">{p.projectName || ''}</p>
                  </div>
                  <Badge variant={p.autoPunched ? 'amber' : 'blue'} size="sm">
                    {formatDurationSeconds(p.durationSeconds || 0)}
                  </Badge>
                </div>
                <p className="text-[11px] text-text-secondary">
                  {formatDateTime(p.startTime)} →{' '}
                  {p.endTime ? formatDateTime(p.endTime) : 'Active'}
                </p>
                {p.autoPunched && (
                  <p className="text-[10px] font-semibold text-amber-700">
                    Auto-punched at 8-hour limit
                  </p>
                )}
                {p.notes && (
                  <p className="p-2 rounded bg-surface border border-border/60 text-text-secondary">
                    {p.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Punch Table */}
          <div className="hidden md:block overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface border-b border-border text-text-primary font-semibold uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Task & Project</th>
                  <th className="py-3 px-3">Started</th>
                  <th className="py-3 px-3">Ended</th>
                  <th className="py-3 px-3 text-right">Duration</th>
                  <th className="py-3 px-4">Work Update / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {filteredPunches.map((p) => (
                  <tr key={p.id} className="hover:bg-surface/50">
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/projects/${p.projectId}`}
                        className="font-semibold text-text-primary hover:text-brand-600 block"
                      >
                        {p.taskTitle || 'Task'}
                      </Link>
                      <span className="text-[11px] text-text-muted">
                        {p.projectName || ''}
                      </span>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {formatDateTime(p.startTime)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {p.endTime ? (
                        formatDateTime(p.endTime)
                      ) : (
                        <Badge variant="green" size="sm">
                          Running
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span className="font-bold text-text-primary">
                        {formatDurationSeconds(p.durationSeconds || 0)}
                      </span>
                      {p.autoPunched && (
                        <span className="block text-[10px] font-semibold text-amber-700">
                          8h Auto-Punch
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-[260px]">
                      <p className="text-text-secondary line-clamp-2">
                        {p.notes || '—'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  )
}
