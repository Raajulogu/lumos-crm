'use client'

// app/admin/employees/[id]/page.tsx
// Employee Profile & Performance Metrics — Workload distribution, on-time delivery KPIs, and account management.

import { useState, useMemo, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, Badge, Button, Avatar, Toggle, PageLoader } from '@/components/ui'
import {
  mockEmployees,
  mockProjects,
  mockClients,
  mockDoubts,
} from '@/lib/mock-data'
import {
  User,
  Mail,
  Phone,
  Briefcase,
  IndianRupee,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowLeft,
  ChevronRight,
  TrendingUp,
  Award,
} from 'lucide-react'
import {
  formatDate,
  formatCurrency,
  getStatusLabel,
  getStatusColor,
  getPriorityColor,
  getPriorityLabel,
  isOverdue,
} from '@/lib/utils'

export default function AdminEmployeeDetailPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminEmployeeDetailContent />
    </Suspense>
  )
}

function AdminEmployeeDetailContent() {
  const params = useParams()
  const router = useRouter()
  const empId = params?.id as string

  const initialEmp = mockEmployees.find((e) => e.id === empId)
  const [employee, setEmployee] = useState(initialEmp)

  // Lookups
  const clientMap = useMemo(() => new Map(mockClients.map((c) => [c.id, c])), [])

  // Assigned projects
  const assignedProjects = useMemo(() => {
    return mockProjects.filter(
      (p) =>
        p.primaryEmployeeId === empId || p.additionalMemberIds.includes(empId),
    )
  }, [empId])

  const employeeDoubts = useMemo(() => {
    return mockDoubts.filter((d) => d.raisedById === empId)
  }, [empId])

  if (!employee) {
    return (
      <ContentWrapper>
        <Card padding="lg" className="text-center py-12">
          <p className="text-base font-semibold text-text-primary">Employee Not Found</p>
          <p className="text-sm text-text-muted mt-1">
            The team member profile you requested does not exist.
          </p>
          <Link href="/admin/employees" className="inline-block mt-4">
            <Button variant="primary" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Return to Staff List
            </Button>
          </Link>
        </Card>
      </ContentWrapper>
    )
  }

  // Performance calculations
  const totalHandled = assignedProjects.length
  const completedProjects = assignedProjects.filter(
    (p) => p.status === 'completed' || p.status === 'delivered',
  )
  const activeProjects = assignedProjects.filter((p) => p.status !== 'delivered')
  const overdueProjects = activeProjects.filter((p) =>
    isOverdue(p.deliveryDate, p.status),
  )
  const openDoubts = employeeDoubts.filter((d) => d.status === 'open')

  // Calculate on-time rate: completed projects not marked as overdue
  const onTimeRate =
    totalHandled > 0
      ? Math.round(((totalHandled - overdueProjects.length) / totalHandled) * 100)
      : 100

  function toggleActiveStatus() {
    const updated = {
      ...employee!,
      status: (employee!.status === 'active' ? 'inactive' : 'active') as 'active' | 'inactive',
    }
    setEmployee(updated)
  }

  return (
    <ContentWrapper>
      <PageHeader
        title={employee.fullName}
        description={`${employee.designation} • Joined ${formatDate(employee.joinDate)}`}
        breadcrumbs={[
          { label: 'Employees', href: '/admin/employees' },
          { label: employee.fullName },
        ]}
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-border">
              <span className="text-xs text-text-secondary font-medium">Account:</span>
              <Badge
                variant={employee.status === 'active' ? 'green' : 'gray'}
                size="sm"
              >
                {employee.status}
              </Badge>
              <Toggle
                checked={employee.status === 'active'}
                onChange={toggleActiveStatus}
                size="sm"
              />
            </div>
          </div>
        }
      />

      {/* KPI Performance Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card padding="md">
          <p className="text-xs text-text-muted">Total Projects</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{totalHandled}</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {completedProjects.length} delivered
          </p>
        </Card>

        <Card padding="md">
          <p className="text-xs text-text-muted">Active Workload</p>
          <p className="text-2xl font-bold text-brand-700 mt-1">{activeProjects.length}</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {overdueProjects.length > 0 ? `${overdueProjects.length} overdue` : 'On track'}
          </p>
        </Card>

        <Card padding="md">
          <p className="text-xs text-text-muted">On-Time Delivery Rate</p>
          <div className="flex items-center gap-1.5 mt-1">
            <p className="text-2xl font-bold text-success-dark">{onTimeRate}%</p>
            <Award className="h-4 w-4 text-success" />
          </div>
          <p className="text-[11px] text-text-muted mt-0.5">Performance index</p>
        </Card>

        <Card padding="md">
          <p className="text-xs text-text-muted">Open Inquiries / Doubts</p>
          <p className="text-2xl font-bold text-purple-dark mt-1">{openDoubts.length}</p>
          <p className="text-[11px] text-text-muted mt-0.5">
            {employeeDoubts.length} total submitted
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Assigned Projects Portfolio */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding="md">
            <CardHeader
              title="Assigned Projects"
              description="Deliverables currently managed or completed by this staff member"
            />

            {assignedProjects.length === 0 ? (
              <p className="text-sm text-text-muted py-8 text-center">
                No projects currently assigned to this employee.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {assignedProjects.map((proj) => {
                  const client = clientMap.get(proj.clientId)
                  const isLate = isOverdue(proj.deliveryDate, proj.status)

                  return (
                    <div
                      key={proj.id}
                      className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/projects/${proj.id}`}
                            className="font-semibold text-sm text-text-primary hover:text-brand-600 truncate"
                          >
                            {proj.name}
                          </Link>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                              proj.status,
                            )}`}
                          >
                            {getStatusLabel(proj.status)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(
                              proj.priority,
                            )}`}
                          >
                            {getPriorityLabel(proj.priority)}
                          </span>
                        </div>

                        <p className="text-xs text-text-muted mt-1">
                          Client: <strong className="text-text-secondary">{client?.companyName}</strong> •{' '}
                          Role: {proj.primaryEmployeeId === empId ? 'Lead Manager' : 'Collaborator'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                        <div className="text-right text-xs">
                          <p className="text-text-muted">Deadline</p>
                          <p className={isLate ? 'text-danger font-semibold' : 'text-text-primary font-medium'}>
                            {formatDate(proj.deliveryDate)}
                          </p>
                        </div>

                        <Link href={`/admin/projects/${proj.id}`}>
                          <Button variant="secondary" size="sm">
                            View
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Submitted Doubts */}
          <Card padding="md">
            <CardHeader
              title="Recent Questions & Doubts"
              description="Inquiries submitted regarding active deliverables"
            />

            {employeeDoubts.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">
                No doubts submitted by this staff member.
              </p>
            ) : (
              <div className="space-y-3">
                {employeeDoubts.map((doubt) => (
                  <div
                    key={doubt.id}
                    className="p-3 rounded-lg border border-border bg-surface text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-primary">
                        {doubt.subject}
                      </span>
                      <Badge
                        variant={doubt.status === 'resolved' ? 'green' : 'amber'}
                        size="sm"
                      >
                        {doubt.status}
                      </Badge>
                    </div>
                    <p className="text-text-secondary">{doubt.description}</p>
                    {doubt.adminReply && (
                      <p className="text-brand-800 bg-brand-50 p-2 rounded text-[11px]">
                        <strong>Your Reply:</strong> {doubt.adminReply}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right (1 Col): Personal Profile & Compensation */}
        <div className="space-y-6">
          <Card padding="md">
            <CardHeader
              title="Staff Profile"
              description="Contact & compensation breakdown"
            />

            <div className="space-y-3.5 text-xs">
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <Avatar name={employee.fullName} size="lg" />
                <div>
                  <h4 className="font-bold text-sm text-text-primary">{employee.fullName}</h4>
                  <p className="text-text-muted">{employee.designation}</p>
                </div>
              </div>

              <div>
                <p className="text-text-muted">Email Address</p>
                <a
                  href={`mailto:${employee.email}`}
                  className="font-medium text-brand-600 hover:underline mt-0.5 block"
                >
                  {employee.email}
                </a>
              </div>

              <div>
                <p className="text-text-muted">Phone Number</p>
                <a
                  href={`tel:${employee.phone}`}
                  className="font-medium text-text-primary hover:underline mt-0.5 block"
                >
                  {employee.phone}
                </a>
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-text-muted">Employment Type</p>
                <p className="font-semibold text-text-primary mt-0.5 capitalize">
                  {employee.payType === 'salary'
                    ? 'Full-Time Salaried'
                    : employee.payType === 'intern'
                    ? 'Internship'
                    : 'Hourly Consultant'}
                </p>
              </div>

              <div>
                <p className="text-text-muted">Compensation Rate</p>
                <p className="font-bold text-base text-text-primary mt-0.5">
                  {formatCurrency(employee.payRate)}
                  <span className="text-xs font-normal text-text-muted ml-1">
                    {employee.payType === 'hourly' ? 'per hour' : 'per month'}
                  </span>
                </p>
              </div>

              {employee.notes && (
                <div className="pt-2 border-t border-border">
                  <p className="text-text-muted mb-1">Notes & Tool Proficiencies</p>
                  <p className="text-text-secondary bg-surface p-2.5 rounded-lg border border-border leading-relaxed">
                    {employee.notes}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </ContentWrapper>
  )
}
