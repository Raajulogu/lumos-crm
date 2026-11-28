'use client'

// app/admin/projects/[id]/page.tsx
// Admin Project Detail — 5-stage pipeline status changer, financial profit audit, doubts resolution thread, follow-ups, and notes.

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
import { SearchBar, MultiEmployeeSelect } from '@/components/common'
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
  ProjectTask,
  TaskPunch,
  TaskPriority,
  TaskStatus,
} from '@/lib/types'
import {
  Clock,
  IndianRupee,
  CheckCircle2,
  MessageCircle,
  Phone,
  ArrowLeft,
  Plus,
  Send,
  Bell,
  Check,
  CheckSquare,
  Square,
  Trash2,
  UserCheck,
  History,
  ListTodo,
  Pencil,
  Calendar,
  Eye,
  EyeOff,
} from 'lucide-react'
import {
  formatDate,
  formatDateTime,
  formatCurrency,
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
  const [followupVisibleToEmp, setFollowupVisibleToEmp] = useState(true)
  const [followupHideDetails, setFollowupHideDetails] = useState(false)

  // Notes state
  const [projectNotes, setProjectNotes] = useState<Note[]>([])
  const [newNote, setNewNote] = useState('')

  // Financial & Single Metric Edit Modals
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false)
  const [financialEditMode, setFinancialEditMode] = useState<'all' | 'budget' | 'cost'>('all')
  const [editBudget, setEditBudget] = useState('0')
  const [editCost, setEditCost] = useState('0')

  // Deadline Status Edit Modal
  const [isDeadlineModalOpen, setIsDeadlineModalOpen] = useState(false)
  const [editDeliveryDate, setEditDeliveryDate] = useState('')
  const [editDeadlineStatus, setEditDeadlineStatus] = useState('')
  const [editProjectStatus, setEditProjectStatus] = useState<ProjectStatus>('new')

  // Tasks state
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([])
  const [taskSearch, setTaskSearch] = useState('')
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [bulkAssigneeIds, setBulkAssigneeIds] = useState<string[]>([])
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<ProjectTask | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<string[]>([])
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium')
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('todo')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskEstHours, setTaskEstHours] = useState('')
  const [isSavingTask, setIsSavingTask] = useState(false)

  // View Full Task Details Modal
  const [viewingTask, setViewingTask] = useState<ProjectTask | null>(null)

  // Punches history modal
  const [isPunchesModalOpen, setIsPunchesModalOpen] = useState(false)
  const [selectedTaskForPunches, setSelectedTaskForPunches] = useState<ProjectTask | null>(null)
  const [taskPunchesList, setTaskPunchesList] = useState<TaskPunch[]>([])
  const [loadingPunches, setLoadingPunches] = useState(false)

  useEffect(() => {
    let mounted = true

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
          setEditDeliveryDate(
            p.deliveryDate ? new Date(p.deliveryDate).toISOString().split('T')[0] : '',
          )
          setEditDeadlineStatus(p.deadlineStatus || '')
          setEditProjectStatus(p.status)
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
  const extendedProject = project as
    | (Project & {
        client?: Client
        clientName?: string
        clientContact?: string
        primaryEmployee?: Employee
      })
    | null

  const client =
    extendedProject?.client ||
    (project
      ? clients.find((c) => (c.id || (c as unknown as { _id?: string })._id) === project.clientId)
      : null)
  const primaryEmp =
    extendedProject?.primaryEmployee ||
    (project?.primaryEmployeeId
      ? employees.find(
          (e) => (e.id || (e as unknown as { _id?: string })._id) === project.primaryEmployeeId,
        )
      : null)
  const categoryMap = useMemo(
    () =>
      new Map(
        categories.map((c) => [c.id || (c as unknown as { _id?: string })._id || '', c]),
      ),
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

  // Update Financials (Budget / Cost / Both)
  async function handleSaveFinancials(e: React.FormEvent) {
    e.preventDefault()
    const numBudget =
      financialEditMode === 'cost' ? project!.budget : Number(editBudget) || 0
    const numCost =
      financialEditMode === 'budget'
        ? project!.actualCost
        : editCost !== ''
        ? Number(editCost)
        : undefined

    const updated = {
      ...project!,
      budget: numBudget,
      agreedBudget: numBudget,
      actualCost: numCost,
      incurredCost: numCost,
      updatedAt: new Date().toISOString(),
    }
    setProject(updated)
    setIsFinancialModalOpen(false)

    try {
      await api.projects.patchDetails(project!.id, {
        ...(financialEditMode !== 'cost'
          ? { agreedBudget: numBudget, budget: numBudget }
          : {}),
        ...(financialEditMode !== 'budget'
          ? { incurredCost: numCost, actualCost: numCost }
          : {}),
      })
    } catch {}
  }

  // Update Deadline & Status
  async function handleSaveDeadline(e: React.FormEvent) {
    e.preventDefault()
    if (!editDeliveryDate) return
    const isoDeadline = new Date(editDeliveryDate).toISOString()

    const updated: Project = {
      ...project!,
      deliveryDate: isoDeadline,
      deadlineStatus: editDeadlineStatus.trim() || undefined,
      status: editProjectStatus,
      updatedAt: new Date().toISOString(),
    }
    setProject(updated)
    setIsDeadlineModalOpen(false)

    try {
      await api.projects.patchDetails(project!.id, {
        deliveryDate: isoDeadline,
        deadline: isoDeadline,
        deadlineStatus: editDeadlineStatus.trim() || undefined,
        status: editProjectStatus,
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

    const newFU: FollowUp = {
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
      isVisibleToEmployee: followupVisibleToEmp,
      hideDetailsFromEmployee: followupHideDetails,
      createdAt: new Date().toISOString(),
    }

    setProjectFollowUps([newFU, ...projectFollowUps])
    setIsFollowupModalOpen(false)
    const scheduledIso = newFU.scheduledAt
    const notesVal = newFU.notes
    const vis = followupVisibleToEmp
    const hide = followupHideDetails
    setFollowupDate('')
    setFollowupNotes('')
    setFollowupVisibleToEmp(true)
    setFollowupHideDetails(false)

    try {
      await api.followups.create({
        projectId: project!.id,
        clientId: project!.clientId,
        scheduledAt: scheduledIso,
        assignedToId: followupAssignee,
        notes: notesVal,
        isVisibleToEmployee: vis,
        hideDetailsFromEmployee: hide,
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

  function openCreateTaskModal() {
    setEditingTask(null)
    setTaskTitle('')
    setTaskDesc('')
    setTaskAssigneeIds([])
    setTaskPriority('medium')
    setTaskStatus('todo')
    setTaskDueDate('')
    setTaskEstHours('')
    setIsTaskModalOpen(true)
  }

  function openEditTaskModal(task: ProjectTask) {
    setEditingTask(task)
    setTaskTitle(task.title)
    setTaskDesc(task.description || '')
    const existingIds =
      task.assigneeIds && task.assigneeIds.length > 0
        ? task.assigneeIds
        : task.assignedToId
        ? [task.assignedToId]
        : []
    setTaskAssigneeIds(existingIds)
    setTaskPriority(task.priority || 'medium')
    setTaskStatus(task.status || 'todo')
    setTaskDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '')
    setTaskEstHours(task.estimatedHours ? String(task.estimatedHours) : '')
    setIsTaskModalOpen(true)
  }

  // Tasks: Create or Edit
  async function handleSaveTask(e: React.FormEvent) {
    e.preventDefault()
    if (!taskTitle.trim()) return
    setIsSavingTask(true)

    const assignedStaffObjs = employees
      .filter((emp) => taskAssigneeIds.includes(emp.id))
      .map((emp) => ({
        id: emp.id,
        fullName: emp.fullName,
        designation: emp.designation,
        email: emp.email,
      }))

    try {
      if (editingTask) {
        const updated = await api.tasks.update(editingTask.id, projectId, {
          title: taskTitle.trim(),
          description: taskDesc.trim() || undefined,
          assigneeIds: taskAssigneeIds,
          assignedToId: taskAssigneeIds[0] || null,
          assignees: assignedStaffObjs,
          priority: taskPriority,
          status: taskStatus,
          dueDate: taskDueDate || undefined,
          estimatedHours: taskEstHours ? Number(taskEstHours) : undefined,
        })
        setProjectTasks((prev) =>
          prev.map((t) =>
            t.id === editingTask.id
              ? {
                  ...t,
                  ...updated,
                  assigneeIds: taskAssigneeIds,
                  assignees: assignedStaffObjs,
                  assignedToId: taskAssigneeIds[0] || null,
                  assignedTo: assignedStaffObjs[0] || null,
                }
              : t,
          ),
        )
      } else {
        const created = await api.tasks.create(projectId, {
          title: taskTitle.trim(),
          description: taskDesc.trim() || undefined,
          assigneeIds: taskAssigneeIds,
          assignedToId: taskAssigneeIds[0] || null,
          assignees: assignedStaffObjs,
          priority: taskPriority,
          status: taskStatus,
          startDate: new Date().toISOString(),
          dueDate: taskDueDate || undefined,
          estimatedHours: taskEstHours ? Number(taskEstHours) : undefined,
        })

        const taskWithEmp: ProjectTask = {
          ...created,
          startDate: created.startDate || created.createdAt || new Date().toISOString(),
          assigneeIds: taskAssigneeIds,
          assignees: assignedStaffObjs,
          assignedToId: taskAssigneeIds[0] || null,
          assignedTo: assignedStaffObjs[0] || null,
        }
        setProjectTasks((prev) => [taskWithEmp, ...prev])
      }

      setIsTaskModalOpen(false)
      setEditingTask(null)
    } finally {
      setIsSavingTask(false)
    }
  }

  // Tasks: Inline Multiple Staff Reassign
  async function handleReassignMultiple(taskId: string, empIds: string[]) {
    const staffObjs = employees
      .filter((e) => empIds.includes(e.id))
      .map((e) => ({
        id: e.id,
        fullName: e.fullName,
        designation: e.designation,
        email: e.email,
      }))

    setProjectTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              assigneeIds: empIds,
              assignees: staffObjs,
              assignedToId: empIds[0] || null,
              assignedTo: staffObjs[0] || null,
            }
          : t,
      ),
    )

    try {
      await api.tasks.assignMultiple(taskId, projectId, empIds, staffObjs)
    } catch {}
  }

  // Tasks: Bulk Assign (Multiple Employees)
  async function handleBulkAssign() {
    if (selectedTaskIds.length === 0) return
    const staffObjs = employees
      .filter((e) => bulkAssigneeIds.includes(e.id))
      .map((e) => ({
        id: e.id,
        fullName: e.fullName,
        designation: e.designation,
        email: e.email,
      }))

    const targetTaskIds = [...selectedTaskIds]
    setProjectTasks((prev) =>
      prev.map((t) =>
        targetTaskIds.includes(t.id)
          ? {
              ...t,
              assigneeIds: bulkAssigneeIds,
              assignees: staffObjs,
              assignedToId: bulkAssigneeIds[0] || null,
              assignedTo: staffObjs[0] || null,
            }
          : t,
      ),
    )
    setSelectedTaskIds([])

    try {
      await api.tasks.bulkAssignMultiple(targetTaskIds, projectId, bulkAssigneeIds, staffObjs)
    } catch {}
  }

  // Tasks: Toggle Select All
  function handleToggleSelectAll(visibleTasks: ProjectTask[]) {
    if (selectedTaskIds.length === visibleTasks.length && visibleTasks.length > 0) {
      setSelectedTaskIds([])
    } else {
      setSelectedTaskIds(visibleTasks.map((t) => t.id))
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

  const getTaskAssigneeIds = (task: ProjectTask): string[] => {
    if (Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0) return task.assigneeIds
    if (task.assignedToId) return [task.assignedToId]
    return []
  }

  const getTaskAssigneeNames = (task: ProjectTask): string[] => {
    const ids = getTaskAssigneeIds(task)
    if (ids.length === 0) return []
    return ids.map((id) => {
      const fromTask = task.assignees?.find((a) => a.id === id)
      if (fromTask?.fullName) return fromTask.fullName
      const fromEmp = employees.find((e) => e.id === id)
      if (fromEmp?.fullName) return fromEmp.fullName
      if (task.assignedTo?.id === id && task.assignedTo.fullName) return task.assignedTo.fullName
      return 'Staff'
    })
  }

  const filteredTasks = projectTasks.filter((t) => {
    if (!taskSearch.trim()) return true
    const q = taskSearch.trim().toLowerCase()
    const names = getTaskAssigneeNames(t).join(' ').toLowerCase()
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      names.includes(q) ||
      t.status.toLowerCase().includes(q)
    )
  })

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
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                project.priority,
              )}`}
            >
              {getPriorityLabel(project.priority)}
            </span>
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
              onClick={() => {
                setFinancialEditMode('all')
                setEditBudget(project.budget?.toString() || '0')
                setEditCost(project.actualCost?.toString() || '0')
                setIsFinancialModalOpen(true)
              }}
            >
              <IndianRupee className="h-4 w-4" />
              <span>Financials</span>
            </Button>
          </div>
        }
      />

      {/* Metric Cards: Budget, Cost, Profit, Deadline */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card padding="md">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-text-muted">Agreed Budget</p>
            <button
              type="button"
              onClick={() => {
                setFinancialEditMode('budget')
                setEditBudget(project.budget?.toString() || '0')
                setIsFinancialModalOpen(true)
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors cursor-pointer"
              title="Edit Agreed Budget"
            >
              <Pencil className="h-3 w-3" />
              <span>Edit</span>
            </button>
          </div>
          <p className="text-xl font-bold text-text-primary mt-1">
            {formatCurrency(project.budget)}
          </p>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-text-muted">Incurred Cost</p>
            <button
              type="button"
              onClick={() => {
                setFinancialEditMode('cost')
                setEditCost(project.actualCost?.toString() || '0')
                setIsFinancialModalOpen(true)
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors cursor-pointer"
              title="Edit Incurred Cost"
            >
              <Pencil className="h-3 w-3" />
              <span>Edit</span>
            </button>
          </div>
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-text-muted">Deadline Status</p>
            <button
              type="button"
              onClick={() => {
                setEditDeliveryDate(
                  project.deliveryDate
                    ? new Date(project.deliveryDate).toISOString().split('T')[0]
                    : '',
                )
                setEditDeadlineStatus(project.deadlineStatus || '')
                setEditProjectStatus(project.status)
                setIsDeadlineModalOpen(true)
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors cursor-pointer"
              title="Edit Deadline Status"
            >
              <Pencil className="h-3 w-3" />
              <span>Edit</span>
            </button>
          </div>
          <div suppressHydrationWarning>
            <p
              className={`text-base font-bold mt-1 ${
                isLate ? 'text-danger' : 'text-text-primary'
              }`}
            >
              {formatDate(project.deliveryDate)}
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {project.deadlineStatus
                ? project.deadlineStatus
                : isLate
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
                    {client?.companyName || extendedProject?.clientName || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted">Contact Person</p>
                  <p className="font-medium text-text-primary mt-0.5">
                    {client?.fullName || extendedProject?.clientContact || 'N/A'}
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
                      {project.additionalMemberIds.map((mItem: unknown) => {
                        const mObj =
                          typeof mItem === 'object' && mItem !== null
                            ? (mItem as { id?: string; _id?: string; fullName?: string; designation?: string })
                            : null
                        const mId = mObj ? mObj.id || mObj._id || '' : String(mItem)
                        const m =
                          mObj ||
                          employees.find(
                            (e: Employee) =>
                              (e.id || (e as unknown as { _id?: string })._id) === mId,
                          )
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
                  Click any deliverable for full details. Assign one or multiple staff members to each task.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <SearchBar
                  value={taskSearch}
                  onChange={setTaskSearch}
                  placeholder="Search tasks or staff..."
                  className="w-full sm:w-64"
                />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={openCreateTaskModal}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Task</span>
                </Button>
              </div>
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
                  {projectTasks.filter((t) => getTaskAssigneeIds(t).length === 0).length}
                </p>
              </div>
            </div>

            {/* Bulk Selection Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-surface border border-border mb-3 text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleSelectAll(filteredTasks)}
                  className="flex items-center gap-1.5 font-medium text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  {selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0 ? (
                    <CheckSquare className="h-4 w-4 text-brand-600" />
                  ) : (
                    <Square className="h-4 w-4 text-text-muted" />
                  )}
                  <span>Select All Tasks ({filteredTasks.length})</span>
                </button>

                {selectedTaskIds.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 font-semibold text-[11px]">
                    {selectedTaskIds.length} selected
                  </span>
                )}
              </div>

              {selectedTaskIds.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-text-muted hidden sm:inline">Assign selected to:</span>
                  <MultiEmployeeSelect
                    employees={employees}
                    selectedIds={bulkAssigneeIds}
                    onChange={setBulkAssigneeIds}
                    placeholder="Choose staff..."
                    compact
                    className="w-52"
                  />

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleBulkAssign}
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    <span>{bulkAssigneeIds.length === 0 ? 'Unassign Selected' : 'Assign at Once'}</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Task Items List */}
            {filteredTasks.length === 0 ? (
              <div className="py-12 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
                <ListTodo className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-text-primary text-sm">
                  {taskSearch ? 'No Matching Tasks Found' : '0 Tasks Defined'}
                </p>
                <p className="mt-1 max-w-sm mx-auto">
                  {taskSearch
                    ? `No tasks matched "${taskSearch}". Try another search keyword.`
                    : 'Create granular deliverables for this campaign and assign them to specific team members.'}
                </p>
                {taskSearch ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setTaskSearch('')}
                    className="mt-3"
                  >
                    Clear Search
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={openCreateTaskModal}
                    className="mt-3"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create First Task</span>
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Mobile Card List (< 768px) */}
                <div className="grid grid-cols-1 gap-3 md:hidden">
                  {filteredTasks.map((task) => {
                    const isSelected = selectedTaskIds.includes(task.id)
                    const isTaskLate = task.dueDate
                      ? new Date(task.dueDate) < new Date() && task.status !== 'completed'
                      : false
                    const currentAssigneeIds = getTaskAssigneeIds(task)

                    return (
                      <div
                        key={task.id}
                        className="p-3.5 rounded-xl border border-border bg-white space-y-3 text-xs"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedTaskIds((prev) =>
                                  isSelected
                                    ? prev.filter((id) => id !== task.id)
                                    : [...prev, task.id],
                                )
                              }
                              className="mt-0.5 cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="h-4 w-4 text-brand-600" />
                              ) : (
                                <Square className="h-4 w-4 text-text-muted" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setViewingTask(task)}
                              className="text-left min-w-0 cursor-pointer"
                            >
                              <p className="font-semibold text-sm text-text-primary hover:text-brand-600 underline-offset-2 hover:underline">
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                                  {task.description}
                                </p>
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => openEditTaskModal(task)}
                              className="p-1.5 rounded text-text-muted hover:text-brand-600 hover:bg-brand-50 cursor-pointer"
                              aria-label="Edit task"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-1.5 rounded text-text-muted hover:text-danger hover:bg-danger-light cursor-pointer"
                              aria-label="Delete task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
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
                          <span className="text-[11px] text-text-muted">
                            Started: {formatDate(task.startDate || task.createdAt)}
                          </span>
                          {task.dueDate && (
                            <span
                              className={`text-[11px] ${
                                isTaskLate ? 'text-danger font-semibold' : 'text-text-muted'
                              }`}
                            >
                              Due: {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
                          <div className="flex-1 min-w-0">
                            <MultiEmployeeSelect
                              employees={employees}
                              selectedIds={currentAssigneeIds}
                              onChange={(ids) => handleReassignMultiple(task.id, ids)}
                              placeholder="Assign staff..."
                              compact
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenPunches(task)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-border text-text-secondary cursor-pointer"
                          >
                            <Clock className="h-3 w-3" />
                            <span className="font-mono">{task.totalLoggedMinutes || 0}m</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Desktop Table View (>= 768px) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs text-text-secondary">
                    <thead className="bg-surface border-b border-border text-text-primary font-semibold">
                      <tr>
                        <th className="py-3 px-3 w-8"></th>
                        <th className="py-3 px-3">Task Deliverable</th>
                        <th className="py-3 px-3">Assigned Staff</th>
                        <th className="py-3 px-3">Priority</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Start Date</th>
                        <th className="py-3 px-3">Due Date</th>
                        <th className="py-3 px-3">Time Punches</th>
                        <th className="py-3 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-white">
                      {filteredTasks.map((task) => {
                        const isSelected = selectedTaskIds.includes(task.id)
                        const isTaskLate = task.dueDate
                          ? new Date(task.dueDate) < new Date() && task.status !== 'completed'
                          : false
                        const currentAssigneeIds = getTaskAssigneeIds(task)

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
                                aria-label={`Select ${task.title}`}
                              >
                                {isSelected ? (
                                  <CheckSquare className="h-4 w-4 text-brand-600" />
                                ) : (
                                  <Square className="h-4 w-4 text-text-muted" />
                                )}
                              </button>
                            </td>

                            <td className="py-3 px-3 max-w-[230px]">
                              <button
                                type="button"
                                onClick={() => setViewingTask(task)}
                                className="text-left w-full group cursor-pointer"
                                title="Click to view full task details"
                              >
                                <p className="font-semibold text-text-primary text-sm truncate group-hover:text-brand-600 group-hover:underline">
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                                    {task.description}
                                  </p>
                                )}
                              </button>
                            </td>

                            <td className="py-3 px-3 min-w-[200px]">
                              <MultiEmployeeSelect
                                employees={employees}
                                selectedIds={currentAssigneeIds}
                                onChange={(ids) => handleReassignMultiple(task.id, ids)}
                                placeholder="Assign staff..."
                                compact
                              />
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
                                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${
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

                            <td className="py-3 px-3 whitespace-nowrap text-text-secondary">
                              <span suppressHydrationWarning>
                                {formatDate(task.startDate || task.createdAt)}
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

                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditTaskModal(task)}
                                  className="p-1.5 rounded text-text-muted hover:text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
                                  title="Edit task"
                                  aria-label={`Edit ${task.title}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1.5 rounded text-text-muted hover:text-danger hover:bg-danger-light transition-colors cursor-pointer"
                                  title="Delete task"
                                  aria-label={`Delete ${task.title}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
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
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-text-primary">
                      {formatDateTime(fu.scheduledAt)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {fu.isVisibleToEmployee === false && (
                        <Badge variant="gray" size="sm">Hidden from Staff</Badge>
                      )}
                      {fu.evaluation && (
                        <Badge variant="blue" size="sm">
                          ★ {fu.evaluation.rating}/5 {fu.evaluation.properlyCompleted ? '• Verified' : '• Partial'}
                        </Badge>
                      )}
                      <Badge variant={fu.status === 'done' ? 'green' : 'amber'} size="sm">
                        {fu.status}
                      </Badge>
                    </div>
                  </div>
                  {fu.notes && (
                    <p className="text-text-secondary leading-relaxed">{fu.notes}</p>
                  )}
                  {fu.evaluation?.comments && (
                    <p className="text-[11px] bg-white p-2 rounded-lg border border-border/70 text-text-secondary">
                      <strong className="text-text-primary">Call Evaluation:</strong> {fu.evaluation.comments}
                    </p>
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

      {/* Financials Modal (supports Budget-only, Cost-only, or Both) */}
      <Modal
        isOpen={isFinancialModalOpen}
        onClose={() => setIsFinancialModalOpen(false)}
        title={
          financialEditMode === 'budget'
            ? 'Edit Agreed Project Budget'
            : financialEditMode === 'cost'
            ? 'Edit Incurred Project Cost'
            : 'Update Financial Details'
        }
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
          {financialEditMode !== 'cost' && (
            <Input
              label="Agreed Project Budget (₹)"
              type="number"
              value={editBudget}
              onChange={(e) => setEditBudget(e.target.value)}
              leftIcon={<IndianRupee className="h-4 w-4" />}
              required
              autoFocus={financialEditMode === 'budget'}
            />
          )}

          {financialEditMode !== 'budget' && (
            <Input
              label="Incurred / Actual Expenses (₹)"
              type="number"
              value={editCost}
              onChange={(e) => setEditCost(e.target.value)}
              leftIcon={<IndianRupee className="h-4 w-4" />}
              hint="Include ad spend, tooling costs, and external fees."
              autoFocus={financialEditMode === 'cost'}
            />
          )}
        </div>
      </Modal>

      {/* Edit Deadline Status Modal */}
      <Modal
        isOpen={isDeadlineModalOpen}
        onClose={() => setIsDeadlineModalOpen(false)}
        title="Edit Project Deadline & Status"
        description="Update delivery target date and deadline tracking status"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDeadlineModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveDeadline}
              disabled={!editDeliveryDate}
            >
              Save Deadline
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Delivery Deadline Date"
            type="date"
            value={editDeliveryDate}
            onChange={(e) => setEditDeliveryDate(e.target.value)}
            required
          />

          <div>
            <label className="text-sm font-medium text-text-primary block mb-1.5">
              Project Status
            </label>
            <select
              value={editProjectStatus}
              onChange={(e) => setEditProjectStatus(e.target.value as ProjectStatus)}
              className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text-primary"
            >
              <option value="new">New</option>
              <option value="in_progress">In Progress</option>
              <option value="under_review">Under Review</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>

          <Input
            label="Custom Deadline Status Note (optional)"
            placeholder="e.g. Extended by client, On schedule"
            value={editDeadlineStatus}
            onChange={(e) => setEditDeadlineStatus(e.target.value)}
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

          <div className="p-3 rounded-xl bg-surface border border-border space-y-2 text-xs">
            <p className="font-semibold text-text-primary flex items-center gap-1.5">
              {followupVisibleToEmp ? <Eye className="h-3.5 w-3.5 text-brand-600" /> : <EyeOff className="h-3.5 w-3.5 text-text-muted" />}
              <span>Employee Portal Visibility Controls</span>
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={followupVisibleToEmp}
                onChange={(e) => setFollowupVisibleToEmp(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border text-brand-600"
              />
              <span className="text-text-secondary">Show this follow-up to the assigned employee</span>
            </label>
            {followupVisibleToEmp && (
              <label className="flex items-center gap-2 cursor-pointer pl-5">
                <input
                  type="checkbox"
                  checked={followupHideDetails}
                  onChange={(e) => setFollowupHideDetails(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border text-brand-600"
                />
                <span className="text-text-secondary">Hide confidential talking points/notes from employee</span>
              </label>
            )}
          </div>
        </div>
      </Modal>

      {/* Create / Edit Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title={editingTask ? 'Edit Project Task' : 'Create New Project Task'}
        description={
          editingTask
            ? `Modify details & staff assignments for ${editingTask.title}`
            : `Define deliverable task for ${project.name}`
        }
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
              onClick={handleSaveTask}
              isLoading={isSavingTask}
              disabled={!taskTitle.trim()}
            >
              {editingTask ? 'Save Task Changes' : 'Add Task'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveTask} className="space-y-4">
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

          <div>
            <label className="text-xs font-semibold text-text-primary block mb-1.5">
              Assign Staff Members (Select One or More)
            </label>
            <MultiEmployeeSelect
              employees={employees}
              selectedIds={taskAssigneeIds}
              onChange={setTaskAssigneeIds}
              placeholder="Select one or multiple employees..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1">
                Status
              </label>
              <select
                value={taskStatus}
                onChange={(e) => setTaskStatus(e.target.value as TaskStatus)}
                className="w-full h-10 rounded-lg border border-border bg-white px-3 text-xs text-text-primary cursor-pointer"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
                <option value="blocked">Blocked</option>
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

          {editingTask && (
            <div className="p-2.5 rounded-lg bg-surface border border-border text-xs flex items-center justify-between">
              <span className="text-text-muted flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>Auto-Captured Start Date (Read-only):</span>
              </span>
              <span className="font-semibold text-text-primary" suppressHydrationWarning>
                {formatDateTime(editingTask.startDate || editingTask.createdAt)}
              </span>
            </div>
          )}
        </form>
      </Modal>

      {/* Full Task Details Modal (opened when clicking task name) */}
      <Modal
        isOpen={!!viewingTask}
        onClose={() => setViewingTask(null)}
        title={viewingTask?.title || 'Task Details'}
        description={`Project: ${project.name}`}
        size="lg"
        footer={
          viewingTask && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const t = viewingTask
                  setViewingTask(null)
                  handleOpenPunches(t)
                }}
              >
                <History className="h-3.5 w-3.5" />
                <span>View Punches ({viewingTask.totalLoggedMinutes || 0}m)</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const t = viewingTask
                  setViewingTask(null)
                  openEditTaskModal(t)
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Task</span>
              </Button>
            </>
          )
        }
      >
        {viewingTask && (
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-full font-semibold border capitalize ${
                  viewingTask.status === 'completed'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : viewingTask.status === 'review'
                    ? 'bg-purple-50 text-purple-800 border-purple-200'
                    : viewingTask.status === 'in_progress'
                    ? 'bg-blue-50 text-blue-800 border-blue-200'
                    : viewingTask.status === 'blocked'
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                Status: {viewingTask.status.replace('_', ' ')}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-medium ${getPriorityColor(
                  viewingTask.priority,
                )}`}
              >
                Priority: {getPriorityLabel(viewingTask.priority)}
              </span>
            </div>

            <div>
              <p className="font-semibold text-text-muted uppercase tracking-wider text-[11px] mb-1">
                Instructions & Deliverable Description
              </p>
              <div className="p-3.5 rounded-xl bg-surface border border-border text-text-secondary whitespace-pre-line leading-relaxed">
                {viewingTask.description || 'No detailed description provided for this task.'}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <p className="text-text-muted">Start Date (Auto)</p>
                <p className="font-semibold text-text-primary mt-0.5" suppressHydrationWarning>
                  {formatDateTime(viewingTask.startDate || viewingTask.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Due Date</p>
                <p className="font-semibold text-text-primary mt-0.5" suppressHydrationWarning>
                  {viewingTask.dueDate ? formatDate(viewingTask.dueDate) : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Est. Hours</p>
                <p className="font-semibold text-text-primary mt-0.5">
                  {viewingTask.estimatedHours ? `${viewingTask.estimatedHours}h` : '—'}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Time Logged</p>
                <p className="font-bold font-mono text-brand-700 mt-0.5">
                  {viewingTask.totalLoggedMinutes || 0} mins
                </p>
              </div>
            </div>

            <div>
              <p className="font-semibold text-text-muted uppercase tracking-wider text-[11px] mb-1.5">
                Assigned Staff ({getTaskAssigneeNames(viewingTask).length})
              </p>
              {getTaskAssigneeNames(viewingTask).length === 0 ? (
                <p className="text-text-muted italic">Currently unassigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {getTaskAssigneeIds(viewingTask).map((empId) => {
                    const emp = employees.find((e) => e.id === empId)
                    return (
                      <div
                        key={empId}
                        className="px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-900 font-medium"
                      >
                        {emp?.fullName || 'Team Member'}
                        {emp?.designation ? ` • ${emp.designation}` : ''}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
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
