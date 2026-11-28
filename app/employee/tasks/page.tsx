'use client'

// app/employee/tasks/page.tsx
// Employee Tasks & Add Task Hub — search, filter, click for full details, start/stop 8h work timer, and create tasks.

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card,
  Button,
  Input,
  Textarea,
  Modal,
  EmptyState,
  PageLoader,
  MetricCardSkeleton,
  TableSkeleton,
} from '@/components/ui'
import { SearchBar, FilterBar } from '@/components/common'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useTaskTimer } from '@/lib/task-timer-context'
import type { Project, Client, ProjectTask, TaskPriority } from '@/lib/types'
import {
  ListTodo,
  Plus,
  Play,
  Square,
  Clock,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import {
  formatDate,
  formatDateTime,
  getPriorityColor,
  getPriorityLabel,
} from '@/lib/utils'

export default function EmployeeTasksPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EmployeeTasksContent />
    </Suspense>
  )
}

function EmployeeTasksContent() {
  const { currentUser } = useAuth()
  const { activePunch, startTaskTimer, openStopModal } = useTaskTimer()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Add Task Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(
    () => searchParams.get('action') === 'add',
  )
  const [newProjectId, setNewProjectId] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium')
  const [newDueDate, setNewDueDate] = useState('')
  const [newEstHours, setNewEstHours] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [formError, setFormError] = useState('')

  // View Details Modal
  const [viewingTask, setViewingTask] = useState<ProjectTask | null>(null)

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      const t = setTimeout(() => setIsAddModalOpen(true), 0)
      return () => clearTimeout(t)
    }
  }, [searchParams])

  useEffect(() => {
    let mounted = true

    Promise.allSettled([
      api.tasks.listMyAssigned(),
      api.projects.list({ limit: 100 }),
      api.clients.list({ limit: 100 }).catch(() => ({ clients: [] })),
    ])
      .then(([taskRes, projRes, clientRes]) => {
        if (!mounted) return

        if (taskRes.status === 'fulfilled') {
          setTasks(taskRes.value || [])
        } else {
          setError('Failed to fetch assigned tasks from server')
        }

        if (projRes.status === 'fulfilled') {
          const projList = projRes.value?.projects || []
          setProjects(projList)
          if (projList.length > 0) {
            setNewProjectId((prev) => prev || projList[0].id)
          }
        }

        if (clientRes.status === 'fulfilled') {
          setClients(clientRes.value?.clients || [])
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // Refresh on timer start/stop
  useEffect(() => {
    const refresh = () => {
      api.tasks.listMyAssigned().then((list) => setTasks(list)).catch(() => {})
    }
    window.addEventListener('crm_punch_started', refresh)
    window.addEventListener('crm_punch_stopped', refresh)
    return () => {
      window.removeEventListener('crm_punch_started', refresh)
      window.removeEventListener('crm_punch_stopped', refresh)
    }
  }, [])

  const clientMap = useMemo(
    () =>
      new Map(
        (Array.isArray(clients) ? clients : []).map((c) => [
          c.id || (c as unknown as { _id?: string })._id || '',
          c.companyName,
        ]),
      ),
    [clients],
  )

  const getTaskProjectDisplay = useCallback(
    (task: ProjectTask): string => {
      const rawProjId = task.projectId as unknown as
        | string
        | { id?: string; _id?: string; name?: string }
      const tid =
        typeof rawProjId === 'object' && rawProjId !== null
          ? rawProjId.id || rawProjId._id
          : rawProjId
      const matchedProj = projects.find((p) => p.id === tid)
      const projName =
        matchedProj?.name ||
        (typeof rawProjId === 'object' && rawProjId !== null ? rawProjId.name : undefined) ||
        task.projectName ||
        'Assigned Project'
      const companyName = matchedProj
        ? (matchedProj as unknown as { client?: { companyName?: string } }).client?.companyName ||
          clientMap.get(matchedProj.clientId)
        : task.clientName
      if (companyName && !projName.toLowerCase().includes(companyName.toLowerCase())) {
        return `${projName} (${companyName})`
      }
      return projName
    },
    [projects, clientMap],
  )

  function closeAddModal() {
    setIsAddModalOpen(false)
    if (searchParams.get('action') === 'add') {
      router.replace('/employee/tasks')
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) {
      setFormError('Task title is required.')
      return
    }
    if (!newProjectId) {
      setFormError('Please select a project.')
      return
    }

    setFormError('')
    setIsCreating(true)
    try {
      const targetProj = projects.find((p) => p.id === newProjectId)
      const created = await api.tasks.create(newProjectId, {
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        assignedToId: currentUser.id || null,
        assigneeIds: currentUser.id ? [currentUser.id] : [],
        assignees: currentUser.id
          ? [
              {
                id: currentUser.id,
                fullName: currentUser.fullName,
                email: currentUser.email,
                designation: currentUser.designation,
              },
            ]
          : [],
        priority: newPriority,
        status: 'todo',
        startDate: new Date().toISOString(),
        dueDate: newDueDate || undefined,
        estimatedHours: newEstHours ? Number(newEstHours) : undefined,
      })

      setTasks((prev) => [
        { ...created, projectName: targetProj?.name || created.projectName },
        ...prev,
      ])
      setNewTitle('')
      setNewDesc('')
      setNewPriority('medium')
      setNewDueDate('')
      setNewEstHours('')
      closeAddModal()
    } finally {
      setIsCreating(false)
    }
  }

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks.filter((t) => {
      const projLabel = getTaskProjectDisplay(t).toLowerCase()
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        projLabel.includes(q)
      const matchesStatus = statusFilter === 'all' ? true : t.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [tasks, search, statusFilter, getTaskProjectDisplay])

  const todoCount = tasks.filter((t) => t.status === 'todo').length
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length
  const completedCount = tasks.filter((t) => t.status === 'completed').length

  const filterOptions = [
    { id: 'all', label: 'All Tasks', count: tasks.length },
    { id: 'todo', label: 'To Do', count: todoCount },
    { id: 'in_progress', label: 'In Progress', count: inProgressCount },
    { id: 'completed', label: 'Completed', count: completedCount },
  ]

  return (
    <ContentWrapper>
      <PageHeader
        title="My Tasks & Work Execution"
        description="Search assigned deliverables, add new tasks, view full briefs, and track time (auto-punches at 8h)."
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Add Task</span>
          </Button>
        }
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-danger-light border border-danger/30 text-danger-dark flex items-center gap-2 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <Card padding="md">
              <p className="text-xs text-text-muted">Total Tasks</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{tasks.length}</p>
            </Card>
            <Card padding="md">
              <p className="text-xs text-text-muted">In Progress</p>
              <p className="text-2xl font-bold text-brand-700 mt-1">{inProgressCount}</p>
            </Card>
            <Card padding="md">
              <p className="text-xs text-text-muted">Completed</p>
              <p className="text-2xl font-bold text-success-dark mt-1">{completedCount}</p>
            </Card>
            <Card padding="md">
              <p className="text-xs text-text-muted">Total Time Logged</p>
              <p className="text-2xl font-bold text-text-primary mt-1 font-mono">
                {tasks.reduce((sum, t) => sum + (t.totalLoggedMinutes || 0), 0)}m
              </p>
            </Card>
          </>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search task title or project..."
          className="w-full sm:max-w-sm"
        />

        <FilterBar
          options={filterOptions}
          activeId={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      {/* Tasks List */}
      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : filteredTasks.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<ListTodo className="h-10 w-10 text-slate-300 mx-auto" />}
            title={search ? 'No matching tasks found' : '0 Tasks Found'}
            description={
              search
                ? `No tasks matched "${search}".`
                : 'Add a task for one of your projects or wait for assignments from management.'
            }
            action={{
              label: 'Add New Task',
              onClick: () => setIsAddModalOpen(true),
            }}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => {
            const isActive = activePunch?.taskId === task.id
            const projDisplay = getTaskProjectDisplay(task)
            return (
              <Card key={task.id} padding="md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setViewingTask(task)}
                        className="font-bold text-sm text-text-primary hover:text-brand-600 hover:underline text-left cursor-pointer"
                      >
                        {task.title}
                      </button>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getPriorityColor(
                          task.priority,
                        )}`}
                      >
                        {getPriorityLabel(task.priority)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-slate-100 text-slate-700 capitalize">
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-text-muted">
                      Project: <strong className="text-text-secondary">{projDisplay}</strong>
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
                      <span suppressHydrationWarning>
                        Started: {formatDate(task.startDate || task.createdAt)}
                      </span>
                      {task.dueDate && (
                        <span suppressHydrationWarning>Due: {formatDate(task.dueDate)}</span>
                      )}
                      <span className="inline-flex items-center gap-1 font-mono text-brand-700 font-semibold">
                        <Clock className="h-3 w-3" />
                        {task.totalLoggedMinutes || 0}m logged
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    {isActive ? (
                      <Button variant="danger" size="sm" onClick={openStopModal}>
                        <Square className="h-3.5 w-3.5 fill-current" />
                        <span>Stop Timer</span>
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          startTaskTimer({
                            id: task.id,
                            title: task.title,
                            projectId: task.projectId,
                            projectName: projDisplay,
                          })
                        }
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Start Work Timer</span>
                      </Button>
                    )}

                    <Link href={`/employee/projects/${task.projectId}`}>
                      <Button variant="secondary" size="sm">
                        <span>Workspace</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Task Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        title="Add New Task"
        description="Create a task deliverable inside one of your assigned projects."
        size="md"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1.5">
              Project <span className="text-danger">*</span>
            </label>
            <select
              value={newProjectId}
              onChange={(e) => setNewProjectId(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text-primary"
              required
            >
              {projects.length === 0 ? (
                <option value="">No assigned projects available</option>
              ) : (
                projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <Input
            label="Task Title"
            placeholder="e.g. Monthly Content Calendar - Dec 2026"
            value={newTitle}
            onChange={(e) => {
              setNewTitle(e.target.value)
              setFormError('')
            }}
            error={formError}
            required
          />

          <Textarea
            label="Description / Deliverable Scope"
            placeholder="Outline tasks, targets, or deliverables..."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={3}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">
                Priority
              </label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                className="w-full h-10 rounded-lg border border-border bg-white px-3 text-xs text-text-primary"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <Input
              label="Due Date"
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
            />

            <Input
              label="Est. Hours"
              type="number"
              placeholder="e.g. 4"
              value={newEstHours}
              onChange={(e) => setNewEstHours(e.target.value)}
            />
          </div>

          <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={closeAddModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isCreating}
              disabled={projects.length === 0}
            >
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* Task Details Modal */}
      <Modal
        isOpen={!!viewingTask}
        onClose={() => setViewingTask(null)}
        title={viewingTask?.title || 'Task Details'}
        description={viewingTask ? `Project: ${getTaskProjectDisplay(viewingTask)}` : ''}
        size="md"
      >
        {viewingTask && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-surface border border-border text-text-secondary whitespace-pre-line leading-relaxed">
              {viewingTask.description || 'No additional instructions provided for this task.'}
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-text-muted">Start Date (Auto)</p>
                <p className="font-semibold text-text-primary mt-0.5">
                  {formatDateTime(viewingTask.startDate || viewingTask.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Due Date</p>
                <p className="font-semibold text-text-primary mt-0.5">
                  {viewingTask.dueDate ? formatDate(viewingTask.dueDate) : 'Not set'}
                </p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </ContentWrapper>
  )
}
