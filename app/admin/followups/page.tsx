'use client'

// app/admin/followups/page.tsx
// Follow-up Scheduler — Connected to live backend API with skeletons and 0-data screen.

import { useState, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card,
  Badge,
  Button,
  EmptyState,
  Modal,
  Input,
  Textarea,
  PageLoader,
  MetricCardSkeleton,
  TableSkeleton,
} from '@/components/ui'
import { SearchBar, FilterBar, Pagination } from '@/components/common'
import { api } from '@/lib/api'
import type {
  FollowUp,
  FollowUpEvaluation,
  Client,
  Project,
  Employee,
  FollowUpStatus,
} from '@/lib/types'
import {
  Phone,
  Clock,
  Plus,
  Check,
  RotateCcw,
  AlertCircle,
  Star,
  Eye,
  EyeOff,
  ClipboardCheck,
} from 'lucide-react'
import { formatDateTime, generateId } from '@/lib/utils'

export default function AdminFollowUpsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminFollowUpsContent />
    </Suspense>
  )
}

function AdminFollowUpsContent() {
  const [followups, setFollowups] = useState<FollowUp[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalClientId, setModalClientId] = useState('')
  const [modalProjectId, setModalProjectId] = useState('')
  const [modalDate, setModalDate] = useState('')
  const [modalAssignee, setModalAssignee] = useState('admin')
  const [modalNotes, setModalNotes] = useState('')
  const [modalVisibleToEmployee, setModalVisibleToEmployee] = useState(true)
  const [modalHideDetails, setModalHideDetails] = useState(false)

  // Evaluations Review State
  const [evaluationsMap, setEvaluationsMap] = useState<Map<string, FollowUpEvaluation>>(new Map())
  const [reviewingFollowUp, setReviewingFollowUp] = useState<FollowUp | null>(null)
  const [adminReviewStatus, setAdminReviewStatus] = useState<'pending' | 'approved' | 'needs_followup'>('approved')
  const [adminReviewNotes, setAdminReviewNotes] = useState('')
  const [isSavingReview, setIsSavingReview] = useState(false)

  useEffect(() => {
    let mounted = true

    Promise.allSettled([
      api.followups.list({ limit: 100 }),
      api.clients.list({ limit: 100 }),
      api.projects.list({ limit: 100 }),
      api.employees.list(),
      api.followups.getEvaluations(),
    ])
      .then(([fuRes, clientRes, projRes, empRes, evalRes]) => {
        if (!mounted) return

        if (fuRes.status === 'fulfilled') {
          setFollowups(fuRes.value?.followups || [])
        } else {
          setError('Failed to fetch follow-ups from server')
        }

        if (clientRes.status === 'fulfilled') setClients(clientRes.value?.clients || [])
        if (projRes.status === 'fulfilled') setProjects(projRes.value?.projects || [])
        if (empRes.status === 'fulfilled') setEmployees(empRes.value || [])
        if (evalRes.status === 'fulfilled') {
          const map = new Map<string, FollowUpEvaluation>()
          ;(evalRes.value || []).forEach((ev) => map.set(ev.followupId, ev))
          setEvaluationsMap(map)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // Lookups
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])
  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])

  // Projects filtered by selected client in modal
  const clientProjects = useMemo(() => {
    if (!modalClientId) return projects
    return projects.filter((p) => p.clientId === modalClientId)
  }, [modalClientId, projects])

  // Mark Done / Pending toggle
  async function toggleFollowupStatus(id: string) {
    const fu = followups.find((f) => f.id === id)
    if (!fu) return

    const nextStatus: FollowUpStatus = fu.status === 'done' ? 'pending' : 'done'
    setFollowups((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)),
    )

    try {
      await api.followups.updateStatus(id, nextStatus)
    } catch {}
  }

  // Create Follow-up
  async function handleCreateFollowup(e: React.FormEvent) {
    e.preventDefault()
    if (!modalDate || !modalClientId) return

    const newFU: FollowUp = {
      id: `fu-${generateId()}`,
      projectId: modalProjectId || clientProjects[0]?.id || '',
      clientId: modalClientId,
      scheduledAt: new Date(modalDate).toISOString(),
      assignedToId: modalAssignee,
      assignedToName:
        modalAssignee === 'admin'
          ? 'Admin'
          : employeeMap.get(modalAssignee)?.fullName || 'Staff',
      notes: modalNotes.trim() || undefined,
      status: 'pending' as const,
      isVisibleToEmployee: modalVisibleToEmployee,
      hideDetailsFromEmployee: modalHideDetails,
      createdAt: new Date().toISOString(),
    }

    setFollowups([newFU, ...followups])
    setIsModalOpen(false)
    setModalDate('')
    setModalNotes('')
    setModalClientId('')
    setModalProjectId('')
    setModalVisibleToEmployee(true)
    setModalHideDetails(false)

    try {
      await api.followups.create({
        projectId: newFU.projectId,
        clientId: newFU.clientId,
        scheduledAt: newFU.scheduledAt,
        assignedToId: newFU.assignedToId,
        notes: newFU.notes,
        isVisibleToEmployee: newFU.isVisibleToEmployee,
        hideDetailsFromEmployee: newFU.hideDetailsFromEmployee,
      })
    } catch {}
  }

  async function toggleEmployeeVisibility(item: FollowUp) {
    const nextVisible = item.isVisibleToEmployee === false
    setFollowups((prev) =>
      prev.map((f) => (f.id === item.id ? { ...f, isVisibleToEmployee: nextVisible } : f)),
    )
    try {
      await api.followups.updateVisibility(item.id, { isVisibleToEmployee: nextVisible })
    } catch {}
  }

  function openReviewModal(item: FollowUp) {
    const ev = item.evaluation || evaluationsMap.get(item.id) || null
    setReviewingFollowUp({ ...item, evaluation: ev })
    setAdminReviewStatus(ev?.adminReviewStatus || 'approved')
    setAdminReviewNotes(ev?.adminReviewNotes || '')
  }

  async function handleSaveAdminReview(e: React.FormEvent) {
    e.preventDefault()
    if (!reviewingFollowUp) return
    setIsSavingReview(true)
    try {
      const updated = await api.followups.reviewEvaluation(reviewingFollowUp.id, {
        adminReviewStatus,
        adminReviewNotes: adminReviewNotes.trim() || undefined,
      })
      if (updated) {
        setEvaluationsMap((prev) => {
          const next = new Map(prev)
          next.set(reviewingFollowUp.id, updated)
          return next
        })
        setFollowups((prev) =>
          prev.map((f) =>
            f.id === reviewingFollowUp.id ? { ...f, evaluation: updated } : f,
          ),
        )
      }
      setReviewingFollowUp(null)
    } finally {
      setIsSavingReview(false)
    }
  }

  // Filtered dataset
  const filteredFollowups = useMemo(() => {
    return followups.filter((fu) => {
      const client = clientMap.get(fu.clientId)
      const proj = projectMap.get(fu.projectId)

      const matchesSearch =
        (client?.companyName.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (client?.fullName.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (proj?.name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (fu.notes?.toLowerCase().includes(search.toLowerCase()) ?? false)

      let matchesStatus = true
      if (statusFilter === 'all') matchesStatus = true
      else if (statusFilter === 'pending') matchesStatus = fu.status === 'pending'
      else if (statusFilter === 'done') matchesStatus = fu.status === 'done'
      else if (statusFilter === 'missed') matchesStatus = fu.status === 'missed'

      return matchesSearch && matchesStatus
    })
  }, [followups, search, statusFilter, clientMap, projectMap])

  // Pagination
  const totalPages = Math.ceil(filteredFollowups.length / itemsPerPage)
  const paginatedFollowups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredFollowups.slice(start, start + itemsPerPage)
  }, [filteredFollowups, currentPage, itemsPerPage])

  const pendingCount = followups.filter((f) => f.status === 'pending').length
  const doneCount = followups.filter((f) => f.status === 'done').length

  const filterOptions = [
    { id: 'all', label: 'All Follow-ups', count: followups.length },
    { id: 'pending', label: 'Pending', count: pendingCount },
    { id: 'done', label: 'Completed', count: doneCount },
  ]

  return (
    <ContentWrapper>
      <PageHeader
        title="Client Follow-up Scheduler"
        description="Schedule upcoming check-ins, proposal follow-ups, and review calls."
        action={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Follow-up</span>
          </Button>
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

      {/* Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <Card padding="sm">
              <p className="text-xs text-text-muted">Total Recorded</p>
              <p className="text-xl font-bold text-text-primary mt-0.5">{followups.length}</p>
            </Card>
            <Card padding="sm">
              <p className="text-xs text-text-muted">Pending Calls</p>
              <p className="text-xl font-bold text-warning-dark mt-0.5">{pendingCount}</p>
            </Card>
            <Card padding="sm" className="col-span-2 md:col-span-1">
              <p className="text-xs text-text-muted">Completed Calls</p>
              <p className="text-xl font-bold text-success-dark mt-0.5">{doneCount}</p>
            </Card>
          </>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={(val) => {
            setSearch(val)
            setCurrentPage(1)
          }}
          placeholder="Search by client, project, or notes..."
          className="w-full sm:max-w-xs"
        />

        <FilterBar
          options={filterOptions}
          activeId={statusFilter}
          onChange={(id) => {
            setStatusFilter(id)
            setCurrentPage(1)
          }}
        />
      </div>

      {/* Follow-up Display */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : paginatedFollowups.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<Phone className="h-10 w-10" />}
            title="No follow-ups found"
            description="All client check-ins are up to date! Click below to plan a call."
            action={{
              label: 'Schedule a Call',
              onClick: () => setIsModalOpen(true),
            }}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedFollowups.map((item) => {
              const client = clientMap.get(item.clientId)
              const proj = projectMap.get(item.projectId)

              return (
                <Card key={item.id} padding="md" className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm text-text-primary">
                        {client?.companyName}
                      </h4>
                      <p className="text-xs text-text-muted mt-0.5">
                        Contact: {client?.fullName}
                      </p>
                    </div>

                    <Badge
                      variant={item.status === 'done' ? 'green' : 'amber'}
                      size="sm"
                    >
                      {item.status}
                    </Badge>
                  </div>

                  {proj && (
                    <p className="text-xs text-brand-700 bg-brand-50 px-2.5 py-1 rounded-md inline-block font-medium">
                      Project: {proj.name}
                    </p>
                  )}

                  {item.notes && (
                    <p className="text-xs text-text-secondary bg-surface p-2.5 rounded-lg border border-border leading-relaxed">
                      {item.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                    <div>
                      <p className="text-text-muted text-[11px]">Due Date & Time</p>
                      <p className="font-semibold text-text-primary">
                        {formatDateTime(item.scheduledAt)}
                      </p>
                    </div>

                    <Button
                      variant={item.status === 'done' ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={() => toggleFollowupStatus(item.id)}
                    >
                      {item.status === 'done' ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span>Reopen</span>
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Done</span>
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-border text-xs font-semibold uppercase text-text-secondary">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Scheduled Date & Time</th>
                  <th scope="col" className="px-4 py-3.5">Client & Contact</th>
                  <th scope="col" className="px-4 py-3.5">Associated Project</th>
                  <th scope="col" className="px-4 py-3.5">Owner</th>
                  <th scope="col" className="px-4 py-3.5">Visibility</th>
                  <th scope="col" className="px-4 py-3.5">Evaluation</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedFollowups.map((item) => {
                  const client = clientMap.get(item.clientId)
                  const proj = projectMap.get(item.projectId)
                  const evaluation = item.evaluation || evaluationsMap.get(item.id)
                  const isVisible = item.isVisibleToEmployee !== false

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-surface/60 transition-colors duration-100"
                    >
                      <td className="px-5 py-3.5 text-xs font-semibold text-text-primary">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-text-muted" />
                          <span>{formatDateTime(item.scheduledAt)}</span>
                        </div>
                        {item.notes && (
                          <p className="text-[11px] font-normal text-text-muted mt-1 max-w-[200px] truncate">
                            {item.notes}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin/clients/${client?.id}`}
                          className="font-semibold text-text-primary hover:text-brand-600 block text-xs"
                        >
                          {client?.companyName}
                        </Link>
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {client?.fullName}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-text-secondary max-w-xs truncate">
                        {proj ? (
                          <Link
                            href={`/admin/projects/${proj.id}`}
                            className="hover:text-brand-600 hover:underline"
                          >
                            {proj.name}
                          </Link>
                        ) : (
                          'General'
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-xs font-medium text-text-secondary">
                        {item.assignedToName}
                      </td>

                      <td className="px-4 py-3.5 text-xs">
                        <button
                          type="button"
                          onClick={() => toggleEmployeeVisibility(item)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium cursor-pointer transition-colors ${
                            isVisible
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                          }`}
                          title="Toggle whether employee can view this follow-up"
                        >
                          {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          <span>{isVisible ? 'Visible' : 'Hidden'}</span>
                        </button>
                      </td>

                      <td className="px-4 py-3.5 text-xs">
                        {evaluation ? (
                          <button
                            type="button"
                            onClick={() => openReviewModal(item)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 font-semibold cursor-pointer"
                          >
                            <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                            <span>{evaluation.rating}/5</span>
                            <span className="text-[10px] font-normal opacity-80">• Review</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-text-muted">Not evaluated</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          variant={item.status === 'done' ? 'green' : 'amber'}
                          size="sm"
                        >
                          {item.status}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {evaluation && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openReviewModal(item)}
                              title="Review Call Evaluation"
                            >
                              <ClipboardCheck className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant={item.status === 'done' ? 'secondary' : 'primary'}
                            size="sm"
                            onClick={() => toggleFollowupStatus(item.id)}
                          >
                            {item.status === 'done' ? 'Reopen' : 'Mark Done'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredFollowups.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}

      {/* Schedule Follow-up Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule Client Follow-up"
        description="Set reminder date for client callback, proposal response, or invoice check."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateFollowup}
              disabled={!modalDate || !modalClientId}
            >
              Schedule Call
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1.5">
              Select Client <span className="text-danger">*</span>
            </label>
            <select
              value={modalClientId}
              onChange={(e) => setModalClientId(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text-primary"
              required
            >
              <option value="">-- Choose Client Company --</option>
              {clients.map((c: Client) => (
                <option key={c.id} value={c.id}>
                  {c.companyName} ({c.fullName})
                </option>
              ))}
            </select>
          </div>

          {modalClientId && clientProjects.length > 0 && (
            <div>
              <label className="text-sm font-medium text-text-primary block mb-1.5">
                Related Project (Optional)
              </label>
              <select
                value={modalProjectId}
                onChange={(e) => setModalProjectId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text-primary"
              >
                <option value="">-- General Account Follow-up --</option>
                {clientProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Follow-up Date & Time"
            type="datetime-local"
            value={modalDate}
            onChange={(e) => setModalDate(e.target.value)}
            required
          />

          <div>
            <label className="text-sm font-medium text-text-primary block mb-1.5">
              Assigned Call Owner
            </label>
            <select
              value={modalAssignee}
              onChange={(e) => setModalAssignee(e.target.value)}
              className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text-primary"
            >
              <option value="admin">Admin (You)</option>
              {employees.map((emp: Employee) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.designation})
                </option>
              ))}
            </select>
          </div>

          <Textarea
            label="Talking Points & Context"
            placeholder="e.g. Client requested callback in 2 days to finalize Google Ads budget and monthly retainer terms..."
            value={modalNotes}
            onChange={(e) => setModalNotes(e.target.value)}
            rows={3}
          />

          <div className="p-3 rounded-xl bg-surface border border-border space-y-2 text-xs">
            <p className="font-semibold text-text-primary flex items-center gap-1.5">
              {modalVisibleToEmployee ? (
                <Eye className="h-3.5 w-3.5 text-brand-600" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-text-muted" />
              )}
              <span>Employee Visibility Controls</span>
            </p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={modalVisibleToEmployee}
                onChange={(e) => setModalVisibleToEmployee(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border text-brand-600"
              />
              <span className="text-text-secondary">Show this follow-up on assigned employee&apos;s dashboard</span>
            </label>
            {modalVisibleToEmployee && (
              <label className="flex items-center gap-2 cursor-pointer pl-5">
                <input
                  type="checkbox"
                  checked={modalHideDetails}
                  onChange={(e) => setModalHideDetails(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-border text-brand-600"
                />
                <span className="text-text-secondary">Hide confidential notes/details from employee</span>
              </label>
            )}
          </div>
        </div>
      </Modal>

      {/* Admin Follow-up Evaluation Review Modal */}
      <Modal
        isOpen={!!reviewingFollowUp}
        onClose={() => setReviewingFollowUp(null)}
        title="Follow-up Evaluation Review"
        description="Inspect employee call completion outcome and submit quality review."
        size="md"
      >
        {reviewingFollowUp && (
          <form onSubmit={handleSaveAdminReview} className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-surface border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-text-primary">
                  {clientMap.get(reviewingFollowUp.clientId)?.companyName || 'Client Follow-up'}
                </span>
                <span className="text-text-muted">
                  Owner: {reviewingFollowUp.assignedToName}
                </span>
              </div>

              {reviewingFollowUp.evaluation ? (
                <>
                  <div className="flex items-center gap-3 pt-1">
                    <div className="flex items-center gap-1 font-bold text-amber-600">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                      <span>Rating: {reviewingFollowUp.evaluation.rating} / 5</span>
                    </div>
                    <Badge
                      variant={
                        reviewingFollowUp.evaluation.properlyCompleted ? 'green' : 'amber'
                      }
                      size="sm"
                    >
                      {reviewingFollowUp.evaluation.properlyCompleted
                        ? 'Properly Completed'
                        : 'Incomplete / Needs Follow-up'}
                    </Badge>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white border border-border/80 text-text-secondary leading-relaxed">
                    <strong className="text-text-primary block mb-0.5">
                      Employee Evaluation Notes:
                    </strong>
                    {reviewingFollowUp.evaluation.comments || 'No comments entered.'}
                  </div>
                </>
              ) : (
                <p className="text-text-muted italic">
                  No evaluation submitted by the employee yet.
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-text-primary block mb-1.5">
                Admin Quality Decision
              </label>
              <select
                value={adminReviewStatus}
                onChange={(e) =>
                  setAdminReviewStatus(
                    e.target.value as 'pending' | 'approved' | 'needs_followup',
                  )
                }
                className="w-full h-10 rounded-lg border border-border bg-white px-3 text-xs text-text-primary"
              >
                <option value="approved">Approved — Properly Completed</option>
                <option value="needs_followup">Needs Follow-up / Re-check</option>
                <option value="pending">Pending Verification</option>
              </select>
            </div>

            <Textarea
              label="Admin Review Notes (optional)"
              placeholder="Add verification notes or instructions for next steps..."
              value={adminReviewNotes}
              onChange={(e) => setAdminReviewNotes(e.target.value)}
              rows={2}
            />

            <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setReviewingFollowUp(null)}
              >
                Close
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSavingReview}
              >
                Save Review
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </ContentWrapper>
  )
}

