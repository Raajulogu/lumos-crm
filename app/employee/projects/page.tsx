'use client'

// app/employee/projects/page.tsx
// Employee Projects Directory — scoped to user's assigned projects with privacy protections.

import { useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, Badge, Button, EmptyState, PageLoader } from '@/components/ui'
import { SearchBar, FilterBar, Pagination } from '@/components/common'
import {
  mockProjects,
  mockClients,
  mockCategories,
} from '@/lib/mock-data'
import {
  Briefcase,
  Building2,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Clock,
} from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
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
  const currentEmpId = currentUser.role === 'employee' ? currentUser.id : 'emp-1'

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6

  // Lookup maps (Restricted client info: Name + Company only)
  const clientMap = useMemo(
    () =>
      new Map(
        mockClients.map((c) => [
          c.id,
          { name: c.fullName, company: c.companyName },
        ]),
      ),
    [],
  )
  const categoryMap = useMemo(
    () => new Map(mockCategories.map((cat) => [cat.id, cat])),
    [],
  )

  // My assigned projects only
  const myAllProjects = useMemo(() => {
    return mockProjects.filter(
      (p) =>
        p.primaryEmployeeId === currentEmpId ||
        p.additionalMemberIds.includes(currentEmpId),
    )
  }, [currentEmpId])

  // Filtered dataset
  const filteredProjects = useMemo(() => {
    return myAllProjects.filter((project) => {
      const client = clientMap.get(project.clientId)
      const matchesSearch =
        project.name.toLowerCase().includes(search.toLowerCase()) ||
        (client?.company.toLowerCase().includes(search.toLowerCase()) ?? false)

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

      return matchesSearch && matchesStatus
    })
  }, [myAllProjects, search, statusFilter, clientMap])

  // Metrics
  const activeCount = myAllProjects.filter((p) => p.status !== 'delivered').length
  const overdueCount = myAllProjects.filter((p) => isOverdue(p.deliveryDate, p.status)).length
  const completedCount = myAllProjects.filter((p) => p.status === 'completed' || p.status === 'delivered').length

  const filterOptions = [
    { id: 'all', label: 'All My Projects', count: myAllProjects.length },
    { id: 'active', label: 'In Progress / Active', count: activeCount },
    { id: 'overdue', label: 'Overdue', count: overdueCount },
    { id: 'completed', label: 'Completed', count: completedCount },
  ]

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage)
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredProjects.slice(start, start + itemsPerPage)
  }, [filteredProjects, currentPage, itemsPerPage])

  const activeStaffName = currentUser.role === 'employee' ? currentUser.fullName : 'Priya Sharma'
  const activeStaffRole = currentUser.role === 'employee' ? currentUser.designation : 'SEO Specialist'

  return (
    <ContentWrapper>
      <PageHeader
        title="My Assigned Projects"
        description={`Work assignments for ${activeStaffName} (${activeStaffRole}). Client contact details and financial margins are restricted.`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee/dashboard' },
          { label: 'My Projects' },
        ]}
      />

      {/* Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        <Card padding="sm">
          <p className="text-xs text-text-muted">Active Workload</p>
          <p className="text-xl font-bold text-text-primary mt-0.5">{activeCount}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">Overdue Alerts</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xl font-bold text-danger">{overdueCount}</p>
            {overdueCount > 0 && <AlertTriangle className="h-4 w-4 text-danger" />}
          </div>
        </Card>
        <Card padding="sm" className="col-span-2 md:col-span-1">
          <p className="text-xs text-text-muted">Completed Deliverables</p>
          <p className="text-xl font-bold text-success-dark mt-0.5">{completedCount}</p>
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
          placeholder="Search by project or client company..."
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

      {/* Projects List */}
      {paginatedProjects.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<Briefcase className="h-10 w-10" />}
            title="No projects found"
            description="You do not have any projects matching the selected filter."
            action={
              search || statusFilter !== 'all'
                ? {
                    label: 'Clear Filters',
                    onClick: () => {
                      setSearch('')
                      setStatusFilter('all')
                    },
                  }
                : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Mobile View: Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedProjects.map((project) => {
              const client = clientMap.get(project.clientId)
              const isLate = isOverdue(project.deliveryDate, project.status)
              const daysLeft = getDaysUntil(project.deliveryDate)

              return (
                <Link key={project.id} href={`/employee/projects/${project.id}`}>
                  <Card padding="md" hover className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm text-text-primary truncate">
                          {project.name}
                        </h3>
                        <p className="text-xs text-text-secondary mt-0.5">
                          Client: <span className="font-medium text-text-primary">{client?.company || 'N/A'}</span>
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

                    <div className="flex items-center justify-between text-xs pt-2.5 border-t border-border bg-surface -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getPriorityColor(
                          project.priority,
                        )}`}
                      >
                        {getPriorityLabel(project.priority)}
                      </span>

                      <div className="text-right" suppressHydrationWarning>
                        <span
                          className={`font-semibold ${
                            isLate ? 'text-danger' : 'text-text-primary'
                          }`}
                        >
                          Deadline: {formatDate(project.deliveryDate)}
                        </span>
                        {isLate && <span className="text-danger ml-1">(Late)</span>}
                        {!isLate && daysLeft <= 3 && project.status !== 'delivered' && (
                          <span className="text-warning-dark ml-1">({daysLeft}d left)</span>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-border text-xs font-semibold uppercase text-text-secondary">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Project Title</th>
                  <th scope="col" className="px-4 py-3.5">Client Company</th>
                  <th scope="col" className="px-4 py-3.5">Services</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Status</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Priority</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Delivery Date</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedProjects.map((project) => {
                  const client = clientMap.get(project.clientId)
                  const isLate = isOverdue(project.deliveryDate, project.status)
                  const daysLeft = getDaysUntil(project.deliveryDate)

                  return (
                    <tr
                      key={project.id}
                      className="hover:bg-surface/60 transition-colors duration-100"
                    >
                      <td className="px-5 py-3.5 font-medium max-w-xs">
                        <Link
                          href={`/employee/projects/${project.id}`}
                          className="text-text-primary hover:text-brand-600 font-semibold block truncate"
                        >
                          {project.name}
                        </Link>
                      </td>

                      <td className="px-4 py-3.5 text-xs font-medium text-text-secondary">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-text-muted" />
                          <span>{client?.company || 'N/A'}</span>
                        </div>
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

                      <td className="px-4 py-3.5 text-right text-xs" suppressHydrationWarning>
                        <p
                          className={`font-semibold ${
                            isLate ? 'text-danger' : 'text-text-primary'
                          }`}
                        >
                          {formatDate(project.deliveryDate)}
                        </p>
                        <p className="text-[11px] text-text-muted">
                          {isLate
                            ? 'Overdue'
                            : project.status === 'delivered'
                            ? 'Delivered'
                            : `${daysLeft}d left`}
                        </p>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/employee/projects/${project.id}`}>
                          <Button variant="secondary" size="sm">
                            <span>Open</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
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
            totalItems={filteredProjects.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </ContentWrapper>
  )
}

