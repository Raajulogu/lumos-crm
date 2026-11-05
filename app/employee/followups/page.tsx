'use client'

// app/employee/followups/page.tsx
// Employee Follow-ups — Personal follow-up agenda with quick completion toggle.

import { useState, useMemo, Suspense } from 'react'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, Badge, Button, EmptyState, PageLoader } from '@/components/ui'
import { SearchBar, FilterBar, Pagination } from '@/components/common'
import {
  mockFollowUps,
  mockClients,
  mockProjects,
} from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'
import {
  Phone,
  Check,
  RotateCcw,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import type { FollowUpStatus } from '@/lib/types'

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

  const [statusOverrides, setStatusOverrides] = useState<Record<string, FollowUpStatus>>({})

  const followups = useMemo(() => {
    return mockFollowUps
      .filter((f) => f.assignedToId === currentEmpId)
      .map((item) => ({
        ...item,
        status: statusOverrides[item.id] ?? item.status,
      }))
  }, [currentEmpId, statusOverrides])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Privacy protected client map
  const clientMap = useMemo(
    () =>
      new Map(
        mockClients.map((c) => [c.id, { name: c.fullName, company: c.companyName }]),
      ),
    [],
  )
  const projectMap = useMemo(() => new Map(mockProjects.map((p) => [p.id, p])), [])

  function toggleStatus(id: string) {
    setStatusOverrides((prev) => {
      const current = prev[id] ?? mockFollowUps.find((f) => f.id === id)?.status ?? 'pending'
      const nextStatus: FollowUpStatus = current === 'done' ? 'pending' : 'done'
      return { ...prev, [id]: nextStatus }
    })
  }

  const filteredFollowups = useMemo(() => {
    return followups.filter((item) => {
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
  }, [followups, search, statusFilter, clientMap, projectMap])

  const totalPages = Math.ceil(filteredFollowups.length / itemsPerPage)
  const paginatedFollowups = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredFollowups.slice(start, start + itemsPerPage)
  }, [filteredFollowups, currentPage, itemsPerPage])

  const pendingCount = followups.filter((f) => f.status === 'pending').length
  const doneCount = followups.filter((f) => f.status === 'done').length

  const filterOptions = [
    { id: 'all', label: 'All My Follow-ups', count: followups.length },
    { id: 'pending', label: 'Pending Calls', count: pendingCount },
    { id: 'done', label: 'Completed', count: doneCount },
  ]

  const activeStaffName = currentUser.role === 'employee' ? currentUser.fullName : 'Priya Sharma'

  return (
    <ContentWrapper>
      <PageHeader
        title="My Client Follow-ups"
        description={`Follow-up calls and scheduled communications assigned to ${activeStaffName}.`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee/dashboard' },
          { label: 'Follow-ups' },
        ]}
      />

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

      {paginatedFollowups.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<Phone className="h-10 w-10" />}
            title="No follow-ups found"
            description="You have no follow-ups scheduled under this filter."
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {paginatedFollowups.map((item) => {
            const client = clientMap.get(item.clientId)
            const proj = projectMap.get(item.projectId)

            return (
              <Card key={item.id} padding="md" className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-sm text-text-primary">
                      {client?.company}
                    </h4>
                    <p className="text-xs text-text-muted mt-0.5">
                      Client Contact: {client?.name}
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
                    <p className="text-text-muted text-[11px]">Scheduled Call Date</p>
                    <p className="font-semibold text-text-primary">
                      {formatDateTime(item.scheduledAt)}
                    </p>
                  </div>

                  <Button
                    variant={item.status === 'done' ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={() => toggleStatus(item.id)}
                  >
                    {item.status === 'done' ? (
                      <>
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Reopen</span>
                      </>
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Mark Done</span>
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            )
          })}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredFollowups.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </ContentWrapper>
  )
}

