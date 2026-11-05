'use client'

// app/admin/clients/[id]/page.tsx
// Client Detail Page — full client 360 overview with project history, financial totals, follow-ups, and notes.

import { useState, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, Badge, Button, Input, Textarea, Modal, PageLoader } from '@/components/ui'
import {
  mockClients,
  mockProjects,
  mockFollowUps,
  mockNotes,
  mockEmployees,
} from '@/lib/mock-data'
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  Plus,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import {
  formatDate,
  formatCurrency,
  getStatusLabel,
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
  isOverdue,
  generateId,
} from '@/lib/utils'

export default function ClientDetailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ClientDetailContent />
    </Suspense>
  )
}

function ClientDetailContent() {
  const params = useParams()
  const router = useRouter()
  const clientId = params?.id as string

  const client = mockClients.find((c) => c.id === clientId)
  const clientProjects = mockProjects.filter((p) => p.clientId === clientId)
  const clientFollowUps = mockFollowUps.filter((f) => f.clientId === clientId)

  // Local state for interactive notes
  const [notesList, setNotesList] = useState(
    mockNotes.filter((n) => clientProjects.some((p) => p.id === n.projectId)),
  )
  const [newNoteContent, setNewNoteContent] = useState('')
  const [isAddingNote, setIsAddingNote] = useState(false)

  // Follow-up modal
  const [isFollowupModalOpen, setIsFollowupModalOpen] = useState(false)
  const [followupDate, setFollowupDate] = useState('')
  const [followupNotes, setFollowupNotes] = useState('')
  const [followupAssignedTo, setFollowupAssignedTo] = useState('admin')
  const [followupProjectId, setFollowupProjectId] = useState(clientProjects[0]?.id || '')

  if (!client) {
    return (
      <ContentWrapper>
        <Card padding="lg" className="text-center py-12">
          <p className="text-base font-semibold text-text-primary">Client Not Found</p>
          <p className="text-sm text-text-muted mt-1">
            The client account you are looking for does not exist or was deleted.
          </p>
          <Link href="/admin/clients" className="inline-block mt-4">
            <Button variant="primary" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Return to Client List
            </Button>
          </Link>
        </Card>
      </ContentWrapper>
    )
  }

  // Calculations
  const deliveredProjects = clientProjects.filter((p) => p.status === 'delivered')
  const inProgressProjects = clientProjects.filter(
    (p) => p.status === 'in_progress' || p.status === 'under_review' || p.status === 'new',
  )
  const totalBilled = clientProjects.reduce((sum, p) => sum + p.budget, 0)
  const totalCost = clientProjects.reduce((sum, p) => sum + (p.actualCost || 0), 0)
  const estimatedProfit = totalBilled - totalCost

  function handleAddNote(e: React.FormEvent) {
    e.preventDefault()
    if (!newNoteContent.trim()) return

    const newNote = {
      id: `note-${generateId()}`,
      projectId: clientProjects[0]?.id || 'general',
      authorId: 'admin',
      authorType: 'admin' as const,
      authorName: 'Admin',
      content: newNoteContent.trim(),
      createdAt: new Date().toISOString(),
    }

    setNotesList([newNote, ...notesList])
    setNewNoteContent('')
    setIsAddingNote(false)
  }

  function handleCreateFollowup(e: React.FormEvent) {
    e.preventDefault()
    if (!followupDate || !client) return

    const newFollowup = {
      id: `fu-${generateId()}`,
      projectId: followupProjectId || clientProjects[0]?.id || '',
      clientId: client.id,
      scheduledAt: new Date(followupDate).toISOString(),
      assignedToId: followupAssignedTo,
      assignedToName:
        followupAssignedTo === 'admin'
          ? 'Admin'
          : mockEmployees.find((e) => e.id === followupAssignedTo)?.fullName || 'Staff',
      notes: followupNotes.trim() || undefined,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
    }

    mockFollowUps.unshift(newFollowup)
    setIsFollowupModalOpen(false)
    setFollowupDate('')
    setFollowupNotes('')
  }

  return (
    <ContentWrapper>
      <PageHeader
        title={client.companyName}
        description={`Account for ${client.fullName} • Member since ${formatDate(client.createdAt)}`}
        breadcrumbs={[
          { label: 'Clients', href: '/admin/clients' },
          { label: client.companyName },
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
            <Link href={`/admin/projects/new?clientId=${client.id}`}>
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </Button>
            </Link>
          </div>
        }
      />

      {/* Financial & Performance Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card padding="md">
          <p className="text-xs text-text-muted">Total Projects</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-text-primary">
              {clientProjects.length}
            </span>
            <span className="text-xs text-text-muted">
              ({deliveredProjects.length} completed)
            </span>
          </div>
        </Card>

        <Card padding="md">
          <p className="text-xs text-text-muted">In Progress</p>
          <p className="text-2xl font-bold text-brand-600 mt-1">
            {inProgressProjects.length}
          </p>
        </Card>

        <Card padding="md">
          <p className="text-xs text-text-muted">Total Billed</p>
          <p className="text-2xl font-bold text-text-primary mt-1">
            {formatCurrency(totalBilled)}
          </p>
        </Card>

        <Card padding="md">
          <p className="text-xs text-text-muted">Net Agency Profit</p>
          <div className="flex items-center gap-1.5 mt-1">
            <p className="text-2xl font-bold text-success-dark">
              {formatCurrency(estimatedProfit)}
            </p>
            <TrendingUp className="h-4 w-4 text-success" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Projects History & Follow-ups */}
        <div className="lg:col-span-2 space-y-6">
          {/* Projects Portfolio */}
          <Card padding="md">
            <CardHeader
              title="Client Projects"
              description="All digital marketing campaigns and scopes logged for this account"
              action={
                <Link href={`/admin/projects/new?clientId=${client.id}`}>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Project</span>
                  </Button>
                </Link>
              }
            />

            {clientProjects.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-muted">
                No projects created for this client yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {clientProjects.map((proj) => {
                  const isLate = isOverdue(proj.deliveryDate, proj.status)
                  const primaryEmp = mockEmployees.find((e) => e.id === proj.primaryEmployeeId)

                  return (
                    <div
                      key={proj.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/projects/${proj.id}`}
                            className="font-semibold text-sm text-text-primary hover:text-brand-600 truncate"
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

                        <p className="text-xs text-text-muted mt-1">
                          Assigned: <strong className="text-text-secondary">{primaryEmp?.fullName || 'Unassigned'}</strong> •{' '}
                          Budget: <strong className="text-text-secondary">{formatCurrency(proj.budget)}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                        <div className="text-right text-xs">
                          <p className="text-text-muted">Deadline</p>
                          <p className={isLate ? 'text-danger font-semibold' : 'text-text-primary'}>
                            {formatDate(proj.deliveryDate)}
                          </p>
                        </div>

                        <Link href={`/admin/projects/${proj.id}`}>
                          <Button variant="secondary" size="sm">
                            <span>Open</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Follow-up Reminders for this Client */}
          <Card padding="md">
            <CardHeader
              title="Scheduled Follow-ups"
              description="Upcoming calls, proposals, or status review dates"
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFollowupModalOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Schedule</span>
                </Button>
              }
            />

            {clientFollowUps.length === 0 ? (
              <p className="text-xs text-text-muted py-4 text-center">
                No follow-ups recorded for this client.
              </p>
            ) : (
              <div className="space-y-2.5">
                {clientFollowUps.map((fu) => (
                  <div
                    key={fu.id}
                    className="p-3 rounded-lg border border-border bg-surface text-xs flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary">
                          {formatDate(fu.scheduledAt)}
                        </span>
                        <Badge
                          variant={fu.status === 'done' ? 'green' : 'amber'}
                          size="sm"
                        >
                          {fu.status}
                        </Badge>
                      </div>
                      {fu.notes && <p className="text-text-secondary">{fu.notes}</p>}
                    </div>

                    <span className="text-[11px] text-text-muted whitespace-nowrap">
                      Assigned: {fu.assignedToName}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Chronological Notes */}
          <Card padding="md">
            <CardHeader
              title="Client Communication Log"
              description="Internal notes and updates regarding this account"
              action={
                !isAddingNote && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingNote(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Note</span>
                  </Button>
                )
              }
            />

            {isAddingNote && (
              <form onSubmit={handleAddNote} className="mb-4 p-3 bg-surface rounded-lg border border-border space-y-3">
                <Textarea
                  placeholder="Type an internal note regarding client preferences, meetings, or billing agreements..."
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={3}
                  required
                />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsAddingNote(false)
                      setNewNoteContent('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm">
                    Post Note
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {notesList.length === 0 ? (
                <p className="text-xs text-text-muted py-2 text-center">
                  No notes recorded yet.
                </p>
              ) : (
                notesList.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg border border-border/80 bg-white text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-text-muted">
                      <span className="font-semibold text-text-primary">
                        {note.authorName} ({note.authorType})
                      </span>
                      <span>{formatDate(note.createdAt)}</span>
                    </div>
                    <p className="text-text-secondary leading-relaxed pt-1">
                      {note.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Account Info & Contact Details (Admin Eyes Only) */}
        <div className="space-y-6">
          <Card padding="md">
            <CardHeader
              title="Company Details"
              description="Primary point of contact & location"
            />

            <div className="space-y-4 text-xs">
              <div className="flex items-start gap-2.5">
                <Building2 className="h-4 w-4 text-text-muted mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-text-muted">Company Name</p>
                  <p className="font-medium text-text-primary mt-0.5">{client.companyName}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail className="h-4 w-4 text-text-muted mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-text-muted">Email Address (Confidential)</p>
                  <a
                    href={`mailto:${client.email}`}
                    className="font-medium text-brand-600 hover:underline mt-0.5 block"
                  >
                    {client.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone className="h-4 w-4 text-text-muted mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-text-muted">Phone Number (Confidential)</p>
                  <a
                    href={`tel:${client.phone}`}
                    className="font-medium text-brand-600 hover:underline mt-0.5 block"
                  >
                    {client.phone}
                  </a>
                </div>
              </div>

              {client.address && (
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-text-muted mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-text-muted">Office Address</p>
                    <p className="text-text-secondary mt-0.5 leading-relaxed">
                      {client.address}
                    </p>
                  </div>
                </div>
              )}

              {client.notes && (
                <div className="pt-3 border-t border-border">
                  <p className="text-text-muted font-medium mb-1">Onboarding Notes</p>
                  <p className="text-text-secondary bg-surface p-2.5 rounded-lg border border-border/60 leading-relaxed">
                    {client.notes}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-border flex items-center justify-between">
                <span className="text-text-muted">Status</span>
                <Badge
                  variant={client.status === 'active' ? 'green' : 'gray'}
                  size="sm"
                >
                  {client.status}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Schedule Follow-up Modal */}
      <Modal
        isOpen={isFollowupModalOpen}
        onClose={() => setIsFollowupModalOpen(false)}
        title="Schedule Follow-up"
        description={`Set a reminder date to contact ${client.companyName}`}
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
              value={followupAssignedTo}
              onChange={(e) => setFollowupAssignedTo(e.target.value)}
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
            label="Follow-up Reason / Talking Points"
            placeholder="e.g. Call regarding quotation review, deliverable feedback, or payment status..."
            value={followupNotes}
            onChange={(e) => setFollowupNotes(e.target.value)}
            rows={3}
          />
        </div>
      </Modal>
    </ContentWrapper>
  )
}
