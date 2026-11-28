'use client'

// app/employee/followups/page.tsx
// Employee Follow-ups — Visibility-controlled follow-ups with call completion & evaluation modal.

import { useState, useMemo, useEffect, Suspense } from 'react'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card,
  Badge,
  Button,
  EmptyState,
  PageLoader,
  TableSkeleton,
} from '@/components/ui'
import {
  SearchBar,
  FilterBar,
  Pagination,
  FollowUpEvaluationModal,
} from '@/components/common'
import { api } from '@/lib/api'
import type {
  FollowUp,
  FollowUpEvaluation,
  Client,
  Project,
  FollowUpStatus,
} from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import {
  Phone,
  Check,
  RotateCcw,
  AlertCircle,
  Star,
  Lock,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

export default function EmployeeFollowUpsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EmployeeFollowUpsContent />
    </Suspense>
  )
}

function EmployeeFollowUpsContent() {
  const { currentUser } = useAuth()

  const [followups, setFollowups] = useState<FollowUp[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  const [evaluatingItem, setEvaluatingItem] = useState<FollowUp | null>(null)

  useEffect(() => {
    let mounted = true

    Promise.allSettled([
      api.followups.list({ limit: 100 }),
      api.clients.list({ limit: 100 }).catch(() => ({ clients: [] })),
      api.projects.list({ limit: 100 }),
    ])
      .then(([fuRes, clientRes, projRes]) => {
        if (!mounted) return

        if (fuRes.status === 'fulfilled') {
          setFollowups(fuRes.value?.followups || [])
        } else {
          setError('Failed to fetch follow-ups from backend server')
        }

        if (clientRes.status === 'fulfilled') {
          setClients(clientRes.value?.clients || [])
        }

        if (projRes.status === 'fulfilled') {
          setProjects(projRes.value?.projects || [])
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // Privacy protected client map
  const clientMap = useMemo(
    () =>
      new Map(
        (Array.isArray(clients) ? clients : []).map((c) => [
          c.id || (c as unknown as { _id?: string })._id || '',
          { name: c.fullName, company: c.companyName },
        ]),
      ),
    [clients],
  )
  const projectMap = useMemo(
    () =>
      new Map(
        (Array.isArray(projects) ? projects : []).map((p) => [
          p.id || (p as unknown as { _id?: string })._id || '',
          p,
        ]),
      ),
    [projects],
  )

  // Assigned follow-ups respecting Admin visibility controls
  const myFollowups = useMemo(() => {
    if (!Array.isArray(followups)) return []
    return followups.filter((item) => {
      if (item.isVisibleToEmployee === false) return false
      if (currentUser.role !== 'admin' && currentUser.id && item.assignedToId) {
        return item.assignedToId === currentUser.id
      }
      return true
    })
  }, [followups, currentUser.id, currentUser.role])

  async function reopenFollowup(id: string) {
    const nextStatus: FollowUpStatus = 'pending'
    setFollowups((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)),
    )
    try {
      await api.followups.updateStatus(id, nextStatus)
    } catch {}
  }

  function handleEvaluationSubmitted(followupId: string, evaluation: FollowUpEvaluation) {
    setFollowups((prev) =>
      prev.map((item) =>
        item.id === followupId ? { ...item, status: 'done', evaluation } : item,
      ),
    )
  }

  const filteredFollowups = useMemo(() => {
    return myFollowups.filter((item) => {
      const client = (item as unknown as { client?: { company?: string; companyName?: string } }).client || clientMap.get(item.clientId)
      const proj = (item as unknown as { project?: { name?: string } }).project || projectMap.get(item.projectId)
      const query = (search || '').toLowerCase()

      const companyName =
        (client as { company?: string; companyName?: string })?.company ||
        (client as { companyName?: string })?.companyName ||
        (item as unknown as { clientName?: string }).clientName ||
        ''
      const projectName = proj?.name || (item as unknown as { projectName?: string }).projectName || ''
      const notes = item.hideDetailsFromEmployee ? '' : item.notes || ''

      const matchesSearch =
        companyName.toLowerCase().includes(query) ||
        projectName.toLowerCase().includes(query) ||
        notes.toLowerCase().includes(query)

      let matchesStatus = true
      if (statusFilter === 'all') matchesStatus = true
      else if (statusFilter === 'pending') matchesStatus = item.status === 'pending'
      else if (statusFilter === 'done') matchesStatus = item.status === 'done'

      return matchesSearch && matchesStatus
    })
  }, [myFollowups, search, statusFilter, clientMap, projectMap])

  const pendingCount = useMemo(
    () => myFollowups.filter((f) => f.status === 'pending').length,
    [myFollowups],
  )
  const doneCount = useMemo(
    () => myFollowups.filter((f) => f.status === 'done').length,
    [myFollowups],
  )

  const filterOptions = [
    { id: 'all', label: 'All Follow-ups', count: myFollowups.length },
    { id: 'pending', label: 'Pending', count: pendingCount },
    { id: 'done', label: 'Completed', count: doneCount },
  ]

  const totalPages = Math.ceil(filteredFollowups.length / itemsPerPage)
  const paginatedFollowups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredFollowups.slice(start, start + itemsPerPage)
  }, [filteredFollowups, currentPage, itemsPerPage])

  return (
    <ContentWrapper>
      <PageHeader
        title="My Client Follow-ups"
        description="Calls, scheduled check-ins, and completion evaluations assigned to your client accounts."
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={(val) => {
            setSearch(val)
            setCurrentPage(1)
          }}
          placeholder="Search by client or project..."
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
        <TableSkeleton rows={6} cols={4} />
      ) : paginatedFollowups.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<Phone className="h-10 w-10 text-slate-300 mx-auto" />}
            title={search ? 'No matching follow-ups' : '0 Follow-ups Scheduled'}
            description={
              search
                ? `No calls matched "${search}". Try another keyword.`
                : 'All client check-ins assigned to you are up to date.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedFollowups.map((item) => {
              const client = clientMap.get(item.clientId)
              const proj = projectMap.get(item.projectId)
              const hideNotes = item.hideDetailsFromEmployee === true

              return (
                <Card key={item.id} padding="md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary text-sm truncate">
                        {client?.company || 'Client'}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5 truncate">
                        {proj?.name}
                      </p>
                    </div>

                    <Badge
                      variant={item.status === 'done' ? 'green' : 'amber'}
                      size="sm"
                    >
                      {item.status === 'done' ? 'Completed' : 'Pending'}
                    </Badge>
                  </div>

                  {hideNotes ? (
                    <div className="mt-2.5 p-2 bg-surface rounded-lg text-xs text-text-muted italic border border-border/60 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5" />
                      <span>Call details restricted by Admin</span>
                    </div>
                  ) : (
                    item.notes && (
                      <div className="mt-2.5 p-2 bg-surface rounded-lg text-xs text-text-secondary leading-relaxed border border-border/60">
                        {item.notes}
                      </div>
                    )
                  )}

                  {item.evaluation && (
                    <div className="mt-2 p-2 rounded-lg bg-brand-50 border border-brand-200 text-[11px] flex items-center justify-between">
                      <span className="font-semibold text-brand-800 flex items-center gap-1">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                        Evaluated: {item.evaluation.rating}/5
                      </span>
                      <span className="text-brand-700">
                        {item.evaluation.properlyCompleted ? 'Properly Completed' : 'Needs Follow-up'}
                      </span>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2 text-xs">
                    <span className="text-text-muted">
                      {formatDateTime(item.scheduledAt)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {item.status === 'done' ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEvaluatingItem(item)}
                          >
                            {item.evaluation ? 'Edit Eval' : 'Evaluate'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => reopenFollowup(item.id)}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                            Reopen
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setEvaluatingItem(item)}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" />
                          Done & Evaluate
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card padding="none" className="overflow-hidden">
              <table className="w-full text-left text-xs text-text-secondary">
                <thead className="bg-surface border-b border-border text-text-primary font-semibold">
                  <tr>
                    <th className="py-3 px-4">Client & Project</th>
                    <th className="py-3 px-4">Notes / Purpose</th>
                    <th className="py-3 px-4">Scheduled Date & Time</th>
                    <th className="py-3 px-4">Evaluation</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {paginatedFollowups.map((item) => {
                    const client = clientMap.get(item.clientId)
                    const proj = projectMap.get(item.projectId)
                    const hideNotes = item.hideDetailsFromEmployee === true

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-surface/50 transition-colors"
                      >
                        <td className="py-3.5 px-4 max-w-[200px]">
                          <p className="font-semibold text-text-primary truncate">
                            {client?.company || 'Client'}
                          </p>
                          <span className="text-[11px] text-text-muted truncate block mt-0.5">
                            {proj?.name}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-[260px]">
                          {hideNotes ? (
                            <span className="inline-flex items-center gap-1 text-text-muted italic">
                              <Lock className="h-3 w-3" />
                              Details hidden by Admin
                            </span>
                          ) : (
                            <p className="text-text-secondary line-clamp-2">
                              {item.notes || 'Routine check-in'}
                            </p>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-medium text-text-primary whitespace-nowrap">
                          {formatDateTime(item.scheduledAt)}
                        </td>

                        <td className="py-3.5 px-4">
                          {item.evaluation ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 font-semibold text-brand-700">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                                {item.evaluation.rating}/5 •{' '}
                                {item.evaluation.properlyCompleted ? 'Verified' : 'Partial'}
                              </span>
                              {item.evaluation.adminReviewStatus &&
                                item.evaluation.adminReviewStatus !== 'pending' && (
                                  <p className="text-[10px] text-text-muted capitalize">
                                    Admin: {item.evaluation.adminReviewStatus.replace('_', ' ')}
                                  </p>
                                )}
                            </div>
                          ) : (
                            <span className="text-text-muted">Not evaluated</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge
                            variant={item.status === 'done' ? 'green' : 'amber'}
                            size="sm"
                          >
                            {item.status === 'done' ? 'Completed' : 'Pending'}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {item.status === 'done' ? (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setEvaluatingItem(item)}
                                >
                                  {item.evaluation ? 'Edit Evaluation' : 'Evaluate'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => reopenFollowup(item.id)}
                                >
                                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                  Reopen
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setEvaluatingItem(item)}
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                Mark Done & Evaluate
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Card>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center pt-2">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Evaluation Modal */}
      {evaluatingItem && (
        <FollowUpEvaluationModal
          followUp={evaluatingItem}
          clientCompanyName={clientMap.get(evaluatingItem.clientId)?.company}
          employeeName={currentUser.fullName}
          isOpen={!!evaluatingItem}
          onClose={() => setEvaluatingItem(null)}
          onSubmitted={handleEvaluationSubmitted}
        />
      )}
    </ContentWrapper>
  )
}
