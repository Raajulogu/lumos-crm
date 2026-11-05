'use client'

// app/admin/clients/page.tsx
// Clients Directory — Mobile-first card list & desktop data table with filtering, search, and client metrics.

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, Badge, Button, EmptyState } from '@/components/ui'
import { SearchBar, FilterBar, Pagination } from '@/components/common'
import { mockClients, mockProjects } from '@/lib/mock-data'
import {
  Plus,
  Users,
  Building2,
  Mail,
  Phone,
  Briefcase,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // Project count and spend calculation per client
  const clientStatsMap = useMemo(() => {
    const map = new Map<string, { totalProjects: number; totalSpend: number; activeProjects: number }>()
    mockClients.forEach((c) => {
      const clientProjects = mockProjects.filter((p) => p.clientId === c.id)
      const totalSpend = clientProjects.reduce((sum, p) => sum + p.budget, 0)
      const activeProjects = clientProjects.filter((p) => p.status !== 'delivered').length
      map.set(c.id, {
        totalProjects: clientProjects.length,
        totalSpend,
        activeProjects,
      })
    })
    return map
  }, [])

  // Filtered clients
  const filteredClients = useMemo(() => {
    return mockClients.filter((client) => {
      const matchesSearch =
        client.fullName.toLowerCase().includes(search.toLowerCase()) ||
        client.companyName.toLowerCase().includes(search.toLowerCase()) ||
        client.email.toLowerCase().includes(search.toLowerCase()) ||
        client.phone.includes(search)

      const matchesStatus =
        statusFilter === 'all' ? true : client.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [search, statusFilter])

  // Pagination
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage)
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredClients.slice(start, start + itemsPerPage)
  }, [filteredClients, currentPage, itemsPerPage])

  const totalBilledAllClients = mockProjects.reduce((acc, p) => acc + p.budget, 0)
  const activeClientsCount = mockClients.filter((c) => c.status === 'active').length

  const filterOptions = [
    { id: 'all', label: 'All Clients', count: mockClients.length },
    { id: 'active', label: 'Active', count: activeClientsCount },
    { id: 'inactive', label: 'Inactive', count: mockClients.length - activeClientsCount },
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

      {/* Metric Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Card padding="sm">
          <p className="text-xs text-text-muted">Total Client Base</p>
          <p className="text-xl font-bold text-text-primary mt-0.5">{mockClients.length}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">Active Engagements</p>
          <p className="text-xl font-bold text-success-dark mt-0.5">{activeClientsCount}</p>
        </Card>
        <Card padding="sm" className="col-span-2 md:col-span-1">
          <p className="text-xs text-text-muted">Total Lifetime Value</p>
          <p className="text-xl font-bold text-brand-700 mt-0.5">
            {formatCurrency(totalBilledAllClients)}
          </p>
        </Card>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={(val) => {
            setSearch(val)
            setCurrentPage(1)
          }}
          placeholder="Search client by name, company, or email..."
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

      {/* Clients Display: Mobile Card View + Desktop Data Table */}
      {paginatedClients.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<Users className="h-10 w-10" />}
            title="No clients found"
            description={
              search
                ? `No clients matched "${search}". Try clearing filters or search terms.`
                : 'Get started by creating your first digital marketing client.'
            }
            action={
              search
                ? { label: 'Clear Filters', onClick: () => { setSearch(''); setStatusFilter('all'); } }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Mobile View: High-tap-target card list (< 768px) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedClients.map((client) => {
              const stats = clientStatsMap.get(client.id)

              return (
                <Link key={client.id} href={`/admin/clients/${client.id}`}>
                  <Card padding="md" hover className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-brand-600 flex-shrink-0" />
                          <h3 className="font-semibold text-sm text-text-primary truncate">
                            {client.companyName}
                          </h3>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          Contact: <span className="font-medium">{client.fullName}</span>
                        </p>
                      </div>

                      <Badge
                        variant={client.status === 'active' ? 'green' : 'gray'}
                        size="sm"
                      >
                        {client.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border bg-surface -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl">
                      <div>
                        <span className="text-text-muted">Projects: </span>
                        <strong className="text-text-primary">
                          {stats?.totalProjects ?? 0}
                          {stats?.activeProjects ? ` (${stats.activeProjects} active)` : ''}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-text-muted">Total Value: </span>
                        <strong className="text-brand-700">
                          {formatCurrency(stats?.totalSpend ?? 0)}
                        </strong>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>

          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-border text-xs font-semibold uppercase text-text-secondary">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Company & Contact</th>
                  <th scope="col" className="px-4 py-3.5">Email</th>
                  <th scope="col" className="px-4 py-3.5">Phone</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Projects</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Total Billed</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedClients.map((client) => {
                  const stats = clientStatsMap.get(client.id)

                  return (
                    <tr
                      key={client.id}
                      className="hover:bg-surface/60 transition-colors duration-100"
                    >
                      <td className="px-5 py-3.5 font-medium">
                        <Link
                          href={`/admin/clients/${client.id}`}
                          className="text-text-primary hover:text-brand-600 font-semibold flex items-center gap-1.5"
                        >
                          <Building2 className="h-4 w-4 text-text-muted flex-shrink-0" />
                          <span>{client.companyName}</span>
                        </Link>
                        <p className="text-xs text-text-muted pl-5 font-normal">
                          {client.fullName}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-text-secondary">
                        <div className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5 text-text-muted" />
                          <a
                            href={`mailto:${client.email}`}
                            className="hover:underline hover:text-brand-600"
                          >
                            {client.email}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-text-secondary">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5 text-text-muted" />
                          <a
                            href={`tel:${client.phone}`}
                            className="hover:underline hover:text-brand-600"
                          >
                            {client.phone}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center text-xs">
                        <span className="font-semibold text-text-primary">
                          {stats?.totalProjects ?? 0}
                        </span>
                        {stats && stats.activeProjects > 0 && (
                          <span className="text-brand-600 font-medium ml-1">
                            ({stats.activeProjects} active)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right text-xs font-semibold text-text-primary">
                        {formatCurrency(stats?.totalSpend ?? 0)}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge
                          variant={client.status === 'active' ? 'green' : 'gray'}
                          size="sm"
                        >
                          {client.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/admin/clients/${client.id}`}>
                          <Button variant="ghost" size="sm">
                            <span>View</span>
                            <ChevronRight className="h-4 w-4 text-text-muted" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredClients.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </ContentWrapper>
  )
}

