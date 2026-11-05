'use client'

// app/employee/projects/[id]/page.tsx
// Employee Project Workspace — task execution, status updates, raise doubt Q&A with admin, and notes.

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
import {
  mockProjects,
  mockClients,
  mockCategories,
  mockDoubts,
  mockNotes,
} from '@/lib/mock-data'
import {
  Briefcase,
  Building2,
  Calendar,
  Clock,
  AlertTriangle,
  MessageCircle,
  ArrowLeft,
  Plus,
  Send,
  Check,
  HelpCircle,
  CheckCircle2,
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
import type { ProjectStatus, ProjectPriority, DoubtPriority } from '@/lib/types'

export default function EmployeeProjectDetailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EmployeeProjectDetailContent />
    </Suspense>
  )
}

function EmployeeProjectDetailContent() {
  const params = useParams()
  const router = useRouter()
  const projectId = params?.id as string

  // Current employee: emp-1 (Priya Sharma)
  const currentEmpId = 'emp-1'

  const initialProject = mockProjects.find((p) => p.id === projectId)
  const [project, setProject] = useState(initialProject)

  const [activeTab, setActiveTab] = useState('scope')

  // Doubts state
  const [projectDoubts, setProjectDoubts] = useState(
    mockDoubts.filter((d) => d.projectId === projectId),
  )
  const [isDoubtModalOpen, setIsDoubtModalOpen] = useState(false)
  const [doubtSubject, setDoubtSubject] = useState('')
  const [doubtDescription, setDoubtDescription] = useState('')
  const [doubtPriority, setDoubtPriority] = useState<DoubtPriority>('normal')

  // Notes state
  const [projectNotes, setProjectNotes] = useState(
    mockNotes.filter((n) => n.projectId === projectId),
  )
  const [newNote, setNewNote] = useState('')

  // Lookups (Privacy Protected: Name + Company only)
  const client = project ? mockClients.find((c) => c.id === project.clientId) : null
  const categoryMap = useMemo(() => new Map(mockCategories.map((c) => [c.id, c])), [])

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
  function handleStatusChange(newStatus: ProjectStatus) {
    const updated = { ...project!, status: newStatus, updatedAt: new Date().toISOString() }
    setProject(updated)
  }

  // Submit Doubt to Admin
  function handleRaiseDoubt(e: React.FormEvent) {
    e.preventDefault()
    if (!doubtSubject.trim() || !doubtDescription.trim()) return

    const newDbt = {
      id: `dbt-${generateId()}`,
      projectId: project!.id,
      raisedById: currentEmpId,
      subject: doubtSubject.trim(),
      description: doubtDescription.trim(),
      priority: doubtPriority,
      status: 'open' as const,
      createdAt: new Date().toISOString(),
    }

    mockDoubts.unshift(newDbt)
    setProjectDoubts([newDbt, ...projectDoubts])
    setIsDoubtModalOpen(false)
    setDoubtSubject('')
    setDoubtDescription('')
    setActiveTab('doubts')
  }

  // Post Note
  function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNote.trim()) return

    const added = {
      id: `note-${generateId()}`,
      projectId: project!.id,
      authorId: currentEmpId,
      authorType: 'employee' as const,
      authorName: 'Priya Sharma',
      content: newNote.trim(),
      createdAt: new Date().toISOString(),
    }

    mockNotes.unshift(added)
    setProjectNotes([added, ...projectNotes])
    setNewNote('')
  }

  const isLate = isOverdue(project.deliveryDate, project.status)
  const daysLeft = getDaysUntil(project.deliveryDate)
  const myDoubtsCount = projectDoubts.filter((d) => d.status === 'open').length

  const tabs = [
    { id: 'scope', label: 'Scope & Guidelines' },
    { id: 'doubts', label: 'My Doubts & Questions', count: myDoubtsCount },
    { id: 'notes', label: 'Deliverable Notes', count: projectNotes.length },
  ]

  const statusPipeline: ProjectStatus[] = [
    'new',
    'in_progress',
    'under_review',
    'completed',
    'delivered',
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

      {/* Status Pipeline Tracker */}
      <Card padding="md" className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
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
              {getStatusLabel(project.status)}
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

        {/* Progress buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
          {statusPipeline.map((stage, idx) => {
            const isCurrent = project.status === stage
            const isPast =
              statusPipeline.indexOf(project.status) > idx || project.status === 'delivered'

            return (
              <button
                key={stage}
                type="button"
                onClick={() => handleStatusChange(stage)}
                className={`p-2.5 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  isCurrent
                    ? 'bg-brand-600 border-brand-600 text-white shadow-sm ring-2 ring-brand-500 ring-offset-1'
                    : isPast
                    ? 'bg-brand-50 border-brand-200 text-brand-900 hover:bg-brand-100'
                    : 'bg-white border-border text-text-muted hover:bg-surface hover:text-text-primary'
                }`}
              >
                <div className="flex items-center gap-1">
                  {isPast && !isCurrent ? (
                    <Check className="h-3 w-3 text-brand-700" />
                  ) : (
                    <span className="text-[10px] opacity-70">Step {idx + 1}</span>
                  )}
                </div>
                <span>{getStatusLabel(stage)}</span>
              </button>
            )
          })}
        </div>
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

      {/* Tab 1: Scope & Guidelines */}
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

            {projectDoubts.length === 0 ? (
              <div className="py-12 text-center text-sm text-text-muted">
                <CheckCircle2 className="h-8 w-8 text-success mx-auto mb-2 opacity-80" />
                No doubts submitted for this project. If you hit any roadblock, click &quot;Ask a Question&quot; above.
              </div>
            ) : (
              <div className="space-y-4">
                {projectDoubts.map((doubt) => (
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
            {projectNotes.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">
                No updates posted yet.
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
    </ContentWrapper>
  )
}
