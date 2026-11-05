'use client'

// app/admin/projects/[id]/page.tsx
// Admin Project Detail — 5-stage pipeline status changer, financial profit audit, doubts resolution thread, follow-ups, and notes.

import { useState, useMemo, Suspense } from 'react'
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
} from '@/components/ui'
import { ProjectPipelineStepper } from '@/components/common'
import {
  mockProjects,
  mockClients,
  mockEmployees,
  mockCategories,
  mockDoubts,
  mockFollowUps,
  mockNotes,
} from '@/lib/mock-data'
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
import type { ProjectStatus, ProjectPriority, DoubtPriority } from '@/lib/types'

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

  // Project state
  const initialProject = mockProjects.find((p) => p.id === projectId)
  const [project, setProject] = useState(initialProject)

  // Local state for tabs
  const [activeTab, setActiveTab] = useState('overview')

  // Doubts state
  const [projectDoubts, setProjectDoubts] = useState(
    mockDoubts.filter((d) => d.projectId === projectId),
  )
  const [replyingDoubtId, setReplyingDoubtId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  // Follow-ups state
  const [projectFollowUps, setProjectFollowUps] = useState(
    mockFollowUps.filter((f) => f.projectId === projectId),
  )
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false)
  const [followupDate, setFollowupDate] = useState('')
  const [followupNotes, setFollowupNotes] = useState('')
  const [followupAssignee, setFollowupAssignee] = useState('admin')

  // Notes state
  const [projectNotes, setProjectNotes] = useState(
    mockNotes.filter((n) => n.projectId === projectId),
  )
  const [newNote, setNewNote] = useState('')

  // Financial Edit Modal
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false)
  const [editBudget, setEditBudget] = useState(project?.budget?.toString() || '0')
  const [editCost, setEditCost] = useState(project?.actualCost?.toString() || '0')

  // Lookup data
  const client = project ? mockClients.find((c) => c.id === project.clientId) : null
  const primaryEmp = project?.primaryEmployeeId
    ? mockEmployees.find((e) => e.id === project.primaryEmployeeId)
    : null
  const categoryMap = useMemo(() => new Map(mockCategories.map((c) => [c.id, c])), [])

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
  function handleStatusChange(newStatus: ProjectStatus) {
    const updated = { ...project!, status: newStatus, updatedAt: new Date().toISOString() }
    setProject(updated)
  }

  // Update Financials
  function handleSaveFinancials(e: React.FormEvent) {
    e.preventDefault()
    const updated = {
      ...project!,
      budget: Number(editBudget) || 0,
      actualCost: editCost ? Number(editCost) : undefined,
      updatedAt: new Date().toISOString(),
    }
    setProject(updated)
    setIsFinancialModalOpen(false)
  }

  // Doubts: Submit Reply
  function handleSubmitReply(doubtId: string) {
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
    setReplyingDoubtId(null)
    setReplyText('')
  }

  // Doubts: Resolve
  function handleResolveDoubt(doubtId: string) {
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
  }

  // Follow-ups: Add
  function handleCreateFollowup(e: React.FormEvent) {
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
          : mockEmployees.find((e) => e.id === followupAssignee)?.fullName || 'Staff',
      notes: followupNotes.trim() || undefined,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    }

    mockFollowUps.unshift(newFU)
    setProjectFollowUps([newFU, ...projectFollowUps])
    setIsFollowupModalOpen(false)
    setFollowupDate('')
    setFollowupNotes('')
  }

  // Notes: Add
  function handleAddNote(e: React.FormEvent) {
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

    mockNotes.unshift(added)
    setProjectNotes([added, ...projectNotes])
    setNewNote('')
  }

  // Calculations
  const isLate = isOverdue(project.deliveryDate, project.status)
  const daysLeft = getDaysUntil(project.deliveryDate)
  const currentCost = project.actualCost || 0
  const netProfit = project.budget - currentCost
  const profitMargin = project.budget > 0 ? Math.round((netProfit / project.budget) * 100) : 0
  const openDoubtsCount = projectDoubts.filter((d) => d.status === 'open').length

  const tabs = [
    { id: 'overview', label: 'Overview & Scope' },
    { id: 'doubts', label: 'Doubts & Q&A', count: openDoubtsCount },
    { id: 'followups', label: 'Follow-ups', count: projectFollowUps.length },
    { id: 'notes', label: 'Internal Notes', count: projectNotes.length },
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
                  {project.serviceCategories.map((catId) => {
                    const cat = categoryMap.get(catId)
                    return (
                      <span
                        key={catId}
                        className="px-3 py-1 rounded-lg bg-brand-50 border border-brand-200 text-xs font-medium text-brand-700"
                      >
                        {cat?.name || catId}
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
                  <Link href={`/admin/clients/${client?.id}`}>
                    <Button variant="ghost" size="sm">
                      View Profile
                    </Button>
                  </Link>
                }
              />
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-text-muted">Company</p>
                  <p className="font-semibold text-sm text-text-primary mt-0.5">
                    {client?.companyName}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted">Contact Person</p>
                  <p className="font-medium text-text-primary mt-0.5">
                    {client?.fullName}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted">Phone Number</p>
                  <p className="font-medium text-text-primary mt-0.5">
                    {client?.phone}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted">Email</p>
                  <p className="font-medium text-brand-600 mt-0.5">
                    {client?.email}
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

                {project.additionalMemberIds && project.additionalMemberIds.length > 0 && (
                  <div>
                    <p className="text-text-muted mb-1.5">Collaborators</p>
                    <div className="space-y-1">
                      {project.additionalMemberIds.map((mId) => {
                        const m = mockEmployees.find((e) => e.id === mId)
                        return (
                          <div
                            key={mId}
                            className="p-1.5 rounded bg-surface border border-border text-xs flex items-center justify-between"
                          >
                            <span>{m?.fullName}</span>
                            <span className="text-text-muted text-[11px]">{m?.designation}</span>
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

      {/* Tab 2: Doubts & Q&A Thread (§4.4) */}
      {activeTab === 'doubts' && (
        <div className="space-y-4">
          <Card padding="md">
            <CardHeader
              title="Employee Doubts & Blockers"
              description="Questions submitted by employees working on this project"
            />

            {projectDoubts.length === 0 ? (
              <div className="py-12 text-center text-sm text-text-muted">
                <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2 opacity-80" />
                No doubts raised for this project. Everything is running smoothly!
              </div>
            ) : (
              <div className="space-y-4">
                {projectDoubts.map((doubt) => {
                  const emp = mockEmployees.find((e) => e.id === doubt.raisedById)
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

          {projectFollowUps.length === 0 ? (
            <p className="text-xs text-text-muted py-8 text-center">
              No follow-ups recorded for this project.
            </p>
          ) : (
            <div className="space-y-3">
              {projectFollowUps.map((fu) => (
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
            {projectNotes.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">
                No notes logged for this project yet.
              </p>
            ) : (
              projectNotes.map((note) => (
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
              {mockEmployees.map((emp) => (
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
    </ContentWrapper>
  )
}
