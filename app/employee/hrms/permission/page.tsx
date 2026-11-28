'use client'

// app/employee/hrms/permission/page.tsx
// HRMS Permission Requests — Request short-hour permissions (late arrival, early exit, errands).

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
  TableSkeleton,
} from '@/components/ui'
import { api } from '@/lib/api'
import type { PermissionRequest, PermissionType } from '@/lib/types'
import { FileCheck, Plus } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const PERMISSION_LABELS: Record<PermissionType, string> = {
  late_arrival: 'Late Arrival',
  early_exit: 'Early Exit',
  short_break: 'Short Personal Break',
  official_errand: 'Official / Client Errand',
}

export default function HrmsPermissionPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <HrmsPermissionContent />
    </Suspense>
  )
}

function HrmsPermissionContent() {
  const [permissions, setPermissions] = useState<PermissionRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [date, setDate] = useState('')
  const [permType, setPermType] = useState<PermissionType>('early_exit')
  const [fromTime, setFromTime] = useState('')
  const [toTime, setToTime] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true
    api.hrms
      .getPermissions()
      .then((list) => {
        if (mounted) setPermissions(list || [])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  async function handleSubmitPermission(e: React.FormEvent) {
    e.preventDefault()
    if (!date || !reason.trim()) {
      setError('Date and reason are required.')
      return
    }
    setError('')
    setIsSubmitting(true)
    try {
      const created = await api.hrms.requestPermission({
        date,
        type: permType,
        fromTime: fromTime || undefined,
        toTime: toTime || undefined,
        reason: reason.trim(),
      })
      setPermissions((prev) => [created, ...prev])
      setDate('')
      setFromTime('')
      setToTime('')
      setReason('')
      setIsModalOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ContentWrapper>
      <PageHeader
        title="HRMS — Permission Requests"
        description="Request short-duration permissions for late arrival, early exit, or errands."
        breadcrumbs={[
          { label: 'HRMS' },
          { label: 'Permission' },
        ]}
        action={
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
            <span>Request Permission</span>
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : permissions.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<FileCheck className="h-10 w-10 text-slate-300 mx-auto" />}
            title="No Permission Requests"
            description="Need a short window off during shift hours? Submit a permission request."
            action={{
              label: 'Request Permission',
              onClick: () => setIsModalOpen(true),
            }}
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {permissions.map((p) => (
              <Card key={p.id} padding="md" className="text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-text-primary">
                    {PERMISSION_LABELS[p.type] || p.type}
                  </span>
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
                <p className="text-text-muted">
                  {formatDate(p.date)}
                  {p.fromTime ? ` • ${p.fromTime} – ${p.toTime || ''}` : ''}
                </p>
                <p className="text-text-secondary bg-surface p-2 rounded-lg border border-border/60">
                  {p.reason}
                </p>
                {p.reviewNotes && (
                  <p className="text-[11px] text-brand-800 bg-brand-50 p-2 rounded-lg">
                    <strong>Admin Note:</strong> {p.reviewNotes}
                  </p>
                )}
              </Card>
            ))}
          </div>

          <Card padding="none" className="hidden md:block overflow-hidden">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface border-b border-border text-text-primary font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Time Window</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {permissions.map((p) => (
                  <tr key={p.id} className="hover:bg-surface/50">
                    <td className="py-3.5 px-4 font-semibold text-text-primary">
                      {formatDate(p.date)}
                    </td>
                    <td className="py-3.5 px-4">{PERMISSION_LABELS[p.type] || p.type}</td>
                    <td className="py-3.5 px-4 font-mono">
                      {p.fromTime ? `${p.fromTime} – ${p.toTime || '...'}` : '—'}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="truncate">{p.reason}</p>
                      {p.reviewNotes && (
                        <p className="text-[11px] text-brand-700 truncate mt-0.5">
                          Admin Note: {p.reviewNotes}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
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
        title="Request Short Permission"
        description="Log a permission request for management visibility."
        size="md"
      >
        <form onSubmit={handleSubmitPermission} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <div>
              <label className="text-sm font-medium text-text-primary block mb-1.5">
                Permission Type
              </label>
              <select
                value={permType}
                onChange={(e) => setPermType(e.target.value as PermissionType)}
                className="w-full h-10 rounded-lg border border-border bg-white px-3 text-sm text-text-primary"
              >
                <option value="early_exit">Early Exit</option>
                <option value="late_arrival">Late Arrival</option>
                <option value="short_break">Short Personal Break</option>
                <option value="official_errand">Official / Client Errand</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="From Time (optional)"
              type="time"
              value={fromTime}
              onChange={(e) => setFromTime(e.target.value)}
            />
            <Input
              label="To Time (optional)"
              type="time"
              value={toTime}
              onChange={(e) => setToTime(e.target.value)}
            />
          </div>

          <Textarea
            label="Reason"
            placeholder="Specify reason and expected return/departure..."
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
              Submit Permission
            </Button>
          </div>
        </form>
      </Modal>
    </ContentWrapper>
  )
}

