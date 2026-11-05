'use client'

// app/admin/projects/page.tsx
// Projects Directory — Full management with status pipeline filters, categories, assignee filtering, and budget tracking.

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, Badge, Button, EmptyState, PageLoader } from '@/components/ui'
import { SearchBar, FilterBar, Pagination } from '@/components/common'
import {
  mockProjects,
  mockClients,
  mockEmployees,
  mockCategories,
} from '@/lib/mock-data'
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
import type { ProjectStatus, ProjectPriority } from '@/lib/types'

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

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialFilter)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Lookup maps
  const clientMap = useMemo(() => new Map(mockClients.map((c) => [c.id, c])), [])
  const employeeMap = useMemo(() => new Map(mockEmployees.map((e) => [e.id, e])), [])
  const categoryMap = useMemo(() => new Map(mockCategories.map((cat) => [cat.id, cat])), [])

  // Metrics
  const activeCount = mockProjects.filter((p) => p.status !== 'delivered').length
  const overdueCount = mockProjects.filter((p) => isOverdue(p.deliveryDate, p.status)).length
  const deliveredCount = mockProjects.filter((p) => p.status === 'delivered').length
  const totalPipelineBudget = mockProjects.reduce((sum, p) => sum + p.budget, 0)

  // Filter options
  const statusOptions = [
    { id: 'all', label: 'All Projects', count: mockProjects.length },
    { id: 'active', label: 'Active', count: activeCount },
    { id: 'overdue', label: 'Overdue', count: overdueCount },
    { id: 'new', label: 'New', count: mockProjects.filter((p) => p.status === 'new').length },
    { id: 'in_progress', label: 'In Progress', count: mockProjects.filter((p) => p.status === 'in_progress').length },
    { id: 'under_review', label: 'Review', count: mockProjects.filter((p) => p.status === 'under_review').length },
    { id: 'completed', label: 'Completed', count: mockProjects.filter((p) => p.status === 'completed').length },
    { id: 'delivered', label: 'Delivered', count: deliveredCount },
  ]

  // Filtered dataset
  const filteredProjects = useMemo(() => {
    return mockProjects.filter((project) => {
      const client = clientMap.get(project.clientId)
      const emp = project.primaryEmployeeId ? employeeMap.get(project.primaryEmployeeId) : null

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
        categoryFilter === 'all' ? true : project.serviceCategories.includes(categoryFilter)

      const matchesEmployee =
        employeeFilter === 'all'
          ? true
          : project.primaryEmployeeId === employeeFilter ||
            project.additionalMemberIds.includes(employeeFilter)

      const matchesPriority =
        priorityFilter === 'all' ? true : project.priority === priorityFilter

      return matchesSearch && matchesStatus && matchesCategory && matchesEmployee && matchesPriority
    })
  }, [search, statusFilter, categoryFilter, employeeFilter, priorityFilter, clientMap, employeeMap])

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage)
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredProjects.slice(start, start + itemsPerPage)
  }, [filteredProjects, currentPage, itemsPerPage])

  function resetAllFilters() {
    setSearch('')
    setStatusFilter('all')
    setCategoryFilter('all')
    setEmployeeFilter('all')
    setPriorityFilter('all')
    setCurrentPage(1)
  }

  return (
    <ContentWrapper>
      <PageHeader
        title="Projects & Deliverables"
        description="Monitor ongoing campaigns, client deadlines, service assignments, and revenue."
        action={
          <Link href="/admin/projects/new">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              <span>New Project</span>
            </Button>
          </Link>
        }
      />

      {/* Highlights Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card padding="sm">
          <p className="text-xs text-text-muted">Total Active</p>
          <p className="text-xl font-bold text-text-primary mt-0.5">{activeCount}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">Overdue Alerts</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xl font-bold text-danger">{overdueCount}</p>
            {overdueCount > 0 && <AlertTriangle className="h-4 w-4 text-danger" />}
          </div>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">Delivered</p>
          <p className="text-xl font-bold text-success-dark mt-0.5">{deliveredCount}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">Total Pipeline Value</p>
          <p className="text-xl font-bold text-brand-700 mt-0.5">
            {formatCurrency(totalPipelineBudget)}
          </p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3 mb-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val)
              setCurrentPage(1)
            }}
            placeholder="Search by project, client, or assignee..."
            className="w-full sm:max-w-xs"
          />

          {/* Secondary Dropdown Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="h-9 rounded-lg border border-border bg-white px-2.5 text-xs text-text-primary cursor-pointer hover:border-border-strong"
            >
              <option value="all">All Services</option>
              {mockCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Employee Filter */}
            <select
              value={employeeFilter}
              onChange={(e) => {
                setEmployeeFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="h-9 rounded-lg border border-border bg-white px-2.5 text-xs text-text-primary cursor-pointer hover:border-border-strong"
            >
              <option value="all">All Staff</option>
              {mockEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName}
                </option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="h-9 rounded-lg border border-border bg-white px-2.5 text-xs text-text-primary cursor-pointer hover:border-border-strong"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Status Horizontal Pill Filters */}
        <FilterBar
          options={statusOptions}
          activeId={statusFilter}
          onChange={(id) => {
            setStatusFilter(id)
            setCurrentPage(1)
          }}
        />
      </div>

      {/* Projects List: Mobile Card View + Desktop Table View */}
      {paginatedProjects.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<Briefcase className="h-10 w-10" />}
            title="No projects match criteria"
            description="Try modifying search keywords or resetting status/service filters."
            action={{
              label: 'Reset Filters',
              onClick: resetAllFilters,
            }}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Mobile View: High-tap-target Cards (< 768px) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedProjects.map((project) => {
              const client = clientMap.get(project.clientId)
              const primaryEmp = project.primaryEmployeeId
                ? employeeMap.get(project.primaryEmployeeId)
                : null
              const isLate = isOverdue(project.deliveryDate, project.status)
              const daysLeft = getDaysUntil(project.deliveryDate)

              return (
                <Link key={project.id} href={`/admin/projects/${project.id}`}>
                  <Card padding="md" hover className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-text-primary truncate">
                          {project.name}
                        </h3>
                        <p className="text-xs text-text-secondary mt-0.5">
                          Client: <span className="font-medium text-text-primary">{client?.companyName}</span>
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${getStatusColor(
                          project.status,
                        )}`}
                      >
                        {getStatusLabel(project.status)}
                      </span>
                    </div>

                    {/* Category Tags */}
                    <div className="flex flex-wrap gap-1">
                      {project.serviceCategories.map((catId) => {
                        const cat = categoryMap.get(catId)
                        return (
                          <span
                            key={catId}
                            className="px-2 py-0.5 rounded bg-surface border border-border text-[11px] font-medium text-text-secondary"
                          >
                            {cat?.name || catId}
                          </span>
                        )
                      })}
                    </div>

                    {/* Card Footer: Assignee, Deadline & Budget */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2.5 border-t border-border bg-surface -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl">
                      <div>
                        <p className="text-text-muted text-[11px]">Assigned</p>
                        <p className="font-medium text-text-primary truncate">
                          {primaryEmp?.fullName || 'Unassigned'}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-text-muted text-[11px]">Deadline</p>
                        <p
                          suppressHydrationWarning
                          className={`font-semibold ${
                            isLate ? 'text-danger' : 'text-text-primary'
                          }`}
                        >
                          {formatDate(project.deliveryDate)}
                          {isLate ? ' (Late)' : daysLeft <= 3 && project.status !== 'delivered' ? ` (${daysLeft}d)` : ''}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>

          {/* Desktop View: Full Data Table (>= 768px) */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-border text-xs font-semibold uppercase text-text-secondary">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Project & Client</th>
                  <th scope="col" className="px-4 py-3.5">Services</th>
                  <th scope="col" className="px-4 py-3.5">Assignee</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Status</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Priority</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Deadline</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Budget</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedProjects.map((project) => {
                  const client = clientMap.get(project.clientId)
                  const primaryEmp = project.primaryEmployeeId
                    ? employeeMap.get(project.primaryEmployeeId)
                    : null
                  const isLate = isOverdue(project.deliveryDate, project.status)
                  const daysLeft = getDaysUntil(project.deliveryDate)

                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-surface/60 transition-colors duration-100"
                    >
                      <td className="px-5 py-3.5 font-medium max-w-xs">
                        <Link
                          href={`/admin/projects/${project.id}`}
                          className="text-text-primary hover:text-brand-600 font-semibold block truncate"
                        >
                          {project.name}
                        </Link>
                        <p className="text-xs text-text-muted mt-0.5 truncate">
                          {client?.companyName}
                        </p>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {project.serviceCategories.map((catId) => {
                            const cat = categoryMap.get(catId)
                            return (
                              <span
                                key={catId}
                                className="px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-medium text-text-secondary whitespace-nowrap"
                              >
                                {cat?.name || catId}
                              </span>
                            )
                          })}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-text-muted" />
                          <span className="font-medium text-text-primary truncate">
                            {primaryEmp?.fullName || 'Unassigned'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-block ${getStatusColor(
                            project.status,
                          )}`}
                        >
                          {getStatusLabel(project.status)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium inline-block ${getPriorityColor(
                            project.priority,
                          )}`}
                        >
                          {getPriorityLabel(project.priority)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right text-xs">
                        <p
                          suppressHydrationWarning
                          className={`font-semibold ${
                            isLate ? 'text-danger' : 'text-text-primary'
                          }`}
                        >
                          {formatDate(project.deliveryDate)}
                        </p>
                        <p suppressHydrationWarning className="text-[11px] text-text-muted">
                          {isLate
                            ? 'Overdue'
                            : project.status === 'delivered'
                            ? 'Delivered'
                            : `${daysLeft}d left`}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 text-right text-xs font-semibold text-text-primary">
                        {formatCurrency(project.budget)}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/admin/projects/${project.id}`}>
                          <Button variant="ghost" size="sm">
                            <span>Open</span>
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
            totalItems={filteredProjects.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </ContentWrapper>
  )
}

