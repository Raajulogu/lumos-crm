'use client'

// app/admin/clients/page.tsx
// Clients Directory — Connected to live backend API with skeletons and 0-data screen.

import { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card,
  Badge,
  Button,
  EmptyState,
  PageLoader,
  TableSkeleton,
  MetricCardSkeleton,
} from '@/components/ui'
import { SearchBar, FilterBar, Pagination } from '@/components/common'
import { api } from '@/lib/api'
import type { Client, Project } from '@/lib/types'
import {
  Plus,
  Users,
  Building2,
  Mail,
  Phone,
  Briefcase,
  ChevronRight,
  ExternalLink,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function ClientsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ClientsContent />
    </Suspense>
  )
}

function ClientsContent() {
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
      api.clients.list({ search, status: statusFilter, limit: 100 }),
      api.projects.list({ limit: 100 }),
    ])
      .then(([clientRes, projRes]) => {
        if (!mounted) return
        if (clientRes.status === 'fulfilled') {
          setClients(clientRes.value?.clients || [])
        } else {
          setError('Failed to fetch clients from server')
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
  }, [search, statusFilter])

  // Project count and spend calculation per client
  const clientStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { totalProjects: number; totalSpend: number; activeProjects: number }
    >()
    clients.forEach((c) => {
      const clientProjects = projects.filter((p) => p.clientId === c.id)
      const totalSpend = clientProjects.reduce((sum, p) => sum + p.budget, 0)
      const activeProjects = clientProjects.filter(
        (p) => p.status !== 'delivered',
      ).length
      map.set(c.id, {
        totalProjects: clientProjects.length,
        totalSpend,
        activeProjects,
      })
    })
    return map
  }, [clients, projects])

  // Filtered clients client-side search fallback
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const matchesSearch =
        client.fullName.toLowerCase().includes(search.toLowerCase()) ||
        client.companyName.toLowerCase().includes(search.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(search.toLowerCase())) ||
        (client.phone && client.phone.includes(search))

      const matchesStatus =
        statusFilter === 'all' ? true : client.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [clients, search, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage)
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredClients.slice(start, start + itemsPerPage)
  }, [filteredClients, currentPage, itemsPerPage])

  const totalBilledAllClients = useMemo(
    () => projects.reduce((acc, p) => acc + p.budget, 0),
    [projects],
  )
  const activeClientsCount = useMemo(
    () => clients.filter((c) => c.status === 'active').length,
    [clients],
  )

  const filterOptions = [
    { id: 'all', label: 'All Clients', count: clients.length },
    { id: 'active', label: 'Active', count: activeClientsCount },
    {
      id: 'inactive',
      label: 'Inactive',
      count: clients.length - activeClientsCount,
    },
  ]

  return (
    <ContentWrapper>
      <PageHeader
        title="Clients"
        description="Manage company accounts, track engagement history, and review total billing."
        action={
          <Link href="/admin/clients/new">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              <span>Add New Client</span>
            </Button>
          </Link>
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

      {/* Top Level Metric Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <Card padding="md">
              <p className="text-xs text-text-muted">Total Accounts</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {clients.length}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {activeClientsCount} active
              </p>
            </Card>

            <Card padding="md">
              <p className="text-xs text-text-muted">Active Retainers</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {activeClientsCount}
              </p>
              <p className="text-[11px] text-success mt-0.5 font-medium">
                {clients.length > 0
                  ? Math.round((activeClientsCount / clients.length) * 100)
                  : 0}
                % active rate
              </p>
            </Card>

            <Card padding="md">
              <p className="text-xs text-text-muted">Total Projects</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {projects.length}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {projects.filter((p) => p.status !== 'delivered').length} ongoing
              </p>
            </Card>

            <Card padding="md">
              <p className="text-xs text-text-muted">Total Agency Value</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {formatCurrency(totalBilledAllClients)}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">Across all accounts</p>
            </Card>
          </>
        )}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
        <SearchBar
          value={search}
          onChange={(val) => {
            setSearch(val)
            setCurrentPage(1)
          }}
          placeholder="Search by company, contact person, or email..."
          className="max-w-md w-full"
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

      {/* Loading Skeleton */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : paginatedClients.length === 0 ? (
        /* 0 Screen / Empty State */
        <Card padding="lg" className="text-center py-12">
          <EmptyState
            icon={<Building2 className="h-10 w-10 text-slate-300 mx-auto" />}
            title={search ? 'No matching clients found' : '0 Clients Registered'}
            description={
              search
                ? `No clients matched "${search}". Try searching another name or reset filters.`
                : 'Start onboarding your agency clients to manage their digital marketing deliverables.'
            }
            action={
              search ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('all')
                  }}
                >
                  Clear search
                </Button>
              ) : (
                <Link href="/admin/clients/new">
                  <Button variant="primary" size="sm">
                    <Plus className="h-4 w-4" />
                    <span>Add First Client</span>
                  </Button>
                </Link>
              )
            }
          />
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Card padding="none" className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-text-secondary">
                  <thead className="bg-surface border-b border-border text-text-primary font-semibold">
                    <tr>
                      <th className="py-3 px-4">Company & Client</th>
                      <th className="py-3 px-4">Direct Contact</th>
                      <th className="py-3 px-4">Projects</th>
                      <th className="py-3 px-4">Total Billed</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {paginatedClients.map((client) => {
                      const stats = clientStatsMap.get(client.id) || {
                        totalProjects: 0,
                        totalSpend: 0,
                        activeProjects: 0,
                      }

                      return (
                        <tr
                          key={client.id}
                          className="hover:bg-surface/50 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                                {client.companyName.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <Link
                                  href={`/admin/clients/${client.id}`}
                                  className="font-semibold text-text-primary hover:text-brand-600 block truncate"
                                >
                                  {client.companyName}
                                </Link>
                                <span className="text-[11px] text-text-muted truncate block">
                                  {client.fullName}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              {client.email && (
                                <div className="flex items-center gap-1.5 text-text-secondary truncate">
                                  <Mail className="h-3 w-3 text-text-muted flex-shrink-0" />
                                  <span className="truncate">{client.email}</span>
                                </div>
                              )}
                              {client.phone && (
                                <div className="flex items-center gap-1.5 text-text-muted">
                                  <Phone className="h-3 w-3 flex-shrink-0" />
                                  <span>{client.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="h-3.5 w-3.5 text-text-muted" />
                              <span className="font-semibold text-text-primary">
                                {stats.totalProjects}
                              </span>
                              {stats.activeProjects > 0 && (
                                <span className="text-[11px] text-warning-dark font-medium">
                                  ({stats.activeProjects} active)
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-text-primary">
                            {formatCurrency(stats.totalSpend)}
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge
                              variant={client.status === 'active' ? 'green' : 'gray'}
                              size="sm"
                            >
                              {client.status === 'active' ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <Link href={`/admin/clients/${client.id}`}>
                              <Button variant="secondary" size="sm">
                                View Profile
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Mobile Card List View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedClients.map((client) => {
              const stats = clientStatsMap.get(client.id) || {
                totalProjects: 0,
                totalSpend: 0,
                activeProjects: 0,
              }

              return (
                <Card key={client.id} padding="md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-10 w-10 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 flex items-center justify-center font-bold text-sm">
                        {client.companyName.charAt(0)}
                      </div>
                      <div>
                        <Link
                          href={`/admin/clients/${client.id}`}
                          className="font-semibold text-text-primary hover:text-brand-600 text-sm"
                        >
                          {client.companyName}
                        </Link>
                        <p className="text-xs text-text-muted">{client.fullName}</p>
                      </div>
                    </div>
                    <Badge
                      variant={client.status === 'active' ? 'green' : 'gray'}
                      size="sm"
                    >
                      {client.status}
                    </Badge>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-text-muted">Total Projects:</span>{' '}
                      <strong className="text-text-primary">
                        {stats.totalProjects}
                      </strong>
                    </div>
                    <div>
                      <span className="text-text-muted">Billed:</span>{' '}
                      <strong className="text-text-primary">
                        {formatCurrency(stats.totalSpend)}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 flex items-center justify-end">
                    <Link href={`/admin/clients/${client.id}`} className="w-full">
                      <Button variant="secondary" size="sm" className="w-full">
                        View Client Details
                      </Button>
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </ContentWrapper>
  )
}
