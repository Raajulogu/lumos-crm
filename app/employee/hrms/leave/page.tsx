'use client'

// app/employee/hrms/leave/page.tsx
// HRMS Leave Management — Submit leave applications and view approval status.

import { useState, useEffect, Suspense } from 'react'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card,
  Badge,
  Button,
  Input,
  Textarea,
  Modal,
  EmptyState,
  PageLoader,
  MetricCardSkeleton,
  TableSkeleton,
} from '@/components/ui'
import { api } from '@/lib/api'
import type { LeaveRequest, LeaveType } from '@/lib/types'
import { CalendarOff, Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export default function HrmsLeavePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <HrmsLeaveContent />
    </Suspense>
  )
}

function HrmsLeaveContent() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [leaveType, setLeaveType] = useState<LeaveType>('casual')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true
    api.hrms
      .getLeaves()
      .then((list) => {
        if (mounted) setLeaves(list || [])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  async function handleSubmitLeave(e: React.FormEvent) {
    e.preventDefault()
    if (!startDate || !endDate || !reason.trim()) {
      setError('Start date, end date, and reason are required.')
      return
    }
    if (endDate < startDate) {
      setError('End date cannot be earlier than start date.')
      return
    }

    setError('')
    setIsSubmitting(true)
    try {
      const created = await api.hrms.applyLeave({
        startDate,
        endDate,
        type: leaveType,
        reason: reason.trim(),
      })
      setLeaves((prev) => [created, ...prev])
      setStartDate('')
      setEndDate('')
      setLeaveType('casual')
      setReason('')
      setIsModalOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const pendingCount = leaves.filter((l) => l.status === 'pending').length
  const approvedCount = leaves.filter((l) => l.status === 'approved').length

  return (
    <ContentWrapper>
      <PageHeader
        title="HRMS — Leave Requests"
        description="Submit planned or sick leave requests and track approval status."
        breadcrumbs={[
          { label: 'HRMS' },
          { label: 'Leave' },
        ]}
        action={
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
            <span>Apply Leave</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <Card padding="md">
              <p className="text-xs text-text-muted">Total Requests</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{leaves.length}</p>
            </Card>
            <Card padding="md">
              <p className="text-xs text-text-muted">Pending Review</p>
              <p className="text-2xl font-bold text-warning-dark mt-1">{pendingCount}</p>
            </Card>
            <Card padding="md">
              <p className="text-xs text-text-muted">Approved</p>
              <p className="text-2xl font-bold text-success-dark mt-1">{approvedCount}</p>
            </Card>
          </>
        )}
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : leaves.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<CalendarOff className="h-10 w-10 text-slate-300 mx-auto" />}
            title="No Leave Requests Submitted"
            description="Submit a leave application when you need time off."
            action={{
              label: 'Apply Leave',
              onClick: () => setIsModalOpen(true),
            }}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {leaves.map((l) => (
              <Card key={l.id} padding="md" className="text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-text-primary capitalize">
                    {l.type} Leave
                  </span>
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
                <p className="text-text-muted">
                  {formatDate(l.startDate)} → {formatDate(l.endDate)}
                </p>
                <p className="text-text-secondary bg-surface p-2 rounded-lg border border-border/60">
                  {l.reason}
                </p>
                {l.reviewNotes && (
                  <p className="text-[11px] text-brand-800 bg-brand-50 p-2 rounded-lg">
                    <strong>Admin Note:</strong> {l.reviewNotes}
                  </p>
                )}
              </Card>
            ))}
          </div>

          <Card padding="none" className="hidden md:block overflow-hidden">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface border-b border-border text-text-primary font-semibold">
                <tr>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">From</th>
                  <th className="py-3 px-4">To</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {leaves.map((l) => (
                  <tr key={l.id} className="hover:bg-surface/50">
                    <td className="py-3.5 px-4 font-semibold text-text-primary capitalize">
                      {l.type} Leave
                    </td>
                    <td className="py-3.5 px-4">{formatDate(l.startDate)}</td>
                    <td className="py-3.5 px-4">{formatDate(l.endDate)}</td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="truncate">{l.reason}</p>
                      {l.reviewNotes && (
                        <p className="text-[11px] text-brand-700 truncate mt-0.5">
                          Admin Note: {l.reviewNotes}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Apply for Leave"
        description="Submit your leave dates and reason for management approval."
        size="md"
      >
        <form onSubmit={handleSubmitLeave} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary block mb-1.5">
              Leave Type
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text-primary"
            >
              <option value="casual">Casual Leave</option>
              <option value="sick">Sick Leave</option>
              <option value="earned">Earned / Privilege Leave</option>
              <option value="unpaid">Unpaid Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <Textarea
            label="Reason"
            placeholder="Briefly describe the reason for leave..."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setError('')
            }}
            error={error}
            rows={3}
            required
          />

          <div className="pt-2 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Submit Leave Request
            </Button>
          </div>
        </form>
      </Modal>
    </ContentWrapper>
  )
}

