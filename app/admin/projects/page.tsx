'use client'

// app/admin/projects/page.tsx
// Projects Directory — Connected to live backend API with skeletons and 0-data screen.

import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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
import type {
  Project,
  Client,
  Employee,
  ServiceCategory,
  ProjectStatus,
  ProjectPriority,
} from '@/lib/types'
import {
  Plus,
  Briefcase,
  Building2,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Filter,
  CheckCircle2,
  Clock,
  User,
  AlertCircle,
} from 'lucide-react'
import {
  formatDate,
  formatCurrency,
  getStatusLabel,
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
  getDaysUntil,
  isOverdue,
} from '@/lib/utils'

export default function AdminProjectsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminProjectsContent />
    </Suspense>
  )
}

function AdminProjectsContent() {
  const searchParams = useSearchParams()
  const initialFilter = searchParams.get('filter') || 'all'

  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialFilter)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    Promise.allSettled([
      api.projects.list({ limit: 100 }),
      api.clients.list({ limit: 100 }),
      api.employees.list(),
      api.settings.getCategories(),
    ])
      .then(([projRes, clientRes, empRes, catRes]) => {
        if (!mounted) return

        if (projRes.status === 'fulfilled') {
          setProjects(projRes.value?.projects || [])
        } else {
          setError('Failed to fetch projects from backend')
        }

        if (clientRes.status === 'fulfilled') {
          setClients(clientRes.value?.clients || [])
        }

        if (empRes.status === 'fulfilled') {
          setEmployees(empRes.value || [])
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

  // Lookup maps
  const clientMap = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients])
  const employeeMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])
  const categoryMap = useMemo(() => new Map(categories.map((cat) => [cat.id, cat])), [categories])

  // Metrics calculated from real API projects
  const activeCount = useMemo(
    () => projects.filter((p) => p.status !== 'delivered').length,
    [projects],
  )
  const overdueCount = useMemo(
    () => projects.filter((p) => isOverdue(p.deliveryDate, p.status)).length,
    [projects],
  )
  const deliveredCount = useMemo(
    () => projects.filter((p) => p.status === 'delivered').length,
    [projects],
  )
  const totalPipelineBudget = useMemo(
    () => projects.reduce((sum, p) => sum + p.budget, 0),
    [projects],
  )

  // Filter options
  const statusOptions = [
    { id: 'all', label: 'All Projects', count: projects.length },
    { id: 'active', label: 'Active', count: activeCount },
    { id: 'overdue', label: 'Overdue', count: overdueCount },
    {
      id: 'new',
      label: 'New',
      count: projects.filter((p) => p.status === 'new').length,
    },
    {
      id: 'in_progress',
      label: 'In Progress',
      count: projects.filter((p) => p.status === 'in_progress').length,
    },
    {
      id: 'under_review',
      label: 'Review',
      count: projects.filter((p) => p.status === 'under_review').length,
    },
    {
      id: 'completed',
      label: 'Completed',
      count: projects.filter((p) => p.status === 'completed').length,
    },
    { id: 'delivered', label: 'Delivered', count: deliveredCount },
  ]

  // Filtered dataset
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const client = clientMap.get(project.clientId)
      const emp = project.primaryEmployeeId
        ? employeeMap.get(project.primaryEmployeeId)
        : null

      const matchesSearch =
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        (client?.companyName.toLowerCase().includes(search.toLowerCase()) ?? false) ||
        (emp?.fullName.toLowerCase().includes(search.toLowerCase()) ?? false)

      let matchesStatus = true
      if (statusFilter === 'all') {
        matchesStatus = true
      } else if (statusFilter === 'active') {
        matchesStatus = project.status !== 'delivered'
      } else if (statusFilter === 'overdue') {
        matchesStatus = isOverdue(project.deliveryDate, project.status)
      } else {
        matchesStatus = project.status === statusFilter
      }

      const matchesCategory =
        categoryFilter === 'all'
          ? true
          : project.serviceCategories?.includes(categoryFilter)

      const matchesEmployee =
        employeeFilter === 'all'
          ? true
          : project.primaryEmployeeId === employeeFilter

      const matchesPriority =
        priorityFilter === 'all'
          ? true
          : project.priority === priorityFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory &&
        matchesEmployee &&
        matchesPriority
      )
    })
  }, [
    projects,
    search,
    statusFilter,
    categoryFilter,
    employeeFilter,
    priorityFilter,
    clientMap,
    employeeMap,
  ])

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage)
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredProjects.slice(start, start + itemsPerPage)
  }, [filteredProjects, currentPage, itemsPerPage])

  return (
    <ContentWrapper>
      <PageHeader
        title="Project Management"
        description="Monitor status pipeline stages, assign agency talent, and track delivery deadlines."
        action={
          <Link href="/admin/projects/new">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              <span>Create Project</span>
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

      {/* Top 4 Pipeline Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <Card padding="md">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Active Pipeline</span>
                <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
              </div>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {activeCount}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">Projects in execution</p>
            </Card>

            <Card padding="md">
              <span className="text-xs text-text-muted">Overdue Alerts</span>
              <p
                className={`text-2xl font-bold mt-1 ${
                  overdueCount > 0 ? 'text-danger' : 'text-text-primary'
                }`}
              >
                {overdueCount}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">Require urgent check-in</p>
            </Card>

            <Card padding="md">
              <span className="text-xs text-text-muted">Delivered to Clients</span>
              <p className="text-2xl font-bold text-success mt-1">
                {deliveredCount}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">Successfully closed</p>
            </Card>

            <Card padding="md">
              <span className="text-xs text-text-muted">Pipeline Value</span>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {formatCurrency(totalPipelineBudget)}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">All active scopes</p>
            </Card>
          </>
        )}
      </div>

      {/* Status Pipeline Filter Tabs */}
      <div className="mb-4 overflow-x-auto pb-1">
        <FilterBar
          options={statusOptions}
          activeId={statusFilter}
          onChange={(id) => {
            setStatusFilter(id)
            setCurrentPage(1)
          }}
        />
      </div>

      {/* Secondary Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between mb-4">
        <SearchBar
          value={search}
          onChange={(val) => {
            setSearch(val)
            setCurrentPage(1)
          }}
          placeholder="Search by project name, client company, or staff..."
          className="max-w-md w-full"
        />

        <div className="flex items-center gap-2 overflow-x-auto">
          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-white text-text-secondary focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
            <option value="urgent">Urgent</option>
          </select>

          {/* Assigned Staff Filter */}
          <select
            value={employeeFilter}
            onChange={(e) => {
              setEmployeeFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-white text-text-secondary focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Assignees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : paginatedProjects.length === 0 ? (
        /* 0 Screen / Empty State */
        <Card padding="lg" className="text-center py-12">
          <EmptyState
            icon={<Briefcase className="h-10 w-10 text-slate-300 mx-auto" />}
            title={search ? 'No matching projects' : '0 Projects in Pipeline'}
            description={
              search
                ? `No projects matched "${search}". Try adjusting your filters.`
                : 'Create your first digital marketing project scope to start tracking deliverables.'
            }
            action={
              search ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('all')
                    setPriorityFilter('all')
                    setEmployeeFilter('all')
                  }}
                >
                  Clear all filters
                </Button>
              ) : (
                <Link href="/admin/projects/new">
                  <Button variant="primary" size="sm">
                    <Plus className="h-4 w-4" />
                    <span>Create First Project</span>
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
                      <th className="py-3 px-4">Project & Client</th>
                      <th className="py-3 px-4">Categories</th>
                      <th className="py-3 px-4">Lead Assignee</th>
                      <th className="py-3 px-4">Budget</th>
                      <th className="py-3 px-4">Delivery Due</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {paginatedProjects.map((proj) => {
                      const client = clientMap.get(proj.clientId)
                      const emp = proj.primaryEmployeeId
                        ? employeeMap.get(proj.primaryEmployeeId)
                        : null
                      const isLate = isOverdue(proj.deliveryDate, proj.status)
                      const daysLeft = getDaysUntil(proj.deliveryDate)

                      return (
                        <tr
                          key={proj.id}
                          className="hover:bg-surface/50 transition-colors"
                        >
                          <td className="py-3.5 px-4 max-w-[240px]">
                            <div className="min-w-0">
                              <Link
                                href={`/admin/projects/${proj.id}`}
                                className="font-semibold text-text-primary hover:text-brand-600 truncate block text-sm"
                              >
                                {proj.name}
                              </Link>
                              <span className="text-[11px] text-text-muted truncate block mt-0.5">
                                {client?.companyName || 'Unknown Client'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[180px]">
                              {proj.serviceCategories?.slice(0, 2).map((catId) => {
                                const cat = categoryMap.get(catId)
                                return (
                                  <span
                                    key={catId}
                                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700"
                                  >
                                    {cat?.name || catId}
                                  </span>
                                )
                              })}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            {emp ? (
                              <div className="flex items-center gap-1.5">
                                <div className="h-6 w-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-[10px]">
                                  {emp.fullName.charAt(0)}
                                </div>
                                <span className="font-medium text-text-primary truncate">
                                  {emp.fullName}
                                </span>
                              </div>
                            ) : (
                              <span className="text-text-muted italic">
                                Unassigned
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 font-semibold text-text-primary">
                            {formatCurrency(proj.budget)}
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
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                                proj.status,
                              )}`}
                            >
                              {getStatusLabel(proj.status)}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <Link href={`/admin/projects/${proj.id}`}>
                              <Button variant="secondary" size="sm">
                                View
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
            {paginatedProjects.map((proj) => {
              const client = clientMap.get(proj.clientId)
              const emp = proj.primaryEmployeeId
                ? employeeMap.get(proj.primaryEmployeeId)
                : null
              const isLate = isOverdue(proj.deliveryDate, proj.status)

              return (
                <Card key={proj.id} padding="md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/projects/${proj.id}`}
                        className="font-semibold text-text-primary hover:text-brand-600 text-sm truncate block"
                      >
                        {proj.name}
                      </Link>
                      <p className="text-xs text-text-muted mt-0.5">
                        {client?.companyName}
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

                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-text-muted">Assigned:</span>{' '}
                      <strong className="text-text-primary">
                        {emp?.fullName || 'None'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-text-muted">Budget:</span>{' '}
                      <strong className="text-text-primary">
                        {formatCurrency(proj.budget)}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 flex items-center justify-between">
                    <span
                      suppressHydrationWarning
                      className={`text-xs ${
                        isLate ? 'text-danger font-semibold' : 'text-text-muted'
                      }`}
                    >
                      Due {formatDate(proj.deliveryDate)}
                    </span>

                    <Link href={`/admin/projects/${proj.id}`}>
                      <Button variant="secondary" size="sm">
                        Inspect
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
