'use client'

// app/employee/projects/[id]/page.tsx
// Employee Project Workspace — task execution, status updates, raise doubt Q&A with admin, and notes.

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card,
  CardHeader,
  Badge,
  Button,
  Input,
  Textarea,
  Modal,
  Tabs,
  PageLoader,
  CardSkeleton,
  TableSkeleton,
} from '@/components/ui'
import { ProjectPipelineStepper } from '@/components/common'
import { api } from '@/lib/api'
import type {
  Project,
  Doubt,
  Note,
  ServiceCategory,
  ProjectStatus,
  DoubtPriority,
  ProjectTask,
  TaskPunch,
} from '@/lib/types'
import {
  Building2,
  Clock,
  ArrowLeft,
  Plus,
  HelpCircle,
  CheckCircle2,
  Play,
  Square,
  History,
  ListTodo,
} from 'lucide-react'
import {
  formatDate,
  formatDateTime,
  getStatusLabel,
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
  getDaysUntil,
  isOverdue,
  generateId,
} from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import { useTaskTimer } from '@/lib/task-timer-context'

export default function EmployeeProjectDetailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EmployeeProjectDetailContent />
    </Suspense>
  )
}

function EmployeeProjectDetailContent() {
  const { currentUser } = useAuth()
  const { activePunch, startTaskTimer, openStopModal } = useTaskTimer()
  const params = useParams()
  const projectId = params?.id as string

  const currentEmpId = currentUser.id || ''

  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([])
  const [activeTab, setActiveTab] = useState('tasks')

  // Doubts state
  const [projectDoubts, setProjectDoubts] = useState<Doubt[]>([])
  const [isDoubtModalOpen, setIsDoubtModalOpen] = useState(false)
  const [doubtSubject, setDoubtSubject] = useState('')
  const [doubtDescription, setDoubtDescription] = useState('')
  const [doubtPriority, setDoubtPriority] = useState<DoubtPriority>('normal')

  // Notes state
  const [projectNotes, setProjectNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')

  // Punches history modal
  const [isPunchesModalOpen, setIsPunchesModalOpen] = useState(false)
  const [selectedTaskForPunches, setSelectedTaskForPunches] = useState<ProjectTask | null>(null)
  const [taskPunchesList, setTaskPunchesList] = useState<TaskPunch[]>([])
  const [loadingPunches, setLoadingPunches] = useState(false)

  useEffect(() => {
    let mounted = true

    Promise.allSettled([
      api.projects.getById(projectId),
      api.settings.getCategories(),
      api.doubts.listByProject(projectId),
      api.notes.listByProject(projectId),
      api.tasks.listByProject(projectId),
    ])
      .then(([projRes, catRes, doubtRes, noteRes, taskRes]) => {
        if (!mounted) return

        if (projRes.status === 'fulfilled' && projRes.value) {
          setProject(projRes.value)
        }

        if (catRes.status === 'fulfilled') setCategories(catRes.value || [])
        if (doubtRes.status === 'fulfilled') setProjectDoubts(doubtRes.value || [])
        if (noteRes.status === 'fulfilled') setProjectNotes(noteRes.value || [])
        if (taskRes.status === 'fulfilled') setProjectTasks(taskRes.value || [])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [projectId])

  // Listen for punch events to refresh tasks list
  useEffect(() => {
    const handlePunchEvent = () => {
      api.tasks.listByProject(projectId).then((tasks) => setProjectTasks(tasks)).catch(() => {})
    }
    window.addEventListener('crm_punch_stopped', handlePunchEvent)
    window.addEventListener('crm_punch_started', handlePunchEvent)
    return () => {
      window.removeEventListener('crm_punch_stopped', handlePunchEvent)
      window.removeEventListener('crm_punch_started', handlePunchEvent)
    }
  }, [projectId])

  async function handleOpenPunches(task: ProjectTask) {
    setSelectedTaskForPunches(task)
    setIsPunchesModalOpen(true)
    setLoadingPunches(true)
    try {
      const list = await api.tasks.getPunches(task.id)
      setTaskPunchesList(list)
    } finally {
      setLoadingPunches(false)
    }
  }

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const myTasks = useMemo(() => {
    return projectTasks.filter((t) => {
      if (currentUser.role === 'admin') return true
      const ids =
        Array.isArray(t.assigneeIds) && t.assigneeIds.length > 0
          ? t.assigneeIds
          : t.assignedToId
          ? [t.assignedToId]
          : []
      return ids.length === 0 || ids.includes(currentEmpId)
    })
  }, [projectTasks, currentEmpId, currentUser.role])

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

  if (!project) {
    return (
      <ContentWrapper>
        <Card padding="lg" className="text-center py-12">
          <p className="text-base font-semibold text-text-primary">Project Not Found</p>
          <p className="text-sm text-text-muted mt-1">
            This project does not exist or has not been assigned to you.
          </p>
          <Link href="/employee/projects" className="inline-block mt-4">
            <Button variant="primary" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Return to My Projects
            </Button>
          </Link>
        </Card>
      </ContentWrapper>
    )
  }

  // Update status (Employee can update status of their assigned project)
  async function handleStatusChange(newStatus: ProjectStatus) {
    const updated = { ...project!, status: newStatus, updatedAt: new Date().toISOString() }
    setProject(updated)

    try {
      await api.projects.updateStatus(project!.id, newStatus)
    } catch {}
  }

  // Submit Doubt to Admin
  async function handleRaiseDoubt(e: React.FormEvent) {
    e.preventDefault()
    if (!doubtSubject.trim() || !doubtDescription.trim()) return

    const newDbt: Doubt = {
      id: `dbt-${generateId()}`,
      projectId: project!.id,
      raisedById: currentEmpId,
      subject: doubtSubject.trim(),
      description: doubtDescription.trim(),
      priority: doubtPriority,
      status: 'open',
      createdAt: new Date().toISOString(),
    }

    setProjectDoubts([newDbt, ...projectDoubts])
    const s = doubtSubject.trim()
    const d = doubtDescription.trim()
    const p = doubtPriority
    setIsDoubtModalOpen(false)
    setDoubtSubject('')
    setDoubtDescription('')
    setActiveTab('doubts')

    try {
      await api.doubts.raise(project!.id, {
        subject: s,
        description: d,
        priority: p,
      })
    } catch {}
  }

  // Post Note
  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim()) return

    const added: Note = {
      id: `note-${generateId()}`,
      projectId: project!.id,
      authorId: currentEmpId,
      authorType: 'employee',
      authorName: currentUser.fullName,
      content: newNote.trim(),
      createdAt: new Date().toISOString(),
    }

    setProjectNotes([added, ...projectNotes])
    const noteText = newNote.trim()
    setNewNote('')

    try {
      await api.notes.add(project!.id, noteText)
    } catch {}
  }

  const extendedProj = project as Project & {
    client?: { companyName?: string; fullName?: string }
    clientName?: string
    contactName?: string
  }
  const client = extendedProj?.client || {
    companyName: extendedProj?.clientName || 'Client Account',
    fullName: extendedProj?.contactName || 'Client Contact',
  }

  const isLate = isOverdue(project.deliveryDate, project.status)
  const daysLeft = getDaysUntil(project.deliveryDate)
  const myDoubtsCount = Array.isArray(projectDoubts)
    ? projectDoubts.filter((d) => d && d.status === 'open').length
    : 0

  const tabs = [
    { id: 'tasks', label: 'My Assigned Tasks', count: myTasks.length },
    { id: 'scope', label: 'Scope & Guidelines' },
    { id: 'doubts', label: 'My Doubts & Questions', count: myDoubtsCount },
    { id: 'notes', label: 'Deliverable Notes', count: Array.isArray(projectNotes) ? projectNotes.length : 0 },
  ]

  return (
    <ContentWrapper>
      <PageHeader
        title={project.name}
        description={`Client: ${client?.companyName || 'N/A'} • Delivery Deadline: ${formatDate(
          project.deliveryDate,
        )}`}
        breadcrumbs={[
          { label: 'My Projects', href: '/employee/projects' },
          { label: project.name },
        ]}
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsDoubtModalOpen(true)}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Raise a Doubt</span>
          </Button>
        }
      />

      {/* Status Connected Pipeline Tracker */}
      <Card padding="md" className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Progress & Status
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Keep management updated by advancing your project through each stage.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                project.status,
              )}`}
            >
              Current: {getStatusLabel(project.status)}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                project.priority,
              )}`}
            >
              {getPriorityLabel(project.priority)}
            </span>
          </div>
        </div>

        <ProjectPipelineStepper
          currentStatus={project.status}
          onStatusChange={handleStatusChange}
        />
      </Card>

      {/* Deadline & Client Info Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <Card padding="md">
          <p className="text-xs text-text-muted">Client Account</p>
          <div className="flex items-center gap-2 mt-1">
            <Building2 className="h-4 w-4 text-brand-600" />
            <span className="text-sm font-semibold text-text-primary">
              {client?.companyName}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Contact: {client?.fullName}
          </p>
        </Card>

        <Card padding="md">
          <p className="text-xs text-text-muted">Delivery Deadline</p>
          <div suppressHydrationWarning>
            <p
              className={`text-base font-bold mt-1 ${
                isLate ? 'text-danger' : 'text-text-primary'
              }`}
            >
              {formatDate(project.deliveryDate)}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {isLate
                ? 'Delivery date has passed!'
                : project.status === 'delivered'
                ? 'Work delivered'
                : `${daysLeft} days remaining`}
            </p>
          </div>
        </Card>

        <Card padding="md">
          <p className="text-xs text-text-muted">Urgency Level</p>
          <p className="text-base font-bold text-text-primary mt-1 capitalize">
            {project.priority} Priority
          </p>
          <p className="text-[11px] text-text-muted mt-0.5">
            Started: {formatDate(project.startDate)}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab: Assigned Deliverable Tasks & Work Timer */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <Card padding="md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  My Assigned Tasks & Work Punch Timers
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Click &apos;Start Work Timer&apos; when you begin execution. Your live timer will track progress in the top bar.
                </p>
              </div>

              {activePunch && activePunch.projectId === project.id && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-emerald-950">Active on: {activePunch.taskTitle}</span>
                  <button
                    type="button"
                    onClick={openStopModal}
                    className="ml-1 text-[11px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                  >
                    Stop Work Timer
                  </button>
                </div>
              )}
            </div>

            {myTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
                <ListTodo className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-text-primary text-sm">No Specific Tasks Assigned</p>
                <p className="mt-1 max-w-sm mx-auto">
                  There are no sub-tasks assigned to you yet for this project. Check the Scope & Guidelines tab for campaign deliverables.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myTasks.map((task) => {
                  const isTaskActive = activePunch?.taskId === task.id
                  const isTaskLate = task.dueDate ? new Date(task.dueDate) < new Date() && task.status !== 'completed' : false

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isTaskActive
                          ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500 shadow-sm'
                          : 'border-border bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-text-primary truncate">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0 ${
                            task.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : task.status === 'review'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : task.status === 'in_progress'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : task.status === 'blocked'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {task.status === 'completed'
                            ? 'Completed'
                            : task.status === 'review'
                            ? 'Review'
                            : task.status === 'in_progress'
                            ? 'In Progress'
                            : task.status === 'blocked'
                            ? 'Blocked'
                            : 'To Do'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-text-muted">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getPriorityColor(
                            task.priority,
                          )}`}
                        >
                          {getPriorityLabel(task.priority)}
                        </span>

                        <span suppressHydrationWarning>
                          Started: {formatDate(task.startDate || task.createdAt)}
                        </span>

                        {task.dueDate && (
                          <span
                            suppressHydrationWarning
                            className={isTaskLate ? 'text-danger font-semibold' : ''}
                          >
                            • Due: {formatDate(task.dueDate)}
                          </span>
                        )}

                        <span>•</span>
                        <span className="font-mono text-brand-700 font-medium">
                          {task.totalLoggedMinutes || 0}m logged
                        </span>
                      </div>

                      <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenPunches(task)}
                          className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                        >
                          <History className="h-3.5 w-3.5 text-text-muted" />
                          <span>Punch Logs ({task.totalPunchesCount || 0})</span>
                        </button>

                        {isTaskActive ? (
                          <button
                            type="button"
                            onClick={openStopModal}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-rose-600 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
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
                                projectId: project.id,
                                projectName: project.name,
                              })
                            }
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                          >
                            <Play className="h-3.5 w-3.5 fill-current" />
                            <span>Start Work Timer</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Scope & Guidelines */}
      {activeTab === 'scope' && (
        <Card padding="lg" className="space-y-6">
          <CardHeader
            title="Deliverable Scope & Brief"
            description="Work specifications provided by client and management"
          />

          <div className="p-4 rounded-xl border border-border bg-surface text-sm text-text-secondary whitespace-pre-line leading-relaxed">
            {project.description || 'No detailed scope description provided.'}
          </div>

          <div className="pt-2 border-t border-border">
            <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-2">
              Required Services
            </h4>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(project.serviceCategories) &&
                project.serviceCategories.map((catItem: unknown) => {
                  const catObj =
                    typeof catItem === 'object' && catItem !== null
                      ? (catItem as { id?: string; _id?: string; name?: string })
                      : null
                  const catId = catObj ? catObj.id || catObj._id || '' : String(catItem)
                  const cat = catObj || categoryMap.get(catId)
                  return (
                    <span
                      key={catId}
                      className="px-3 py-1 rounded-lg bg-brand-50 border border-brand-200 text-xs font-medium text-brand-700"
                    >
                      {cat?.name || (typeof catItem === 'string' ? catItem : 'Service')}
                    </span>
                  )
                })}
            </div>
          </div>
        </Card>
      )}

      {/* Tab 2: Doubts & Q&A (§4.4) */}
      {activeTab === 'doubts' && (
        <div className="space-y-4">
          <Card padding="md">
            <CardHeader
              title="My Inquiries & Doubts"
              description="Direct communication with the company head regarding questions or roadblocks"
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsDoubtModalOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Ask a Question</span>
                </Button>
              }
            />

            {!Array.isArray(projectDoubts) || projectDoubts.length === 0 ? (
              <div className="py-12 text-center text-sm text-text-muted">
                <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2 opacity-80" />
                No doubts submitted for this project. If you hit any roadblock, click &quot;Ask a Question&quot; above.
              </div>
            ) : (
              <div className="space-y-4">
                {(Array.isArray(projectDoubts) ? projectDoubts : []).map((doubt) => (
                  <div
                    key={doubt.id}
                    className="p-4 rounded-xl border border-border bg-white shadow-sm space-y-3 text-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-semibold text-text-primary">
                          {doubt.subject}
                        </h4>
                        <p className="text-text-muted text-[11px] mt-0.5">
                          Submitted on {formatDateTime(doubt.createdAt)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={doubt.priority === 'urgent' ? 'red' : 'amber'}
                          size="sm"
                        >
                          {doubt.priority}
                        </Badge>
                        <Badge
                          variant={doubt.status === 'resolved' ? 'green' : 'amber'}
                          size="sm"
                        >
                          {doubt.status}
                        </Badge>
                      </div>
                    </div>

                    <p className="text-text-secondary bg-surface p-3 rounded-lg border border-border/70 leading-relaxed">
                      {doubt.description}
                    </p>

                    {/* Admin Reply */}
                    {doubt.adminReply ? (
                      <div className="p-3.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-900 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-brand-800">
                          <span>Admin Response:</span>
                          {doubt.adminRepliedAt && (
                            <span className="font-normal opacity-80">
                              {formatDateTime(doubt.adminRepliedAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed">{doubt.adminReply}</p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-text-muted italic">
                        Waiting for response from company head...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Notes */}
      {activeTab === 'notes' && (
        <Card padding="md">
          <CardHeader
            title="Deliverable Updates & Activity Log"
            description="Log your daily progress and deliverable links"
          />

          <form onSubmit={handleAddNote} className="mb-6 p-4 rounded-xl border border-border bg-surface space-y-3">
            <Textarea
              placeholder="Record task completion notes, draft links, client communication records..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm">
                <Plus className="h-4 w-4" />
                <span>Add Update</span>
              </Button>
            </div>
          </form>

          <div className="space-y-3">
            {!Array.isArray(projectNotes) || projectNotes.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">
                No updates posted yet.
              </p>
            ) : (
              (Array.isArray(projectNotes) ? projectNotes : []).map((note) => (
                <div
                  key={note.id}
                  className="p-3.5 rounded-lg border border-border bg-white text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between text-text-muted">
                    <span className="font-semibold text-text-primary">
                      {note.authorName} ({note.authorType})
                    </span>
                    <span>{formatDateTime(note.createdAt)}</span>
                  </div>
                  <p className="text-text-secondary leading-relaxed">{note.content}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Raise Doubt Modal */}
      <Modal
        isOpen={isDoubtModalOpen}
        onClose={() => setIsDoubtModalOpen(false)}
        title="Raise a Doubt with Admin"
        description="Submit questions, blockers, or request client follow-up assistance."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDoubtModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRaiseDoubt}
              disabled={!doubtSubject.trim() || !doubtDescription.trim()}
            >
              Submit Doubt
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Subject / Topic"
            placeholder="e.g. Waiting for client approval on keyword list"
            value={doubtSubject}
            onChange={(e) => setDoubtSubject(e.target.value)}
            required
          />

          <div>
            <label className="text-sm font-medium text-text-primary block mb-1.5">
              Urgency / Priority
            </label>
            <select
              value={doubtPriority}
              onChange={(e) => setDoubtPriority(e.target.value as DoubtPriority)}
              className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text-primary"
            >
              <option value="normal">Normal Priority</option>
              <option value="urgent">Urgent — Work is Blocked</option>
            </select>
          </div>

          <Textarea
            label="Detailed Description"
            placeholder="Explain the specific issue, what you've tried, and what decision or client follow-up is needed from admin..."
            value={doubtDescription}
            onChange={(e) => setDoubtDescription(e.target.value)}
            rows={4}
            required
          />
        </div>
      </Modal>

      {/* View Task Punches / Work History Modal */}
      <Modal
        isOpen={isPunchesModalOpen}
        onClose={() => setIsPunchesModalOpen(false)}
        title="My Task Work Time Logs"
        description={selectedTaskForPunches ? `Audit log for: ${selectedTaskForPunches.title}` : ''}
        size="lg"
      >
        <div className="space-y-4">
          {selectedTaskForPunches && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="text-text-muted">Total Recorded Time:</p>
                <p className="font-bold text-base text-brand-700 mt-0.5 font-mono">
                  {selectedTaskForPunches.totalLoggedMinutes || 0} minutes
                </p>
              </div>
              <div>
                <p className="text-text-muted">Total Punch Sessions:</p>
                <p className="font-semibold text-text-primary mt-0.5">
                  {taskPunchesList.length} sessions
                </p>
              </div>
            </div>
          )}

          {loadingPunches ? (
            <div className="py-8 text-center text-xs text-text-muted">Loading punch records...</div>
          ) : taskPunchesList.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
              <Clock className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
              <p className="font-medium text-text-primary">No Punches Logged Yet</p>
              <p className="mt-0.5">When you start and stop the work timer, each individual session will be logged here.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {taskPunchesList.map((punch, idx) => {
                const durationMins = Math.round((punch.durationSeconds || 0) / 60)
                return (
                  <div key={punch.id || idx} className="p-3 rounded-xl border border-border bg-white text-xs space-y-1.5 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {punch.statusAtStop && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-brand-50 text-brand-800 border border-brand-200 capitalize">
                            Status: {punch.statusAtStop.replace('_', ' ')}
                          </span>
                        )}
                      </div>
                      <span className="font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                        {durationMins > 0 ? `${durationMins} mins` : `${punch.durationSeconds || 0}s`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-text-muted text-[11px]">
                      <span>Started: {formatDateTime(punch.startTime)}</span>
                      {punch.endTime && (
                        <>
                          <span>•</span>
                          <span>Stopped: {formatDateTime(punch.endTime)}</span>
                        </>
                      )}
                    </div>

                    {punch.notes && (
                      <p className="text-text-secondary bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                        <strong>My Work Note:</strong> {punch.notes}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsPunchesModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </ContentWrapper>
  )
}
