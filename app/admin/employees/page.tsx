'use client'

// app/admin/employees/page.tsx
// Employee & Staff Management — Connected to live backend API with skeletons and 0-data screen.

import { useState, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card,
  Badge,
  Button,
  EmptyState,
  Avatar,
  PageLoader,
  MetricCardSkeleton,
  TableSkeleton,
} from '@/components/ui'
import { SearchBar, FilterBar, Pagination } from '@/components/common'
import { api } from '@/lib/api'
import type { Employee, Project, PayType } from '@/lib/types'
import {
  UserCheck,
  Plus,
  Mail,
  Phone,
  Briefcase,
  IndianRupee,
  ChevronRight,
  Shield,
  Clock,
  User,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function AdminEmployeesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminEmployeesContent />
    </Suspense>
  )
}

function AdminEmployeesContent() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [payTypeFilter, setPayTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    Promise.allSettled([
      api.employees.list(),
      api.projects.list({ limit: 100 }),
    ])
      .then(([empRes, projRes]) => {
        if (!mounted) return
        if (empRes.status === 'fulfilled') {
          setEmployees(empRes.value || [])
        } else {
          setError('Failed to fetch employee roster from server')
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

  // Compute assigned projects per employee from real projects
  const projectCountMap = useMemo(() => {
    const map = new Map<string, { total: number; active: number }>()
    employees.forEach((emp) => {
      const assigned = projects.filter(
        (p) =>
          p.primaryEmployeeId === emp.id || p.additionalMemberIds?.includes(emp.id),
      )
      const active = assigned.filter((p) => p.status !== 'delivered').length
      map.set(emp.id, { total: assigned.length, active })
    })
    return map
  }, [employees, projects])

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.fullName.toLowerCase().includes(search.toLowerCase()) ||
        emp.email.toLowerCase().includes(search.toLowerCase()) ||
        emp.designation.toLowerCase().includes(search.toLowerCase()) ||
        emp.phone.includes(search)

      const matchesPayType =
        payTypeFilter === 'all'
          ? true
          : payTypeFilter === 'inactive'
          ? emp.status === 'inactive'
          : emp.payType === payTypeFilter && emp.status === 'active'

      return matchesSearch && matchesPayType
    })
  }, [employees, search, payTypeFilter])

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredEmployees.slice(start, start + itemsPerPage)
  }, [filteredEmployees, currentPage, itemsPerPage])

  const activeStaffCount = useMemo(
    () => employees.filter((e) => e.status === 'active').length,
    [employees],
  )
  const monthlySalaryBurn = useMemo(
    () =>
      employees
        .filter((e) => e.status === 'active' && e.payType === 'salary')
        .reduce((sum, e) => sum + e.payRate, 0),
    [employees],
  )

  const filterOptions = [
    { id: 'all', label: 'All Staff', count: employees.length },
    {
      id: 'salary',
      label: 'Full-Time Salary',
      count: employees.filter((e) => e.payType === 'salary' && e.status === 'active').length,
    },
    {
      id: 'hourly',
      label: 'Hourly Freelance',
      count: employees.filter((e) => e.payType === 'hourly' && e.status === 'active').length,
    },
    {
      id: 'intern',
      label: 'Interns',
      count: employees.filter((e) => e.payType === 'intern' && e.status === 'active').length,
    },
    {
      id: 'inactive',
      label: 'Deactivated',
      count: employees.filter((e) => e.status === 'inactive').length,
    },
  ]

  return (
    <ContentWrapper>
      <PageHeader
        title="Employee Management"
        description="Manage your digital marketing specialists, compensation models, and active workloads."
        action={
          <Link href="/admin/employees/new">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              <span>Add Team Member</span>
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
              <span className="text-xs text-text-muted">Total Team Size</span>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {employees.length}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {activeStaffCount} active profiles
              </p>
            </Card>

            <Card padding="md">
              <span className="text-xs text-text-muted">Active Staff</span>
              <p className="text-2xl font-bold text-success mt-1">
                {activeStaffCount}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">Available for assignment</p>
            </Card>

            <Card padding="md">
              <span className="text-xs text-text-muted">Full-Time Payroll</span>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {formatCurrency(monthlySalaryBurn)}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">Monthly base commitment</p>
            </Card>

            <Card padding="md">
              <span className="text-xs text-text-muted">Active Workloads</span>
              <p className="text-2xl font-bold text-brand-600 mt-1">
                {projects.filter((p) => p.status !== 'delivered').length}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">Total ongoing tasks</p>
            </Card>
          </>
        )}
      </div>

      {/* Search & Role Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between mb-4">
        <SearchBar
          value={search}
          onChange={(val) => {
            setSearch(val)
            setCurrentPage(1)
          }}
          placeholder="Search by name, role title, email..."
          className="max-w-md w-full"
        />

        <FilterBar
          options={filterOptions}
          activeId={payTypeFilter}
          onChange={(id) => {
            setPayTypeFilter(id)
            setCurrentPage(1)
          }}
        />
      </div>

      {/* Loading Skeletons */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : paginatedEmployees.length === 0 ? (
        /* 0 Screen / Empty State */
        <Card padding="lg" className="text-center py-12">
          <EmptyState
            icon={<User className="h-10 w-10 text-slate-300 mx-auto" />}
            title={search ? 'No matching team members' : '0 Employees Registered'}
            description={
              search
                ? `No staff members matched "${search}". Try searching another name.`
                : 'Add your digital marketing specialists, account managers, and interns to assign work.'
            }
            action={
              search ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setPayTypeFilter('all')
                  }}
                >
                  Clear search
                </Button>
              ) : (
                <Link href="/admin/employees/new">
                  <Button variant="primary" size="sm">
                    <Plus className="h-4 w-4" />
                    <span>Add First Employee</span>
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
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Designation</th>
                      <th className="py-3 px-4">Compensation</th>
                      <th className="py-3 px-4">Active Projects</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {paginatedEmployees.map((emp) => {
                      const counts = projectCountMap.get(emp.id) || { total: 0, active: 0 }

                      return (
                        <tr key={emp.id} className="hover:bg-surface/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={emp.fullName} size="md" />
                              <div className="min-w-0">
                                <Link
                                  href={`/admin/employees/${emp.id}`}
                                  className="font-semibold text-text-primary hover:text-brand-600 block truncate"
                                >
                                  {emp.fullName}
                                </Link>
                                <span className="text-[11px] text-text-muted truncate block">
                                  {emp.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-medium text-text-primary">
                            {emp.designation}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-text-primary block">
                              {formatCurrency(emp.payRate)}
                            </span>
                            <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">
                              {emp.payType === 'salary'
                                ? 'Monthly'
                                : emp.payType === 'hourly'
                                ? 'Hourly'
                                : 'Stipend'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <Briefcase className="h-3.5 w-3.5 text-text-muted" />
                              <span className="font-semibold text-text-primary">
                                {counts.active} active
                              </span>
                              <span className="text-text-muted">
                                ({counts.total} total)
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <Badge
                              variant={emp.status === 'active' ? 'green' : 'gray'}
                              size="sm"
                            >
                              {emp.status}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <Link href={`/admin/employees/${emp.id}`}>
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
            {paginatedEmployees.map((emp) => {
              const counts = projectCountMap.get(emp.id) || { total: 0, active: 0 }

              return (
                <Card key={emp.id} padding="md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={emp.fullName} size="md" />
                      <div>
                        <Link
                          href={`/admin/employees/${emp.id}`}
                          className="font-semibold text-text-primary hover:text-brand-600 text-sm"
                        >
                          {emp.fullName}
                        </Link>
                        <p className="text-xs text-text-muted">{emp.designation}</p>
                      </div>
                    </div>
                    <Badge
                      variant={emp.status === 'active' ? 'green' : 'gray'}
                      size="sm"
                    >
                      {emp.status}
                    </Badge>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-text-muted">Active Work:</span>{' '}
                      <strong className="text-text-primary">
                        {counts.active} projects
                      </strong>
                    </div>
                    <div>
                      <span className="text-text-muted">Pay:</span>{' '}
                      <strong className="text-text-primary">
                        {formatCurrency(emp.payRate)}
                      </strong>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 flex items-center justify-end">
                    <Link href={`/admin/employees/${emp.id}`} className="w-full">
                      <Button variant="secondary" size="sm" className="w-full">
                        View Team Member
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
