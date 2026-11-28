'use client'

// app/admin/hrms/page.tsx
// Admin HRMS Hub — Review & approve/reject employee leave requests, short permissions, and audit attendance.

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card,
  Badge,
  Button,
  Modal,
  Textarea,
  Avatar,
  EmptyState,
  PageLoader,
  MetricCardSkeleton,
  TableSkeleton,
} from '@/components/ui'
import { SearchBar, FilterBar } from '@/components/common'
import { api } from '@/lib/api'
import type {
  Employee,
  LeaveRequest,
  PermissionRequest,
  PermissionType,
  AttendanceRecord,
} from '@/lib/types'
import {
  CalendarOff,
  FileCheck,
  Clock,
  Check,
  X,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'

const PERMISSION_LABELS: Record<PermissionType, string> = {
  late_arrival: 'Late Arrival',
  early_exit: 'Early Exit',
  short_break: 'Short Break',
  official_errand: 'Official / Client Errand',
}

function getInclusiveDays(startDate: string, endDate: string): number {
  const s = new Date(startDate)
  const e = new Date(endDate)
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1
  const diff = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1
  return Math.max(1, diff)
}

function formatDurationMinutes(minutes?: number): string {
  if (!minutes || minutes <= 0) return '—'
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`
  if (hrs > 0) return `${hrs}h`
  return `${mins}m`
}

type AdminHrmsTab = 'leaves' | 'permissions' | 'attendance'

interface ReviewTarget {
  kind: 'leave' | 'permission'
  id: string
  employeeName: string
  summary: string
  decision: 'approved' | 'rejected'
}

export default function AdminHrmsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminHrmsContent />
    </Suspense>
  )
}

function AdminHrmsContent() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<AdminHrmsTab>(() =>
    initialTab === 'permissions' || initialTab === 'attendance' ? initialTab : 'leaves',
  )

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [permissions, setPermissions] = useState<PermissionRequest[]>([])
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [employeeFilter, setEmployeeFilter] = useState('all')
  const [attendanceDateFilter, setAttendanceDateFilter] = useState('')

  // Approval / Rejection Modal
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [isSavingReview, setIsSavingReview] = useState(false)
  const [reviewError, setReviewError] = useState('')

  const fetchHrmsData = useCallback(async () => {
    try {
      const [leaveRes, permRes, attRes, empRes] = await Promise.allSettled([
        api.hrms.getLeaves(),
        api.hrms.getPermissions(),
        api.hrms.getAttendance(),
        api.employees.list(),
      ])

      if (leaveRes.status === 'fulfilled') setLeaves(leaveRes.value || [])
      if (permRes.status === 'fulfilled') setPermissions(permRes.value || [])
      if (attRes.status === 'fulfilled') setAttendance(attRes.value || [])
      if (empRes.status === 'fulfilled') setEmployees(empRes.value || [])
    } catch {
      setError('Failed to load HRMS records from server')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadData = useCallback(async () => {
    setError(null)
    setLoading(true)
    await fetchHrmsData()
  }, [fetchHrmsData])

  useEffect(() => {
    let mounted = true
    Promise.allSettled([
      api.hrms.getLeaves(),
      api.hrms.getPermissions(),
      api.hrms.getAttendance(),
      api.employees.list(),
    ])
      .then(([leaveRes, permRes, attRes, empRes]) => {
        if (!mounted) return
        if (leaveRes.status === 'fulfilled') setLeaves(leaveRes.value || [])
        if (permRes.status === 'fulfilled') setPermissions(permRes.value || [])
        if (attRes.status === 'fulfilled') setAttendance(attRes.value || [])
        if (empRes.status === 'fulfilled') setEmployees(empRes.value || [])
      })
      .catch(() => {
        if (mounted) setError('Failed to load HRMS records from server')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id, e])),
    [employees],
  )

  const getEmployeeMeta = useCallback(
    (userId: string, fallbackName?: string, fallbackDesignation?: string) => {
      const emp = employeeMap.get(userId)
      return {
        name: fallbackName || emp?.fullName || 'Team Member',
        designation: fallbackDesignation || emp?.designation || '',
        hasProfile: Boolean(emp || (userId && userId !== 'current')),
      }
    },
    [employeeMap],
  )

  const filteredLeaves = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leaves.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false
      if (employeeFilter !== 'all' && l.userId !== employeeFilter) return false
      if (!q) return true
      const meta = getEmployeeMeta(l.userId, l.employeeName, l.employeeDesignation)
      return (
        meta.name.toLowerCase().includes(q) ||
        meta.designation.toLowerCase().includes(q) ||
        l.type.toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q)
      )
    })
  }, [leaves, statusFilter, employeeFilter, search, getEmployeeMeta])

  const filteredPermissions = useMemo(() => {
    const q = search.trim().toLowerCase()
    return permissions.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (employeeFilter !== 'all' && p.userId !== employeeFilter) return false
      if (!q) return true
      const meta = getEmployeeMeta(p.userId, p.employeeName, p.employeeDesignation)
      const label = PERMISSION_LABELS[p.type] || p.type
      return (
        meta.name.toLowerCase().includes(q) ||
        meta.designation.toLowerCase().includes(q) ||
        label.toLowerCase().includes(q) ||
        p.reason.toLowerCase().includes(q)
      )
    })
  }, [permissions, statusFilter, employeeFilter, search, getEmployeeMeta])

  const filteredAttendance = useMemo(() => {
    const q = search.trim().toLowerCase()
    return attendance.filter((rec) => {
      if (employeeFilter !== 'all' && rec.employeeId !== employeeFilter) return false
      if (
        attendanceDateFilter &&
        (rec.date || rec.clockInTime.slice(0, 10)) !== attendanceDateFilter
      ) {
        return false
      }
      if (!q) return true
      const meta = getEmployeeMeta(rec.employeeId, rec.employeeName, rec.employeeDesignation)
      return (
        meta.name.toLowerCase().includes(q) ||
        meta.designation.toLowerCase().includes(q)
      )
    })
  }, [attendance, employeeFilter, attendanceDateFilter, search, getEmployeeMeta])

  const pendingLeavesCount = useMemo(
    () => leaves.filter((l) => l.status === 'pending').length,
    [leaves],
  )
  const pendingPermsCount = useMemo(
    () => permissions.filter((p) => p.status === 'pending').length,
    [permissions],
  )
  const approvedLeavesCount = useMemo(
    () => leaves.filter((l) => l.status === 'approved').length,
    [leaves],
  )
  const clockedInTodayCount = useMemo(
    () => attendance.filter((a) => a.status === 'clocked_in').length,
    [attendance],
  )

  function openReviewModal(target: ReviewTarget) {
    setReviewTarget(target)
    setReviewNotes('')
    setReviewError('')
  }

  async function handleConfirmReview(e: React.FormEvent) {
    e.preventDefault()
    if (!reviewTarget) return

    setReviewError('')
    setIsSavingReview(true)
    try {
      const notes = reviewNotes.trim() || undefined
      if (reviewTarget.kind === 'leave') {
        await api.hrms.reviewLeave(reviewTarget.id, {
          status: reviewTarget.decision,
          reviewNotes: notes,
        })
        setLeaves((prev) =>
          prev.map((l) =>
            l.id === reviewTarget.id
              ? {
                  ...l,
                  status: reviewTarget.decision,
                  reviewNotes: notes,
                  reviewedAt: new Date().toISOString(),
                }
              : l,
          ),
        )
      } else {
        await api.hrms.reviewPermission(reviewTarget.id, {
          status: reviewTarget.decision,
          reviewNotes: notes,
        })
        setPermissions((prev) =>
          prev.map((p) =>
            p.id === reviewTarget.id
              ? {
                  ...p,
                  status: reviewTarget.decision,
                  reviewNotes: notes,
                  reviewedAt: new Date().toISOString(),
                }
              : p,
          ),
        )
      }
      setReviewTarget(null)
      setReviewNotes('')
    } catch (err: unknown) {
      setReviewError(
        err instanceof Error ? err.message : 'Failed to update approval status. Please try again.',
      )
    } finally {
      setIsSavingReview(false)
    }
  }

  const activeRequestSource = activeTab === 'leaves' ? leaves : permissions
  const statusFilterOptions = [
    { id: 'all', label: 'All', count: activeRequestSource.length },
    {
      id: 'pending',
      label: 'Pending Review',
      count: activeRequestSource.filter((r) => r.status === 'pending').length,
    },
    {
      id: 'approved',
      label: 'Approved',
      count: activeRequestSource.filter((r) => r.status === 'approved').length,
    },
    {
      id: 'rejected',
      label: 'Rejected',
      count: activeRequestSource.filter((r) => r.status === 'rejected').length,
    },
  ]

  return (
    <ContentWrapper>
      <PageHeader
        title="HRMS & Leave Approvals"
        description="Review staff leave applications, short-hour permissions, and shift attendance logs."
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setLoading(true)
              loadData()
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>
        }
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-danger-light border border-danger/30 text-danger-dark flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <Card padding="md">
              <p className="text-xs text-text-muted">Pending Leave Requests</p>
              <p className="text-2xl font-bold text-warning-dark mt-1">{pendingLeavesCount}</p>
              <p className="text-[11px] text-text-muted mt-0.5">Awaiting admin approval</p>
            </Card>
            <Card padding="md">
              <p className="text-xs text-text-muted">Pending Permissions</p>
              <p className="text-2xl font-bold text-brand-700 mt-1">{pendingPermsCount}</p>
              <p className="text-[11px] text-text-muted mt-0.5">Short-hour requests</p>
            </Card>
            <Card padding="md">
              <p className="text-xs text-text-muted">Approved Leaves</p>
              <p className="text-2xl font-bold text-success-dark mt-1">{approvedLeavesCount}</p>
              <p className="text-[11px] text-text-muted mt-0.5">Out of {leaves.length} total</p>
            </Card>
            <Card padding="md">
              <p className="text-xs text-text-muted">Currently Clocked In</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{clockedInTodayCount}</p>
              <p className="text-[11px] text-text-muted mt-0.5">{attendance.length} shift records</p>
            </Card>
          </>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('leaves')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
            activeTab === 'leaves'
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white text-text-secondary border-border hover:bg-surface'
          }`}
        >
          <CalendarOff className="h-4 w-4" />
          <span>Leave Requests</span>
          {pendingLeavesCount > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'leaves'
                  ? 'bg-white/20 text-white'
                  : 'bg-warning-light text-warning-dark'
              }`}
            >
              {pendingLeavesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('permissions')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
            activeTab === 'permissions'
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white text-text-secondary border-border hover:bg-surface'
          }`}
        >
          <FileCheck className="h-4 w-4" />
          <span>Permission Requests</span>
          {pendingPermsCount > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'permissions'
                  ? 'bg-white/20 text-white'
                  : 'bg-warning-light text-warning-dark'
              }`}
            >
              {pendingPermsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
            activeTab === 'attendance'
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white text-text-secondary border-border hover:bg-surface'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Attendance Logs ({attendance.length})</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search employee name, role, or reason..."
            className="sm:max-w-xs w-full"
          />

          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            aria-label="Filter by employee"
            className="h-10 rounded-xl border border-border bg-white px-3 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
          >
            <option value="all">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.fullName} ({emp.designation})
              </option>
            ))}
          </select>

          {activeTab === 'attendance' && (
            <input
              type="date"
              value={attendanceDateFilter}
              onChange={(e) => setAttendanceDateFilter(e.target.value)}
              aria-label="Filter attendance by date"
              className="h-10 rounded-xl border border-border bg-white px-3 text-xs text-text-primary focus:border-brand-500 focus:outline-none"
            />
          )}
        </div>

        {activeTab !== 'attendance' && (
          <FilterBar
            options={statusFilterOptions}
            activeId={statusFilter}
            onChange={(id) =>
              setStatusFilter(id as 'all' | 'pending' | 'approved' | 'rejected')
            }
          />
        )}
      </div>

      {/* Tab Body */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : activeTab === 'leaves' ? (
        filteredLeaves.length === 0 ? (
          <Card padding="lg">
            <EmptyState
              icon={<CalendarOff className="h-10 w-10 text-slate-300 mx-auto" />}
              title="No Leave Requests Found"
              description="Employee leave requests submitted via their HRMS portal appear here for approval."
            />
          </Card>
        ) : (
          <>
            {/* Mobile Leave Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {filteredLeaves.map((l) => {
                const meta = getEmployeeMeta(l.userId, l.employeeName, l.employeeDesignation)
                const days = getInclusiveDays(l.startDate, l.endDate)
                return (
                  <Card key={l.id} padding="md" className="text-xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={meta.name} size="sm" />
                        <div className="min-w-0">
                          {meta.hasProfile ? (
                            <Link
                              href={`/admin/employees/${l.userId}`}
                              className="font-bold text-sm text-text-primary hover:text-brand-600 truncate block"
                            >
                              {meta.name}
                            </Link>
                          ) : (
                            <p className="font-bold text-sm text-text-primary truncate">{meta.name}</p>
                          )}
                          {meta.designation && (
                            <p className="text-[11px] text-text-muted truncate">{meta.designation}</p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          l.status === 'approved'
                            ? 'green'
                            : l.status === 'rejected'
                            ? 'red'
                            : 'amber'
                        }
                        size="sm"
                      >
                        {l.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-surface px-2.5 py-2 rounded-lg border border-border/70">
                      <span className="font-semibold capitalize text-text-primary">
                        {l.type} Leave ({days} {days === 1 ? 'day' : 'days'})
                      </span>
                      <span className="text-text-muted">
                        {formatDate(l.startDate)} – {formatDate(l.endDate)}
                      </span>
                    </div>

                    <p className="text-text-secondary leading-relaxed">{l.reason}</p>

                    {l.reviewNotes && (
                      <p className="p-2 rounded bg-brand-50 text-brand-800 text-[11px]">
                        <strong>Admin Note:</strong> {l.reviewNotes}
                      </p>
                    )}

                    {l.status === 'pending' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            openReviewModal({
                              kind: 'leave',
                              id: l.id,
                              employeeName: meta.name,
                              summary: `${l.type} leave (${formatDate(l.startDate)} – ${formatDate(l.endDate)})`,
                              decision: 'approved',
                            })
                          }
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            openReviewModal({
                              kind: 'leave',
                              id: l.id,
                              employeeName: meta.name,
                              summary: `${l.type} leave (${formatDate(l.startDate)} – ${formatDate(l.endDate)})`,
                              decision: 'rejected',
                            })
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </Button>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>

            {/* Desktop Leave Table */}
            <Card padding="none" className="hidden md:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-text-secondary">
                  <thead className="bg-surface border-b border-border text-text-primary font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-3">Leave Type & Dates</th>
                      <th className="py-3 px-3">Reason</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Approval Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {filteredLeaves.map((l) => {
                      const meta = getEmployeeMeta(l.userId, l.employeeName, l.employeeDesignation)
                      const days = getInclusiveDays(l.startDate, l.endDate)
                      return (
                        <tr key={l.id} className="hover:bg-surface/50">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={meta.name} size="sm" />
                              <div>
                                {meta.hasProfile ? (
                                  <Link
                                    href={`/admin/employees/${l.userId}`}
                                    className="font-semibold text-text-primary hover:text-brand-600 inline-flex items-center gap-1"
                                  >
                                    <span>{meta.name}</span>
                                    <ExternalLink className="h-3 w-3 text-text-muted" />
                                  </Link>
                                ) : (
                                  <span className="font-semibold text-text-primary">{meta.name}</span>
                                )}
                                {meta.designation && (
                                  <p className="text-[11px] text-text-muted">{meta.designation}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <p className="font-semibold text-text-primary capitalize">
                              {l.type} Leave • {days} {days === 1 ? 'day' : 'days'}
                            </p>
                            <p className="text-[11px] text-text-muted">
                              {formatDate(l.startDate)} – {formatDate(l.endDate)}
                            </p>
                          </td>
                          <td className="py-3.5 px-3 max-w-xs">
                            <p className="text-text-secondary line-clamp-2">{l.reason}</p>
                            {l.reviewNotes && (
                              <p className="text-[11px] text-brand-700 mt-1">
                                Note: {l.reviewNotes}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <Badge
                              variant={
                                l.status === 'approved'
                                  ? 'green'
                                  : l.status === 'rejected'
                                  ? 'red'
                                  : 'amber'
                              }
                              size="sm"
                            >
                              {l.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {l.status === 'pending' ? (
                              <div className="inline-flex items-center gap-1.5">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() =>
                                    openReviewModal({
                                      kind: 'leave',
                                      id: l.id,
                                      employeeName: meta.name,
                                      summary: `${l.type} leave (${formatDate(l.startDate)} – ${formatDate(l.endDate)})`,
                                      decision: 'approved',
                                    })
                                  }
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Approve</span>
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() =>
                                    openReviewModal({
                                      kind: 'leave',
                                      id: l.id,
                                      employeeName: meta.name,
                                      summary: `${l.type} leave (${formatDate(l.startDate)} – ${formatDate(l.endDate)})`,
                                      decision: 'rejected',
                                    })
                                  }
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Reject</span>
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-text-muted">
                                {l.reviewedAt ? `Reviewed ${formatDate(l.reviewedAt)}` : 'Reviewed'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )
      ) : activeTab === 'permissions' ? (
        filteredPermissions.length === 0 ? (
          <Card padding="lg">
            <EmptyState
              icon={<FileCheck className="h-10 w-10 text-slate-300 mx-auto" />}
              title="No Permission Requests Found"
              description="Employee short-hour permission requests appear here for admin approval."
            />
          </Card>
        ) : (
          <>
            {/* Mobile Permission Cards */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {filteredPermissions.map((p) => {
                const meta = getEmployeeMeta(p.userId, p.employeeName, p.employeeDesignation)
                const typeLabel = PERMISSION_LABELS[p.type] || p.type
                return (
                  <Card key={p.id} padding="md" className="text-xs space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={meta.name} size="sm" />
                        <div className="min-w-0">
                          {meta.hasProfile ? (
                            <Link
                              href={`/admin/employees/${p.userId}`}
                              className="font-bold text-sm text-text-primary hover:text-brand-600 truncate block"
                            >
                              {meta.name}
                            </Link>
                          ) : (
                            <p className="font-bold text-sm text-text-primary truncate">{meta.name}</p>
                          )}
                          {meta.designation && (
                            <p className="text-[11px] text-text-muted truncate">{meta.designation}</p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          p.status === 'approved'
                            ? 'green'
                            : p.status === 'rejected'
                            ? 'red'
                            : 'amber'
                        }
                        size="sm"
                      >
                        {p.status}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-[11px] bg-surface px-2.5 py-2 rounded-lg border border-border/70">
                      <span className="font-semibold text-text-primary">{typeLabel}</span>
                      <span className="text-text-muted">
                        {formatDate(p.date)}
                        {p.fromTime ? ` • ${p.fromTime}–${p.toTime || ''}` : ''}
                      </span>
                    </div>

                    <p className="text-text-secondary">{p.reason}</p>

                    {p.status === 'pending' && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border">
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            openReviewModal({
                              kind: 'permission',
                              id: p.id,
                              employeeName: meta.name,
                              summary: `${typeLabel} on ${formatDate(p.date)}`,
                              decision: 'approved',
                            })
                          }
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Approve</span>
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          className="flex-1"
                          onClick={() =>
                            openReviewModal({
                              kind: 'permission',
                              id: p.id,
                              employeeName: meta.name,
                              summary: `${typeLabel} on ${formatDate(p.date)}`,
                              decision: 'rejected',
                            })
                          }
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>Reject</span>
                        </Button>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>

            {/* Desktop Permission Table */}
            <Card padding="none" className="hidden md:block overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-text-secondary">
                  <thead className="bg-surface border-b border-border text-text-primary font-semibold uppercase text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-3">Permission Type & Window</th>
                      <th className="py-3 px-3">Reason</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-4 text-right">Approval Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-white">
                    {filteredPermissions.map((p) => {
                      const meta = getEmployeeMeta(p.userId, p.employeeName, p.employeeDesignation)
                      const typeLabel = PERMISSION_LABELS[p.type] || p.type
                      return (
                        <tr key={p.id} className="hover:bg-surface/50">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={meta.name} size="sm" />
                              <div>
                                {meta.hasProfile ? (
                                  <Link
                                    href={`/admin/employees/${p.userId}`}
                                    className="font-semibold text-text-primary hover:text-brand-600 inline-flex items-center gap-1"
                                  >
                                    <span>{meta.name}</span>
                                    <ExternalLink className="h-3 w-3 text-text-muted" />
                                  </Link>
                                ) : (
                                  <span className="font-semibold text-text-primary">{meta.name}</span>
                                )}
                                {meta.designation && (
                                  <p className="text-[11px] text-text-muted">{meta.designation}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <p className="font-semibold text-text-primary">{typeLabel}</p>
                            <p className="text-[11px] text-text-muted">
                              {formatDate(p.date)}
                              {p.fromTime ? ` • ${p.fromTime} – ${p.toTime || ''}` : ''}
                            </p>
                          </td>
                          <td className="py-3.5 px-3 max-w-xs">
                            <p className="text-text-secondary line-clamp-2">{p.reason}</p>
                            {p.reviewNotes && (
                              <p className="text-[11px] text-brand-700 mt-1">
                                Note: {p.reviewNotes}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            <Badge
                              variant={
                                p.status === 'approved'
                                  ? 'green'
                                  : p.status === 'rejected'
                                  ? 'red'
                                  : 'amber'
                              }
                              size="sm"
                            >
                              {p.status}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            {p.status === 'pending' ? (
                              <div className="inline-flex items-center gap-1.5">
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() =>
                                    openReviewModal({
                                      kind: 'permission',
                                      id: p.id,
                                      employeeName: meta.name,
                                      summary: `${typeLabel} on ${formatDate(p.date)}`,
                                      decision: 'approved',
                                    })
                                  }
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Approve</span>
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  onClick={() =>
                                    openReviewModal({
                                      kind: 'permission',
                                      id: p.id,
                                      employeeName: meta.name,
                                      summary: `${typeLabel} on ${formatDate(p.date)}`,
                                      decision: 'rejected',
                                    })
                                  }
                                >
                                  <X className="h-3.5 w-3.5" />
                                  <span>Reject</span>
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-text-muted">
                                {p.reviewedAt ? `Reviewed ${formatDate(p.reviewedAt)}` : 'Reviewed'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )
      ) : filteredAttendance.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<Clock className="h-10 w-10 text-slate-300 mx-auto" />}
            title="No Attendance Records Found"
            description="Employee shift clock-ins and clock-outs will appear here."
          />
        </Card>
      ) : (
        <>
          {/* Mobile Attendance Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredAttendance.map((rec) => {
              const meta = getEmployeeMeta(
                rec.employeeId,
                rec.employeeName,
                rec.employeeDesignation,
              )
              return (
                <Card key={rec.id} padding="md" className="text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-bold text-sm text-text-primary">{meta.name}</p>
                      <p className="text-[11px] text-text-muted">
                        {formatDate(rec.date || rec.clockInTime)}
                      </p>
                    </div>
                    <Badge
                      variant={rec.status === 'clocked_in' ? 'green' : 'default'}
                      size="sm"
                    >
                      {rec.status === 'clocked_in'
                        ? 'Active Shift'
                        : formatDurationMinutes(rec.durationMinutes)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text-secondary pt-1 border-t border-border/70">
                    <span>In: {formatDateTime(rec.clockInTime)}</span>
                    <span>
                      Out: {rec.clockOutTime ? formatDateTime(rec.clockOutTime) : 'Still active'}
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Desktop Attendance Table */}
          <Card padding="none" className="hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-text-secondary">
                <thead className="bg-surface border-b border-border text-text-primary font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Clock In</th>
                    <th className="py-3 px-3">Clock Out</th>
                    <th className="py-3 px-3">Duration</th>
                    <th className="py-3 px-4 text-right">Worksheet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {filteredAttendance.map((rec) => {
                    const meta = getEmployeeMeta(
                      rec.employeeId,
                      rec.employeeName,
                      rec.employeeDesignation,
                    )
                    return (
                      <tr key={rec.id} className="hover:bg-surface/50">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={meta.name} size="sm" />
                            <div>
                              <span className="font-semibold text-text-primary block">
                                {meta.name}
                              </span>
                              {meta.designation && (
                                <span className="text-[11px] text-text-muted">
                                  {meta.designation}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-medium text-text-primary whitespace-nowrap">
                          {formatDate(rec.date || rec.clockInTime)}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {formatDateTime(rec.clockInTime)}
                        </td>
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          {rec.clockOutTime ? (
                            formatDateTime(rec.clockOutTime)
                          ) : (
                            <Badge variant="green" size="sm">
                              Active Shift
                            </Badge>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-semibold text-text-primary whitespace-nowrap">
                          {formatDurationMinutes(rec.durationMinutes)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {meta.hasProfile ? (
                            <Link href={`/admin/employees/${rec.employeeId}?tab=worksheet`}>
                              <Button variant="secondary" size="sm">
                                View Worksheet
                              </Button>
                            </Link>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Review Leave / Permission Modal */}
      <Modal
        isOpen={!!reviewTarget}
        onClose={() => !isSavingReview && setReviewTarget(null)}
        title={
          reviewTarget
            ? `${reviewTarget.decision === 'approved' ? 'Approve' : 'Reject'} ${
                reviewTarget.kind === 'leave' ? 'Leave' : 'Permission'
              } Request`
            : 'Review Request'
        }
        description={
          reviewTarget ? `${reviewTarget.employeeName} — ${reviewTarget.summary}` : ''
        }
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setReviewTarget(null)}
              disabled={isSavingReview}
            >
              Cancel
            </Button>
            <Button
              variant={reviewTarget?.decision === 'rejected' ? 'danger' : 'primary'}
              size="sm"
              onClick={handleConfirmReview}
              isLoading={isSavingReview}
            >
              Confirm {reviewTarget?.decision === 'approved' ? 'Approval' : 'Rejection'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleConfirmReview} className="space-y-4">
          {reviewError && (
            <div className="p-3 rounded-lg bg-danger-light border border-danger/30 text-danger-dark text-xs">
              {reviewError}
            </div>
          )}

          <Textarea
            label="Admin Review Notes (optional)"
            placeholder={
              reviewTarget?.decision === 'rejected'
                ? 'Provide reason for declining this request...'
                : 'Optional note for the employee (e.g., Approved, please ensure handover)...'
            }
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            rows={3}
          />
        </form>
      </Modal>
    </ContentWrapper>
  )
}
