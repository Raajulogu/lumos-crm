'use client'

// app/admin/projects/[id]/page.tsx
// Admin Project Detail — 5-stage pipeline status changer, financial profit audit, doubts resolution thread, follow-ups, and notes.

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  Client,
  Employee,
  ServiceCategory,
  Doubt,
  FollowUp,
  Note,
  ProjectStatus,
  ProjectPriority,
  DoubtPriority,
  ProjectTask,
  TaskPunch,
  TaskPriority,
  TaskStatus,
} from '@/lib/types'
import {
  Briefcase,
  Building2,
  Calendar,
  Clock,
  User,
  Users,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
  Phone,
  ArrowLeft,
  Plus,
  Send,
  Bell,
  TrendingUp,
  FileText,
  Check,
  CheckSquare,
  Square,
  Trash2,
  UserCheck,
  History,
  ListTodo,
} from 'lucide-react'
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  getStatusLabel,
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
  getDaysUntil,
  isOverdue,
  generateId,
} from '@/lib/utils'

export default function AdminProjectDetailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminProjectDetailContent />
    </Suspense>
  )
}

function AdminProjectDetailContent() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [project, setProject] = useState<Project | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])

  // Local state for tabs
  const [activeTab, setActiveTab] = useState('overview')

  // Doubts state
  const [projectDoubts, setProjectDoubts] = useState<Doubt[]>([])
  const [replyingDoubtId, setReplyingDoubtId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  // Follow-ups state
  const [projectFollowUps, setProjectFollowUps] = useState<FollowUp[]>([])
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false)
  const [followupDate, setFollowupDate] = useState('')
  const [followupNotes, setFollowupNotes] = useState('')
  const [followupAssignee, setFollowupAssignee] = useState('admin')

  // Notes state
  const [projectNotes, setProjectNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')

  // Financial Edit Modal
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false)
  const [editBudget, setEditBudget] = useState('0')
  const [editCost, setEditCost] = useState('0')

  // Tasks state
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([])
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [bulkAssignee, setBulkAssignee] = useState<string>('')
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskAssignee, setTaskAssignee] = useState<string>('')
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskEstHours, setTaskEstHours] = useState('')
  const [isSavingTask, setIsSavingTask] = useState(false)

  // Punches history modal
  const [isPunchesModalOpen, setIsPunchesModalOpen] = useState(false)
  const [selectedTaskForPunches, setSelectedTaskForPunches] = useState<ProjectTask | null>(null)
  const [taskPunchesList, setTaskPunchesList] = useState<TaskPunch[]>([])
  const [loadingPunches, setLoadingPunches] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)

    Promise.allSettled([
      api.projects.getById(projectId),
      api.clients.list({ limit: 100 }),
      api.employees.list(),
      api.settings.getCategories(),
      api.doubts.listByProject(projectId),
      api.notes.listByProject(projectId),
      api.followups.list({ limit: 100 }),
      api.tasks.listByProject(projectId),
    ])
      .then(([projRes, clientRes, empRes, catRes, doubtRes, noteRes, fuRes, taskRes]) => {
        if (!mounted) return

        if (projRes.status === 'fulfilled' && projRes.value) {
          const p = projRes.value
          setProject(p)
          setEditBudget(p.budget?.toString() || '0')
          setEditCost(p.actualCost?.toString() || '0')
        }

        if (clientRes.status === 'fulfilled') setClients(clientRes.value?.clients || [])
        if (empRes.status === 'fulfilled') setEmployees(empRes.value || [])
        if (catRes.status === 'fulfilled') setCategories(catRes.value || [])
        if (doubtRes.status === 'fulfilled') setProjectDoubts(doubtRes.value || [])
        if (noteRes.status === 'fulfilled') setProjectNotes(noteRes.value || [])
        if (taskRes.status === 'fulfilled') setProjectTasks(taskRes.value || [])

        if (fuRes.status === 'fulfilled') {
          const matching = (fuRes.value?.followups || []).filter(
            (f) => f.projectId === projectId,
          )
          setProjectFollowUps(matching)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [projectId])

  // Lookup data
  const client =
    (project as any)?.client ||
    (project ? clients.find((c) => (c.id || (c as any)._id) === project.clientId) : null)
  const primaryEmp =
    (project as any)?.primaryEmployee ||
    (project?.primaryEmployeeId
      ? employees.find((e) => (e.id || (e as any)._id) === project.primaryEmployeeId)
      : null)
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id || (c as any)._id, c])),
    [categories],
  )

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
            The project you are looking for does not exist or was deleted.
          </p>
          <Link href="/admin/projects" className="inline-block mt-4">
            <Button variant="primary" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Return to Projects
            </Button>
          </Link>
        </Card>
      </ContentWrapper>
    )
  }

  // Update Status
  async function handleStatusChange(newStatus: ProjectStatus) {
    const updated = { ...project!, status: newStatus, updatedAt: new Date().toISOString() }
    setProject(updated)
    try {
      await api.projects.updateStatus(project!.id, newStatus)
    } catch {}
  }

  // Update Financials
  async function handleSaveFinancials(e: React.FormEvent) {
    e.preventDefault()
    const updated = {
      ...project!,
      budget: Number(editBudget) || 0,
      actualCost: editCost ? Number(editCost) : undefined,
      updatedAt: new Date().toISOString(),
    }
    setProject(updated)
    setIsFinancialModalOpen(false)

    try {
      await api.projects.updateFinancials(project!.id, {
        budget: Number(editBudget) || 0,
        actualCost: editCost ? Number(editCost) : undefined,
      })
    } catch {}
  }

  // Doubts: Submit Reply
  async function handleSubmitReply(doubtId: string) {
    if (!replyText.trim()) return
    const updatedDoubts = projectDoubts.map((d) => {
      if (d.id === doubtId) {
        return {
          ...d,
          adminReply: replyText.trim(),
          adminRepliedAt: new Date().toISOString(),
        }
      }
      return d
    })
    setProjectDoubts(updatedDoubts)
    const text = replyText.trim()
    setReplyingDoubtId(null)
    setReplyText('')

    try {
      await api.doubts.reply(doubtId, text)
    } catch {}
  }

  // Doubts: Resolve
  async function handleResolveDoubt(doubtId: string) {
    const updatedDoubts = projectDoubts.map((d) => {
      if (d.id === doubtId) {
        return {
          ...d,
          status: 'resolved' as const,
          resolvedAt: new Date().toISOString(),
        }
      }
      return d
    })
    setProjectDoubts(updatedDoubts)

    try {
      await api.doubts.resolve(doubtId)
    } catch {}
  }

  // Follow-ups: Add
  async function handleCreateFollowup(e: React.FormEvent) {
    e.preventDefault()
    if (!followupDate) return

    const newFU = {
      id: `fu-${generateId()}`,
      projectId: project!.id,
      clientId: project!.clientId,
      scheduledAt: new Date(followupDate).toISOString(),
      assignedToId: followupAssignee,
      assignedToName:
        followupAssignee === 'admin'
          ? 'Admin'
          : employees.find((e) => e.id === followupAssignee)?.fullName || 'Staff',
      notes: followupNotes.trim() || undefined,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    }

    setProjectFollowUps([newFU, ...projectFollowUps])
    setIsFollowupModalOpen(false)
    setFollowupDate('')
    setFollowupNotes('')

    try {
      await api.followups.create({
        projectId: project!.id,
        clientId: project!.clientId,
        scheduledAt: new Date(followupDate).toISOString(),
        assignedToId: followupAssignee,
        notes: followupNotes.trim() || undefined,
      })
    } catch {}
  }

  // Notes: Add
  async function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim()) return

    const added = {
      id: `note-${generateId()}`,
      projectId: project!.id,
      authorId: 'admin',
      authorType: 'admin' as const,
      authorName: 'Admin',
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

  // Tasks: Create
  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskTitle.trim()) return
    setIsSavingTask(true)

    try {
      const emp = employees.find((e) => e.id === taskAssignee)
      const created = await api.tasks.create(projectId, {
        title: taskTitle.trim(),
        description: taskDesc.trim() || undefined,
        assignedToId: taskAssignee || null,
        priority: taskPriority,
        dueDate: taskDueDate || undefined,
        estimatedHours: taskEstHours ? Number(taskEstHours) : undefined,
      })

      const taskWithEmp: ProjectTask = {
        ...created,
        assignedTo: emp
          ? { id: emp.id, fullName: emp.fullName, designation: emp.designation, email: emp.email }
          : null,
      }

      setProjectTasks((prev) => [taskWithEmp, ...prev])
      setIsTaskModalOpen(false)
      setTaskTitle('')
      setTaskDesc('')
      setTaskAssignee('')
      setTaskPriority('medium')
      setTaskDueDate('')
      setTaskEstHours('')
    } finally {
      setIsSavingTask(false)
    }
  }

  // Tasks: Inline Reassign
  async function handleReassignTask(taskId: string, empId: string) {
    const targetEmpId = empId === 'unassigned' ? null : empId
    const emp = employees.find((e) => e.id === targetEmpId)
    const empObj = emp
      ? { id: emp.id, fullName: emp.fullName, designation: emp.designation, email: emp.email }
      : null

    setProjectTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, assignedToId: targetEmpId, assignedTo: empObj } : t,
      ),
    )

    try {
      await api.tasks.assign(taskId, projectId, targetEmpId, empObj)
    } catch {}
  }

  // Tasks: Bulk Assign
  async function handleBulkAssign() {
    if (selectedTaskIds.length === 0 || !bulkAssignee) return
    const targetEmpId = bulkAssignee === 'unassigned' ? null : bulkAssignee
    const emp = employees.find((e) => e.id === targetEmpId)
    const empObj = emp
      ? { id: emp.id, fullName: emp.fullName, designation: emp.designation, email: emp.email }
      : null

    setProjectTasks((prev) =>
      prev.map((t) =>
        selectedTaskIds.includes(t.id)
          ? { ...t, assignedToId: targetEmpId, assignedTo: empObj }
          : t,
      ),
    )
    setSelectedTaskIds([])

    try {
      await api.tasks.bulkAssign(selectedTaskIds, projectId, targetEmpId, empObj)
    } catch {}
  }

  // Tasks: Toggle Select All
  function handleToggleSelectAll() {
    if (selectedTaskIds.length === projectTasks.length) {
      setSelectedTaskIds([])
    } else {
      setSelectedTaskIds(projectTasks.map((t) => t.id))
    }
  }

  // Tasks: Delete
  async function handleDeleteTask(taskId: string) {
    setProjectTasks((prev) => prev.filter((t) => t.id !== taskId))
    setSelectedTaskIds((prev) => prev.filter((id) => id !== taskId))
    try {
      await api.tasks.delete(taskId, projectId)
    } catch {}
  }

  // Tasks: View Punches
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

  // Calculations
  const isLate = isOverdue(project.deliveryDate, project.status)
  const daysLeft = getDaysUntil(project.deliveryDate)
  const budget = Number(project.budget) || 0
  const currentCost = Number(project.actualCost) || 0
  const netProfit = budget - currentCost
  const profitMargin = budget > 0 ? Math.round((netProfit / budget) * 100) : 0
  const openDoubtsCount = Array.isArray(projectDoubts)
    ? projectDoubts.filter((d) => d && d.status === 'open').length
    : 0

  const tabs = [
    { id: 'overview', label: 'Overview & Scope' },
    { id: 'tasks', label: 'Tasks & Assignment', count: projectTasks.length },
    { id: 'doubts', label: 'Doubts & Q&A', count: openDoubtsCount },
    { id: 'followups', label: 'Follow-ups', count: Array.isArray(projectFollowUps) ? projectFollowUps.length : 0 },
    { id: 'notes', label: 'Internal Notes', count: Array.isArray(projectNotes) ? projectNotes.length : 0 },
  ]

  return (
    <ContentWrapper>
      <PageHeader
        title={project.name}
        description={`Deliverable for ${client?.companyName || 'Client'} • Target: ${formatDate(
          project.deliveryDate,
        )}`}
        breadcrumbs={[
          { label: 'Projects', href: '/admin/projects' },
          { label: project.name },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsFollowupModalOpen(true)}
            >
              <Phone className="h-4 w-4" />
              <span>Schedule Follow-up</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsFinancialModalOpen(true)}
            >
              <IndianRupee className="h-4 w-4" />
              <span>Financials</span>
            </Button>
          </div>
        }
      />

      {/* 5-Stage Status Interactive Connected Pipeline */}
      <Card padding="md" className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Project Lifecycle Stage
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Click any stage to update live status. Reminders automatically cease when Delivered.
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

      {/* Metric Cards: Budget, Cost, Profit, Deadline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card padding="md">
          <p className="text-xs text-text-muted">Agreed Budget</p>
          <p className="text-xl font-bold text-text-primary mt-1">
            {formatCurrency(project.budget)}
          </p>
        </Card>

        <Card padding="md">
          <p className="text-xs text-text-muted">Incurred Cost</p>
          <p className="text-xl font-bold text-text-secondary mt-1">
            {formatCurrency(currentCost)}
          </p>
        </Card>

        <Card padding="md">
          <p className="text-xs text-text-muted">Net Agency Profit</p>
          <div className="flex items-center gap-1.5 mt-1">
            <p
              className={`text-xl font-bold ${
                netProfit >= 0 ? 'text-success-dark' : 'text-danger'
              }`}
            >
              {formatCurrency(netProfit)}
            </p>
            <span className="text-xs font-medium text-text-muted">({profitMargin}%)</span>
          </div>
        </Card>

        <Card padding="md">
          <p className="text-xs text-text-muted">Deadline Status</p>
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
                ? 'Past delivery date!'
                : project.status === 'delivered'
                ? 'Delivered to client'
                : `${daysLeft} days remaining`}
            </p>
          </div>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <div className="mb-6">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </div>

      {/* Tab 1: Overview & Scope */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card padding="lg">
              <CardHeader
                title="Deliverable Scope & Brief"
                description="Client campaign specifications and expectations"
              />
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line bg-surface p-4 rounded-xl border border-border/80">
                {project.description || 'No detailed scope written for this project.'}
              </p>

              <div className="mt-6 pt-4 border-t border-border">
                <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider mb-2">
                  Service Deliverable Categories
                </h4>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(project.serviceCategories) && project.serviceCategories.map((catItem: any) => {
                    const catId = typeof catItem === 'object' && catItem !== null ? catItem.id || catItem._id : catItem
                    const cat = typeof catItem === 'object' && catItem !== null ? catItem : categoryMap.get(catId)
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

            {/* Configured Reminder Triggers */}
            <Card padding="md">
              <CardHeader
                title="Automated Deadline Alerts"
                description="Emails & in-app alerts dispatched before delivery"
              />
              <div className="flex flex-wrap gap-2">
                {(project.reminderOverrides || [{ daysBeforeDeadline: 3 }, { daysBeforeDeadline: 2 }, { daysBeforeDeadline: 1 }, { daysBeforeDeadline: 0 }]).map(
                  (rem, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface border border-border text-xs font-medium text-text-secondary"
                    >
                      <Bell className="h-3 w-3 text-warning-dark" />
                      {rem.daysBeforeDeadline === 0
                        ? 'Day of Deadline'
                        : `${rem.daysBeforeDeadline} days before`}
                    </span>
                  ),
                )}
              </div>
              <p className="text-xs text-text-muted mt-3">
                Reminders are sent to{' '}
                <strong className="text-text-primary">
                  {primaryEmp?.fullName || 'Assigned Staff'}
                </strong>{' '}
                and the <strong className="text-text-primary">Company Head</strong>.
              </p>
            </Card>
          </div>

          {/* Right Column: Client & Staff Assignment Info */}
          <div className="space-y-6">
            <Card padding="md">
              <CardHeader
                title="Client Information"
                description="Account associated with this project"
                action={
                  client?.id ? (
                    <Link href={`/admin/clients/${client.id}`}>
                      <Button variant="ghost" size="sm">
                        View Profile
                      </Button>
                    </Link>
                  ) : null
                }
              />
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-text-muted">Company</p>
                  <p className="font-semibold text-sm text-text-primary mt-0.5">
                    {client?.companyName || (project as any).clientName || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted">Contact Person</p>
                  <p className="font-medium text-text-primary mt-0.5">
                    {client?.fullName || (project as any).clientContact || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted">Phone Number</p>
                  <p className="font-medium text-text-primary mt-0.5">
                    {client?.phone || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted">Email</p>
                  <p className="font-medium text-brand-600 mt-0.5">
                    {client?.email || 'N/A'}
                  </p>
                </div>
              </div>
            </Card>

            <Card padding="md">
              <CardHeader
                title="Assigned Staff"
                description="Marketing team members on this deliverable"
              />
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-text-muted">Lead / Primary Manager</p>
                  <p className="font-semibold text-sm text-text-primary mt-0.5">
                    {primaryEmp ? `${primaryEmp.fullName} (${primaryEmp.designation})` : 'Unassigned'}
                  </p>
                </div>

                {Array.isArray(project.additionalMemberIds) && project.additionalMemberIds.length > 0 && (
                  <div>
                    <p className="text-text-muted mb-1.5">Collaborators</p>
                    <div className="space-y-1">
                      {project.additionalMemberIds.map((mItem: any) => {
                        const mId = typeof mItem === 'object' && mItem !== null ? mItem.id || mItem._id : mItem
                        const m = typeof mItem === 'object' && mItem !== null ? mItem : employees.find((e: Employee) => (e.id || (e as any)._id) === mId)
                        return (
                          <div
                            key={mId}
                            className="p-1.5 rounded bg-surface border border-border text-xs flex items-center justify-between"
                          >
                            <span>{m?.fullName || (typeof mItem === 'string' ? mItem : 'Team Member')}</span>
                            <span className="text-text-muted text-[11px]">{m?.designation || 'Staff'}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Tasks & Granular Staff Assignment */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <Card padding="md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Project Tasks & Staff Delegation
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Granular task assignment for team members. Assign individual tasks or select all at once.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsTaskModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span>Add Task</span>
              </Button>
            </div>

            {/* Metric Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-text-muted">Total Tasks</span>
                <p className="font-bold text-text-primary text-base">{projectTasks.length}</p>
              </div>
              <div>
                <span className="text-text-muted">In Progress</span>
                <p className="font-bold text-blue-600 text-base">
                  {projectTasks.filter((t) => t.status === 'in_progress').length}
                </p>
              </div>
              <div>
                <span className="text-text-muted">Completed</span>
                <p className="font-bold text-emerald-600 text-base">
                  {projectTasks.filter((t) => t.status === 'completed').length}
                </p>
              </div>
              <div>
                <span className="text-text-muted">Unassigned Tasks</span>
                <p className="font-bold text-amber-600 text-base">
                  {projectTasks.filter((t) => !t.assignedToId).length}
                </p>
              </div>
            </div>

            {/* Bulk Selection Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-surface border border-border mb-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="flex items-center gap-1.5 font-medium text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  {selectedTaskIds.length === projectTasks.length && projectTasks.length > 0 ? (
                    <CheckSquare className="h-4 w-4 text-brand-600" />
                  ) : (
                    <Square className="h-4 w-4 text-text-muted" />
                  )}
                  <span>Select All Tasks ({projectTasks.length})</span>
                </button>

                {selectedTaskIds.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 font-semibold text-[11px]">
                    {selectedTaskIds.length} selected
                  </span>
                )}
              </div>

              {selectedTaskIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-text-muted hidden sm:inline">Assign selected to:</span>
                  <select
                    value={bulkAssignee}
                    onChange={(e) => setBulkAssignee(e.target.value)}
                    className="h-8 rounded-lg border border-border bg-white px-2.5 text-xs text-text-primary cursor-pointer"
                  >
                    <option value="">Select Employee...</option>
                    <option value="unassigned">-- Unassign Selected --</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.fullName} ({emp.designation})
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleBulkAssign}
                    disabled={!bulkAssignee}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>Assign at Once</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Task Items List */}
            {projectTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
                <ListTodo className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-text-primary text-sm">0 Tasks Defined</p>
                <p className="mt-1 max-w-sm mx-auto">
                  Create granular deliverables for this campaign and assign them to specific employees.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsTaskModalOpen(true)}
                  className="mt-3"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create First Task</span>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-text-secondary">
                  <thead className="bg-surface border-b border-border text-text-primary font-semibold">
                    <tr>
                      <th className="py-3 px-3 w-8"></th>
                      <th className="py-3 px-3">Task Deliverable</th>
                      <th className="py-3 px-3">Assigned Staff</th>
                      <th className="py-3 px-3">Priority</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3">Due Date</th>
                      <th className="py-3 px-3">Time Punches</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {projectTasks.map((task) => {
                      const isSelected = selectedTaskIds.includes(task.id)
                      const isTaskLate = task.dueDate ? new Date(task.dueDate) < new Date() && task.status !== 'completed' : false

                      return (
                        <tr key={task.id} className="hover:bg-surface/50 transition-colors">
                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedTaskIds((prev) =>
                                  isSelected
                                    ? prev.filter((id) => id !== task.id)
                                    : [...prev, task.id],
                                )
                              }
                              className="cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-brand-600" />
                              ) : (
                                <Square className="h-4 w-4 text-text-muted" />
                              )}
                            </button>
                          </td>

                          <td className="py-3 px-3 max-w-[240px]">
                            <p className="font-semibold text-text-primary text-sm truncate">
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                                {task.description}
                              </p>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <select
                              value={task.assignedToId || 'unassigned'}
                              onChange={(e) => handleReassignTask(task.id, e.target.value)}
                              className="text-xs h-8 rounded-lg border border-border bg-white px-2 py-1 font-medium text-text-primary focus:ring-1 focus:ring-brand-500 cursor-pointer"
                            >
                              <option value="unassigned">Unassigned</option>
                              {employees.map((emp) => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.fullName}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getPriorityColor(
                                task.priority,
                              )}`}
                            >
                              {getPriorityLabel(task.priority)}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
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
                          </td>

                          <td className="py-3 px-3 whitespace-nowrap">
                            {task.dueDate ? (
                              <span
                                suppressHydrationWarning
                                className={isTaskLate ? 'text-danger font-semibold' : 'text-text-muted'}
                              >
                                {formatDate(task.dueDate)}
                              </span>
                            ) : (
                              <span className="text-text-muted/60">—</span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <button
                              type="button"
                              onClick={() => handleOpenPunches(task)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-brand-50 hover:text-brand-700 text-text-secondary border border-border transition-colors cursor-pointer"
                              title="View punch time log history"
                            >
                              <Clock className="h-3 w-3 text-text-muted" />
                              <span className="font-mono">{task.totalLoggedMinutes || 0}m</span>
                              <History className="h-3 w-3 text-text-muted" />
                            </button>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger-light transition-colors cursor-pointer"
                              title="Delete task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 2: Doubts & Q&A Thread (§4.4) */}
      {activeTab === 'doubts' && (
        <div className="space-y-4">
          <Card padding="md">
            <CardHeader
              title="Employee Doubts & Blockers"
              description="Questions submitted by employees working on this project"
            />

            {!Array.isArray(projectDoubts) || projectDoubts.length === 0 ? (
              <div className="py-12 text-center text-sm text-text-muted">
                <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2 opacity-80" />
                No doubts raised for this project. Everything is running smoothly!
              </div>
            ) : (
              <div className="space-y-4">
                {(Array.isArray(projectDoubts) ? projectDoubts : []).map((doubt) => {
                  const emp = employees.find((e: Employee) => e.id === doubt.raisedById)
                  const isReplying = replyingDoubtId === doubt.id

                  return (
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
                            Raised by <strong className="text-text-secondary">{emp?.fullName || 'Employee'}</strong> •{' '}
                            {formatDateTime(doubt.createdAt)}
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

                      {/* Question Description */}
                      <p className="text-text-secondary bg-surface p-3 rounded-lg border border-border/70 leading-relaxed">
                        {doubt.description}
                      </p>

                      {/* Admin Reply Section */}
                      {doubt.adminReply ? (
                        <div className="p-3 rounded-lg bg-brand-50/70 border border-brand-200 text-brand-900 space-y-1">
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
                      ) : null}

                      {/* Action buttons */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/60">
                        {doubt.status === 'open' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleResolveDoubt(doubt.id)}
                          >
                            <Check className="h-3.5 w-3.5 text-success" />
                            <span>Mark Resolved</span>
                          </Button>
                        )}

                        <div className="ml-auto">
                          {isReplying ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyingDoubtId(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleSubmitReply(doubt.id)}
                              >
                                <Send className="h-3 w-3" />
                                <span>Send Reply</span>
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant={doubt.adminReply ? 'secondary' : 'primary'}
                              size="sm"
                              onClick={() => {
                                setReplyingDoubtId(doubt.id)
                                setReplyText(doubt.adminReply || '')
                              }}
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span>{doubt.adminReply ? 'Edit Reply' : 'Reply'}</span>
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Active Reply Input */}
                      {isReplying && (
                        <div className="pt-2">
                          <Textarea
                            placeholder="Write your guidance, instructions, or resolution for the employee..."
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tab 3: Follow-ups */}
      {activeTab === 'followups' && (
        <Card padding="md">
          <CardHeader
            title="Scheduled Client Check-ins"
            description="Reminders to call or follow-up regarding deliverables"
            action={
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsFollowupModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                <span>Schedule Follow-up</span>
              </Button>
            }
          />

          {!Array.isArray(projectFollowUps) || projectFollowUps.length === 0 ? (
            <p className="text-xs text-text-muted py-8 text-center">
              No follow-ups recorded for this project.
            </p>
          ) : (
            <div className="space-y-3">
              {(Array.isArray(projectFollowUps) ? projectFollowUps : []).map((fu) => (
                <div
                  key={fu.id}
                  className="p-3.5 rounded-xl border border-border bg-surface text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-text-primary">
                      {formatDateTime(fu.scheduledAt)}
                    </span>
                    <Badge variant={fu.status === 'done' ? 'green' : 'amber'} size="sm">
                      {fu.status}
                    </Badge>
                  </div>
                  {fu.notes && (
                    <p className="text-text-secondary leading-relaxed">{fu.notes}</p>
                  )}
                  <p className="text-[11px] text-text-muted pt-1 border-t border-border/60">
                    Assigned Owner: <strong className="text-text-secondary">{fu.assignedToName}</strong>
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Internal Notes */}
      {activeTab === 'notes' && (
        <Card padding="md">
          <CardHeader
            title="Project Notes & Activity Log"
            description="Private chronological communication between staff and management"
          />

          <form onSubmit={handleAddNote} className="mb-6 p-4 rounded-xl border border-border bg-surface space-y-3">
            <Textarea
              placeholder="Record client discussions, scope changes, milestone progress, or internal updates..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
              required
            />
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm">
                <Plus className="h-4 w-4" />
                <span>Post Note</span>
              </Button>
            </div>
          </form>

          <div className="space-y-3">
            {!Array.isArray(projectNotes) || projectNotes.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">
                No notes logged for this project yet.
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

      {/* Financials Modal */}
      <Modal
        isOpen={isFinancialModalOpen}
        onClose={() => setIsFinancialModalOpen(false)}
        title="Update Financial Details"
        description="Agreed client price and internal expenses for this project"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsFinancialModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveFinancials}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Project Budget (₹ agreed with client)"
            type="number"
            value={editBudget}
            onChange={(e) => setEditBudget(e.target.value)}
            leftIcon={<IndianRupee className="h-4 w-4" />}
            required
          />

          <Input
            label="Actual / Incurred Expenses (₹)"
            type="number"
            value={editCost}
            onChange={(e) => setEditCost(e.target.value)}
            leftIcon={<IndianRupee className="h-4 w-4" />}
            hint="Include ad spend, tooling costs, and external fees."
          />
        </div>
      </Modal>

      {/* Schedule Follow-up Modal */}
      <Modal
        isOpen={isFollowupModalOpen}
        onClose={() => setIsFollowupModalOpen(false)}
        title="Schedule Follow-up"
        description={`Set a reminder for ${client?.companyName || 'client'}`}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsFollowupModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateFollowup}
              disabled={!followupDate}
            >
              Save Follow-up
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Follow-up Date & Time"
            type="datetime-local"
            value={followupDate}
            onChange={(e) => setFollowupDate(e.target.value)}
            required
          />

          <div>
            <label className="text-sm font-medium text-text-primary block mb-1.5">
              Assigned Staff
            </label>
            <select
              value={followupAssignee}
              onChange={(e) => setFollowupAssignee(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text-primary"
            >
              <option value="admin">Admin (You)</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.designation})
                </option>
              ))}
            </select>
          </div>

          <Textarea
            label="Talking Points / Context"
            placeholder="e.g. Discuss campaign metrics, request keyword approval, or check review feedback..."
            value={followupNotes}
            onChange={(e) => setFollowupNotes(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>

      {/* Create Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Create New Project Task"
        description={`Define deliverable task for ${project.name}`}
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsTaskModalOpen(false)}
              disabled={isSavingTask}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateTask}
              isLoading={isSavingTask}
              disabled={!taskTitle.trim()}
            >
              Add Task
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <Input
            label="Task Title / Deliverable"
            placeholder="e.g. Conduct SEO Audit, Design Homepage Mockup, Write Ad Copy"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            required
            autoFocus
          />

          <Textarea
            label="Description & Instructions (optional)"
            placeholder="Provide specific guidelines, file links, or client preferences for this task..."
            value={taskDesc}
            onChange={(e) => setTaskDesc(e.target.value)}
            rows={3}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">
                Assign To Employee
              </label>
              <select
                value={taskAssignee}
                onChange={(e) => setTaskAssignee(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-white px-3 text-xs text-text-primary cursor-pointer"
              >
                <option value="">Unassigned (Assign later)</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.designation})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">
                Priority
              </label>
              <select
                value={taskPriority}
                onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                className="w-full h-10 rounded-lg border border-border bg-white px-3 text-xs text-text-primary cursor-pointer"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Due Date (optional)"
              type="date"
              value={taskDueDate}
              onChange={(e) => setTaskDueDate(e.target.value)}
            />

            <Input
              label="Est. Hours (optional)"
              type="number"
              placeholder="e.g. 8"
              value={taskEstHours}
              onChange={(e) => setTaskEstHours(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* View Task Punches / Work History Modal */}
      <Modal
        isOpen={isPunchesModalOpen}
        onClose={() => setIsPunchesModalOpen(false)}
        title="Task Work Time Logs & Punches"
        description={selectedTaskForPunches ? `Audit log for: ${selectedTaskForPunches.title}` : ''}
        size="lg"
      >
        <div className="space-y-4">
          {selectedTaskForPunches && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div>
                <p className="text-text-muted">Assigned Team Member:</p>
                <p className="font-semibold text-text-primary mt-0.5">
                  {employees.find((e) => e.id === selectedTaskForPunches.assignedToId)?.fullName || 'Unassigned'}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Total Recorded Time:</p>
                <p className="font-bold text-base text-brand-700 mt-0.5 font-mono">
                  {selectedTaskForPunches.totalLoggedMinutes || 0} minutes
                </p>
              </div>
              <div>
                <p className="text-text-muted">Total Sessions:</p>
                <p className="font-semibold text-text-primary mt-0.5">
                  {taskPunchesList.length} punch sessions
                </p>
              </div>
            </div>
          )}

          {loadingPunches ? (
            <div className="py-8 text-center text-xs text-text-muted">Loading punch records...</div>
          ) : taskPunchesList.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
              <Clock className="h-6 w-6 text-slate-300 mx-auto mb-1.5" />
              <p className="font-medium text-text-primary">No Punches Recorded Yet</p>
              <p className="mt-0.5">When staff starts and stops work on this task, individual punch sessions will log here.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {taskPunchesList.map((punch, idx) => {
                const durationMins = Math.round((punch.durationSeconds || 0) / 60)
                const empName = punch.employeeName || employees.find((e) => e.id === punch.employeeId)?.fullName || 'Staff'
                return (
                  <div key={punch.id || idx} className="p-3 rounded-xl border border-border bg-white text-xs space-y-1.5 hover:border-slate-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary">{empName}</span>
                        {punch.statusAtStop && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 capitalize">
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
                        <strong>Work Note:</strong> {punch.notes}
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
