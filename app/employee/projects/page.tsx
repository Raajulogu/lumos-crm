'use client'

// app/employee/projects/page.tsx
// Employee Projects Directory — Connected to live backend API with skeletons and 0-data screen.

import { useState, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card,
  Badge,
  Button,
  EmptyState,
  PageLoader,
  MetricCardSkeleton,
  TableSkeleton,
} from '@/components/ui'
import { SearchBar, FilterBar, Pagination } from '@/components/common'
import { api } from '@/lib/api'
import type { Project, Client, ServiceCategory } from '@/lib/types'
import {
  Briefcase,
  Building2,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useTaskTimer } from '@/lib/task-timer-context'
import {
  formatDate,
  getStatusLabel,
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
  getDaysUntil,
  isOverdue,
} from '@/lib/utils'

export default function EmployeeProjectsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <EmployeeProjectsContent />
    </Suspense>
  )
}

function EmployeeProjectsContent() {
  const { currentUser } = useAuth()
  const { activePunch } = useTaskTimer()

  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
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
      api.projects.list({ limit: 100 }),
      api.clients.list({ limit: 100 }).catch(() => ({ clients: [] })),
      api.settings.getCategories(),
    ])
      .then(([projRes, clientRes, catRes]) => {
        if (!mounted) return

        if (projRes.status === 'fulfilled') {
          setProjects(projRes.value?.projects || [])
        } else {
          setError('Failed to fetch assigned projects from backend')
        }

        if (clientRes.status === 'fulfilled') {
          setClients(clientRes.value?.clients || [])
        }

        if (catRes.status === 'fulfilled') {
          setCategories(catRes.value || [])
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
          c.id || (c as any)._id,
          { name: c.fullName, company: c.companyName },
        ]),
      ),
    [clients],
  )
  const categoryMap = useMemo(
    () => new Map((Array.isArray(categories) ? categories : []).map((cat) => [cat.id || (cat as any)._id, cat])),
    [categories],
  )

  // Assigned projects from backend (backend already scopes projects to current employee token)
  const myAllProjects = useMemo(() => {
    return Array.isArray(projects) ? projects : []
  }, [projects])

  // Filtered dataset
  const filteredProjects = useMemo(() => {
    return myAllProjects.filter((project) => {
      if (!project) return false
      const client = (project as any).client || clientMap.get(project.clientId)
      const projectName = project.name || ''
      const companyName = client?.company || client?.companyName || (project as any).clientName || ''
      const query = (search || '').toLowerCase()

      const matchesSearch =
        projectName.toLowerCase().includes(query) ||
        companyName.toLowerCase().includes(query)

      let matchesStatus = true
      if (statusFilter === 'all') matchesStatus = true
      else if (statusFilter === 'active') matchesStatus = project.status !== 'delivered'
      else if (statusFilter === 'overdue')
        matchesStatus = isOverdue(project.deliveryDate, project.status)
      else matchesStatus = project.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [myAllProjects, search, statusFilter, clientMap])

  // Metrics
  const activeCount = useMemo(
    () => myAllProjects.filter((p) => p && p.status !== 'delivered').length,
    [myAllProjects],
  )
  const overdueCount = useMemo(
    () => myAllProjects.filter((p) => p && isOverdue(p.deliveryDate, p.status)).length,
    [myAllProjects],
  )
  const deliveredCount = useMemo(
    () => myAllProjects.filter((p) => p && p.status === 'delivered').length,
    [myAllProjects],
  )

  const statusOptions = [
    { id: 'all', label: 'All My Projects', count: myAllProjects.length },
    { id: 'active', label: 'Active', count: activeCount },
    { id: 'overdue', label: 'Overdue', count: overdueCount },
    { id: 'delivered', label: 'Delivered', count: deliveredCount },
  ]

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage)
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredProjects.slice(start, start + itemsPerPage)
  }, [filteredProjects, currentPage, itemsPerPage])

  return (
    <ContentWrapper>
      <PageHeader
        title="My Assigned Projects"
        description="Deliverable pipeline, task briefs, and execution statuses for your accounts."
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

      {/* Top Metric Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <Card padding="md">
              <span className="text-xs text-text-muted">Active Workload</span>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {activeCount}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">Projects in progress</p>
            </Card>

            <Card padding="md">
              <span className="text-xs text-text-muted">Overdue Deliveries</span>
              <p
                className={`text-2xl font-bold mt-1 ${
                  overdueCount > 0 ? 'text-danger' : 'text-text-primary'
                }`}
              >
                {overdueCount}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">Urgent deadlines</p>
            </Card>

            <Card padding="md" className="col-span-2 md:col-span-1">
              <span className="text-xs text-text-muted">Delivered</span>
              <p className="text-2xl font-bold text-success mt-1">
                {deliveredCount}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">Successfully completed</p>
            </Card>
          </>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
        <SearchBar
          value={search}
          onChange={(val) => {
            setSearch(val)
            setCurrentPage(1)
          }}
          placeholder="Search by project name or client company..."
          className="max-w-md w-full"
        />

        <FilterBar
          options={statusOptions}
          activeId={statusFilter}
          onChange={(id) => {
            setStatusFilter(id)
            setCurrentPage(1)
          }}
        />
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : paginatedProjects.length === 0 ? (
        /* 0 Screen / Empty State */
        <Card padding="lg" className="text-center py-12">
          <EmptyState
            icon={<Briefcase className="h-10 w-10 text-slate-300 mx-auto" />}
            title={search ? 'No matching projects found' : '0 Projects Assigned'}
            description={
              search
                ? `No projects matched "${search}". Try searching another name.`
                : 'You have no assigned projects in this view. When new accounts are delegated to you, they will appear here.'
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
              ) : undefined
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
                      <th className="py-3 px-4">Project & Client</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Delivery Due</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {paginatedProjects.map((proj) => {
                      const projId = proj.id || (proj as any)._id
                      const client = (proj as any).client || clientMap.get(proj.clientId)
                      const isLate = isOverdue(proj.deliveryDate, proj.status)
                      const daysLeft = getDaysUntil(proj.deliveryDate)

                      return (
                        <tr
                          key={projId}
                          className="hover:bg-surface/50 transition-colors"
                        >
                          <td className="py-3.5 px-4 max-w-[260px]">
                            <Link
                              href={`/employee/projects/${projId}`}
                              className="font-semibold text-text-primary hover:text-brand-600 truncate block text-sm"
                            >
                              {proj.name}
                            </Link>
                            <span className="text-[11px] text-text-muted truncate block mt-0.5">
                              {client?.company || client?.companyName || (proj as any).clientName || 'Client'}
                            </span>
                            {activePunch && (activePunch.projectId === projId || activePunch.projectId === proj.id) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 mt-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Working: {activePunch.taskTitle}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1">
                              {Array.isArray(proj.serviceCategories) && proj.serviceCategories.slice(0, 2).map((catItem: any) => {
                                const catId = typeof catItem === 'object' && catItem !== null ? catItem.id || catItem._id : catItem
                                const catName = typeof catItem === 'object' && catItem !== null ? catItem.name : categoryMap.get(catId)?.name || catId
                                return (
                                  <span
                                    key={catId}
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700"
                                  >
                                    {catName}
                                  </span>
                                )
                              })}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              suppressHydrationWarning
                              className={`font-medium ${
                                isLate ? 'text-danger font-semibold' : 'text-text-primary'
                              }`}
                            >
                              {formatDate(proj.deliveryDate)}
                            </span>
                            <span
                              suppressHydrationWarning
                              className="text-[11px] text-text-muted block mt-0.5"
                            >
                              {isLate
                                ? 'Overdue'
                                : proj.status === 'delivered'
                                ? 'Delivered'
                                : `${daysLeft} days remaining`}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                                proj.priority,
                              )}`}
                            >
                              {getPriorityLabel(proj.priority)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                proj.status,
                              )}`}
                            >
                              {getStatusLabel(proj.status)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <Link href={`/employee/projects/${projId}`}>
                              <Button variant="secondary" size="sm">
                                Open Workspace
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

          {/* Mobile Card View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedProjects.map((proj) => {
              const projId = proj.id || (proj as any)._id
              const client = (proj as any).client || clientMap.get(proj.clientId)
              const isLate = isOverdue(proj.deliveryDate, proj.status)

              return (
                <Card key={projId} padding="md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/employee/projects/${projId}`}
                        className="font-semibold text-text-primary hover:text-brand-600 text-sm truncate block"
                      >
                        {proj.name}
                      </Link>
                      <p className="text-xs text-text-muted mt-0.5">
                        {client?.company || client?.companyName || (proj as any).clientName || 'Client'}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(
                        proj.status,
                      )}`}
                    >
                      {getStatusLabel(proj.status)}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                    <span
                      suppressHydrationWarning
                      className={
                        isLate ? 'text-danger font-semibold' : 'text-text-muted'
                      }
                    >
                      Due {formatDate(proj.deliveryDate)}
                    </span>

                    <Link href={`/employee/projects/${projId}`}>
                      <Button variant="secondary" size="sm">
                        Open Workspace
                      </Button>
                    </Link>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
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
