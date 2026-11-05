'use client'

// app/admin/employees/page.tsx
// Employee & Staff Management — Manage full-time, interns, hourly consultants, and payroll types.

import { useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, Badge, Button, EmptyState, Avatar, PageLoader } from '@/components/ui'
import { SearchBar, FilterBar, Pagination } from '@/components/common'
import { mockEmployees, mockProjects } from '@/lib/mock-data'
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
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { PayType } from '@/lib/types'

export default function AdminEmployeesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminEmployeesContent />
    </Suspense>
  )
}

function AdminEmployeesContent() {
  const [employees, setEmployees] = useState(mockEmployees)
  const [search, setSearch] = useState('')
  const [payTypeFilter, setPayTypeFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8

  // Compute assigned projects per employee
  const projectCountMap = useMemo(() => {
    const map = new Map<string, { total: number; active: number }>()
    employees.forEach((emp) => {
      const assigned = mockProjects.filter(
        (p) =>
          p.primaryEmployeeId === emp.id || p.additionalMemberIds.includes(emp.id),
      )
      const active = assigned.filter((p) => p.status !== 'delivered').length
      map.set(emp.id, { total: assigned.length, active })
    })
    return map
  }, [employees])

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

  // Metrics
  const salaryCount = employees.filter((e) => e.payType === 'salary').length
  const internCount = employees.filter((e) => e.payType === 'intern').length
  const hourlyCount = employees.filter((e) => e.payType === 'hourly').length

  const filterOptions = [
    { id: 'all', label: 'All Team Members', count: employees.length },
    { id: 'salary', label: 'Salaried Full-Time', count: salaryCount },
    { id: 'intern', label: 'Interns', count: internCount },
    { id: 'hourly', label: 'Hourly Contractors', count: hourlyCount },
  ]

  // Pagination
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage)
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredEmployees.slice(start, start + itemsPerPage)
  }, [filteredEmployees, currentPage, itemsPerPage])

  function getPayTypeBadge(type: PayType) {
    if (type === 'salary') return <Badge variant="blue" size="sm">Salary</Badge>
    if (type === 'intern') return <Badge variant="purple" size="sm">Intern</Badge>
    return <Badge variant="amber" size="sm">Hourly</Badge>
  }

  return (
    <ContentWrapper>
      <PageHeader
        title="Agency Team & Staff"
        description="Manage digital marketing specialists, interns, hourly consultants, and credentials."
        action={
          <Link href="/admin/employees/new">
            <Button variant="primary" size="sm">
              <Plus className="h-4 w-4" />
              <span>Add Employee</span>
            </Button>
          </Link>
        }
      />

      {/* Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card padding="sm">
          <p className="text-xs text-text-muted">Total Headcount</p>
          <p className="text-xl font-bold text-text-primary mt-0.5">{employees.length}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">Full-Time Staff</p>
          <p className="text-xl font-bold text-brand-700 mt-0.5">{salaryCount}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">Interns Hired</p>
          <p className="text-xl font-bold text-purple-dark mt-0.5">{internCount}</p>
        </Card>
        <Card padding="sm">
          <p className="text-xs text-text-muted">Hourly Contractors</p>
          <p className="text-xl font-bold text-warning-dark mt-0.5">{hourlyCount}</p>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
        <SearchBar
          value={search}
          onChange={(val) => {
            setSearch(val)
            setCurrentPage(1)
          }}
          placeholder="Search by name, designation, or email..."
          className="w-full sm:max-w-xs"
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

      {/* Employees Display */}
      {paginatedEmployees.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<UserCheck className="h-10 w-10" />}
            title="No staff members found"
            description="No team members match your active filters. Try searching for another name or adding staff."
            action={{
              label: 'Add Team Member',
              onClick: () => {},
            }}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {paginatedEmployees.map((emp) => {
              const counts = projectCountMap.get(emp.id)

              return (
                <Link key={emp.id} href={`/admin/employees/${emp.id}`}>
                  <Card padding="md" hover className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={emp.fullName} size="md" />
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm text-text-primary truncate">
                            {emp.fullName}
                          </h4>
                          <p className="text-xs text-text-muted truncate">
                            {emp.designation}
                          </p>
                        </div>
                      </div>

                      {getPayTypeBadge(emp.payType)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border bg-surface -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl">
                      <div>
                        <span className="text-text-muted">Assigned: </span>
                        <strong className="text-text-primary">
                          {counts?.active ?? 0} active ({counts?.total ?? 0} total)
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-text-muted">Rate: </span>
                        <strong className="text-text-primary">
                          {formatCurrency(emp.payRate)}
                          {emp.payType === 'hourly' ? '/hr' : '/mo'}
                        </strong>
                      </div>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface border-b border-border text-xs font-semibold uppercase text-text-secondary">
                <tr>
                  <th scope="col" className="px-5 py-3.5">Employee Name & Role</th>
                  <th scope="col" className="px-4 py-3.5">Email</th>
                  <th scope="col" className="px-4 py-3.5">Phone</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Employment Type</th>
                  <th scope="col" className="px-4 py-3.5 text-right">Pay Rate</th>
                  <th scope="col" className="px-4 py-3.5 text-center">Active Projects</th>
                  <th scope="col" className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedEmployees.map((emp) => {
                  const counts = projectCountMap.get(emp.id)

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-surface/60 transition-colors duration-100"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={emp.fullName} size="sm" />
                          <div>
                            <Link
                              href={`/admin/employees/${emp.id}`}
                              className="font-semibold text-text-primary hover:text-brand-600 block text-xs"
                            >
                              {emp.fullName}
                            </Link>
                            <p className="text-[11px] text-text-muted mt-0.5">
                              {emp.designation}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-text-secondary">
                        <a
                          href={`mailto:${emp.email}`}
                          className="hover:underline hover:text-brand-600 flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3 text-text-muted" />
                          <span>{emp.email}</span>
                        </a>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-text-secondary">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-text-muted" />
                          <span>{emp.phone}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-center">
                        {getPayTypeBadge(emp.payType)}
                      </td>

                      <td className="px-4 py-3.5 text-right text-xs font-semibold text-text-primary">
                        {formatCurrency(emp.payRate)}
                        <span className="text-[10px] text-text-muted font-normal ml-0.5">
                          {emp.payType === 'hourly' ? '/hr' : '/mo'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-center text-xs">
                        <span className="font-semibold text-text-primary">
                          {counts?.active ?? 0}
                        </span>
                        <span className="text-text-muted text-[11px] ml-1">
                          ({counts?.total ?? 0} all)
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/admin/employees/${emp.id}`}>
                          <Button variant="ghost" size="sm">
                            <span>Profile</span>
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
            totalItems={filteredEmployees.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
      )}
    </ContentWrapper>
  )
}

