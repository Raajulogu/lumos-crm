'use client'

// app/admin/followups/page.tsx
// Follow-up Scheduler — Manage client calls, proposal check-ins, and automated reminder alerts.

import { useState, useMemo, Suspense } from 'react'
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
} from '@/components/ui'
import { SearchBar, FilterBar, Pagination } from '@/components/common'
import {
  mockFollowUps,
  mockClients,
  mockProjects,
  mockEmployees,
} from '@/lib/mock-data'
import {
  Phone,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Briefcase,
  User,
  Plus,
  Check,
  RotateCcw,
} from 'lucide-react'
import {
  formatDate,
  formatDateTime,
  generateId,
} from '@/lib/utils'
import type { FollowUpStatus } from '@/lib/types'

export default function AdminFollowUpsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminFollowUpsContent />
    </Suspense>
  )
}

function AdminFollowUpsContent() {
  const [followups, setFollowups] = useState(mockFollowUps)
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

  // Lookups
  const clientMap = useMemo(() => new Map(mockClients.map((c) => [c.id, c])), [])
  const projectMap = useMemo(() => new Map(mockProjects.map((p) => [p.id, p])), [])
  const employeeMap = useMemo(() => new Map(mockEmployees.map((e) => [e.id, e])), [])

  // Projects filtered by selected client in modal
  const clientProjects = useMemo(() => {
    if (!modalClientId) return mockProjects
    return mockProjects.filter((p) => p.clientId === modalClientId)
  }, [modalClientId])

  // Mark Done / Pending toggle
  function toggleFollowupStatus(id: string) {
    setFollowups((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus: FollowUpStatus = item.status === 'done' ? 'pending' : 'done'
          return { ...item, status: nextStatus }
        }
        return item
      }),
    )
  }

  // Create Follow-up
  function handleCreateFollowup(e: React.FormEvent) {
    e.preventDefault()
    if (!modalDate || !modalClientId) return

    const newFU = {
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
      createdAt: new Date().toISOString(),
    }

    setFollowups([newFU, ...followups])
    setIsModalOpen(false)
    setModalDate('')
    setModalNotes('')
    setModalClientId('')
    setModalProjectId('')
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

      {/* Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
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
      {paginatedFollowups.length === 0 ? (
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
                  <th scope="col" className="px-4 py-3.5">Notes</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedFollowups.map((item) => {
                  const client = clientMap.get(item.clientId)
                  const proj = projectMap.get(item.projectId)

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

                      <td className="px-4 py-3.5 text-xs text-text-secondary max-w-xs truncate">
                        {item.notes || '—'}
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          variant={item.status === 'done' ? 'green' : 'amber'}
                          size="sm"
                        >
                          {item.status}
                        </Badge>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant={item.status === 'done' ? 'secondary' : 'primary'}
                          size="sm"
                          onClick={() => toggleFollowupStatus(item.id)}
                        >
                          {item.status === 'done' ? 'Reopen' : 'Mark Done'}
                        </Button>
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
              {mockClients.map((c) => (
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
              {mockEmployees.map((emp) => (
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
        </div>
      </Modal>
    </ContentWrapper>
  )
}

