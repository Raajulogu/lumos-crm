'use client'

// app/employee/followups/page.tsx
// Employee Follow-ups — Connected to live backend API with skeletons and 0-data screen.

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
import { SearchBar, FilterBar, Pagination } from '@/components/common'
import { api } from '@/lib/api'
import type { FollowUp, Client, Project, FollowUpStatus } from '@/lib/types'
import { useAuth } from '@/lib/auth-context'
import {
  Phone,
  Check,
  RotateCcw,
  AlertCircle,
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
  const currentEmpId = currentUser.role === 'employee' ? currentUser.id : 'emp-1'
  const isDemoAdminPreview = currentUser.role === 'admin'

  const [followups, setFollowups] = useState<FollowUp[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    Promise.allSettled([
      api.followups.list({ limit: 100 }),
      api.clients.list({ limit: 100 }).catch(() => ({ clients: [] })),
      api.projects.list({ limit: 100 }),
    ])
      .then(([fuRes, clientRes, projRes]) => {
        if (!mounted) return

        if (fuRes.status === 'fulfilled') {
          const allFu = fuRes.value?.followups || []
          setFollowups(allFu)
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
        clients.map((c) => [c.id, { name: c.fullName, company: c.companyName }]),
      ),
    [clients],
  )
  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  // My followups
  const myFollowups = useMemo(() => {
    return followups.filter(
      (f) => f.assignedToId === currentEmpId || isDemoAdminPreview,
    )
  }, [followups, currentEmpId, isDemoAdminPreview])

  async function toggleStatus(id: string) {
    const fu = myFollowups.find((f) => f.id === id)
    if (!fu) return

    const nextStatus: FollowUpStatus = fu.status === 'done' ? 'pending' : 'done'
    setFollowups((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item)),
    )

    try {
      await api.followups.updateStatus(id, nextStatus)
    } catch {}
  }

  const filteredFollowups = useMemo(() => {
    return myFollowups.filter((item) => {
      const client = clientMap.get(item.clientId)
      const proj = projectMap.get(item.projectId)

      const matchesSearch =
        (client?.company.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (proj?.name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (item.notes?.toLowerCase().includes(search.toLowerCase()) ?? false)

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

  // Pagination
  const totalPages = Math.ceil(filteredFollowups.length / itemsPerPage)
  const paginatedFollowups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredFollowups.slice(start, start + itemsPerPage)
  }, [filteredFollowups, currentPage, itemsPerPage])

  return (
    <ContentWrapper>
      <PageHeader
        title="My Client Follow-ups"
        description="Calls, scheduled check-ins, and reminders assigned to your client accounts."
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
          placeholder="Search by client or notes..."
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
        /* 0 Screen / Empty State */
        <Card padding="lg">
          <EmptyState
            icon={<Phone className="h-10 w-10 text-slate-300 mx-auto" />}
            title={search ? 'No matching follow-ups' : '0 Follow-ups Scheduled'}
            description={
              search
                ? `No calls matched "${search}". Try another keyword.`
                : 'All client check-ins are up to date! You have no pending calls.'
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

                  {item.notes && (
                    <div className="mt-2.5 p-2 bg-surface rounded-lg text-xs text-text-secondary leading-relaxed border border-border/60">
                      {item.notes}
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span className="text-text-muted">
                      {formatDateTime(item.scheduledAt)}
                    </span>

                    <Button
                      variant={item.status === 'done' ? 'ghost' : 'secondary'}
                      size="sm"
                      onClick={() => toggleStatus(item.id)}
                    >
                      {item.status === 'done' ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          Reopen
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1 text-success" />
                          Mark Done
                        </>
                      )}
                    </Button>
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
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {paginatedFollowups.map((item) => {
                    const client = clientMap.get(item.clientId)
                    const proj = projectMap.get(item.projectId)

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

                        <td className="py-3.5 px-4 max-w-[280px]">
                          <p className="text-text-secondary line-clamp-2">
                            {item.notes || 'Routine check-in'}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-text-primary whitespace-nowrap">
                          {formatDateTime(item.scheduledAt)}
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge
                            variant={item.status === 'done' ? 'green' : 'amber'}
                            size="sm"
                          >
                            {item.status === 'done' ? 'Completed' : 'Pending'}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <Button
                            variant={item.status === 'done' ? 'ghost' : 'secondary'}
                            size="sm"
                            onClick={() => toggleStatus(item.id)}
                          >
                            {item.status === 'done' ? (
                              <>
                                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                Reopen
                              </>
                            ) : (
                              <>
                                <Check className="h-3.5 w-3.5 mr-1 text-success" />
                                Mark Done
                              </>
                            )}
                          </Button>
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
    </ContentWrapper>
  )
}
