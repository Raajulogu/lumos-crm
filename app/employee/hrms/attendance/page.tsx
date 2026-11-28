'use client'

// app/employee/hrms/attendance/page.tsx
// HRMS Attendance Page — Daily Office Shift Punch In/Out and attendance log history.

import { useState, useEffect, Suspense } from 'react'
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
import { api } from '@/lib/api'
import type { AttendanceRecord } from '@/lib/types'
import { Clock, LogIn, LogOut, Calendar } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'

export default function HrmsAttendancePage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <HrmsAttendanceContent />
    </Suspense>
  )
}

function HrmsAttendanceContent() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPunching, setIsPunching] = useState(false)

  useEffect(() => {
    let mounted = true
    const loadAttendance = () => {
      Promise.allSettled([api.attendance.getStatus(), api.hrms.getAttendance()])
        .then(([statusRes, histRes]) => {
          if (!mounted) return
          if (statusRes.status === 'fulfilled' && statusRes.value) {
            setIsClockedIn(statusRes.value.isClockedIn)
            setCurrentRecord(statusRes.value.currentRecord)
          }
          if (histRes.status === 'fulfilled') {
            setRecords(histRes.value || [])
          }
        })
        .finally(() => {
          if (mounted) setLoading(false)
        })
    }

    loadAttendance()
    window.addEventListener('crm_attendance_change', loadAttendance)
    return () => {
      mounted = false
      window.removeEventListener('crm_attendance_change', loadAttendance)
    }
  }, [])

  async function handlePunch(type: 'in' | 'out') {
    setIsPunching(true)
    try {
      const rec = await api.hrms.punchAttendance(type)
      if (type === 'in') {
        setIsClockedIn(true)
        setCurrentRecord(rec)
        setRecords((prev) => [rec, ...prev.filter((r) => r.id !== rec.id)])
      } else {
        setIsClockedIn(false)
        setCurrentRecord(null)
        setRecords((prev) => prev.map((r) => (r.id === rec.id ? rec : r)))
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('crm_attendance_change'))
      }
    } finally {
      setIsPunching(false)
    }
  }

  const totalMinutes = records.reduce((sum, r) => sum + (r.durationMinutes || 0), 0)
  const completedShifts = records.filter((r) => r.status === 'clocked_out').length

  return (
    <ContentWrapper>
      <PageHeader
        title="HRMS — Attendance"
        description="Track your daily office shift clock-in/clock-out times and attendance history."
        breadcrumbs={[
          { label: 'HRMS' },
          { label: 'Attendance' },
        ]}
        action={
          isClockedIn ? (
            <Button
              variant="danger"
              size="sm"
              isLoading={isPunching}
              onClick={() => handlePunch('out')}
            >
              <LogOut className="h-4 w-4" />
              <span>Punch Out (End Shift)</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              isLoading={isPunching}
              onClick={() => handlePunch('in')}
            >
              <LogIn className="h-4 w-4" />
              <span>Punch In (Start Shift)</span>
            </Button>
          )
        }
      />

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <Card padding="md">
              <p className="text-xs text-text-muted">Current Shift Status</p>
              <div className="mt-1.5 flex items-center gap-2">
                <Badge variant={isClockedIn ? 'green' : 'gray'} dot>
                  {isClockedIn ? 'Clocked In' : 'Off Duty'}
                </Badge>
                {currentRecord?.clockInTime && (
                  <span className="text-xs text-text-muted">
                    Since {new Date(currentRecord.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </Card>

            <Card padding="md">
              <p className="text-xs text-text-muted">Completed Shifts</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{completedShifts}</p>
            </Card>

            <Card padding="md">
              <p className="text-xs text-text-muted">Total Logged Hours</p>
              <p className="text-2xl font-bold text-brand-700 mt-1 font-mono">
                {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
              </p>
            </Card>
          </>
        )}
      </div>

      {/* History */}
      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : records.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            icon={<Clock className="h-10 w-10 text-slate-300 mx-auto" />}
            title="No Attendance Records Yet"
            description="Click Punch In to start recording your daily office shift attendance."
          />
        </Card>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {records.map((rec) => (
              <Card key={rec.id} padding="md" className="text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-text-muted" />
                    {formatDate(rec.date || rec.clockInTime)}
                  </span>
                  <Badge variant={rec.status === 'clocked_in' ? 'green' : 'blue'} size="sm">
                    {rec.status === 'clocked_in' ? 'Active' : 'Completed'}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 text-text-secondary">
                  <div>
                    <span className="text-text-muted block">Clock In</span>
                    <span className="font-medium text-text-primary">
                      {formatDateTime(rec.clockInTime)}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Clock Out</span>
                    <span className="font-medium text-text-primary">
                      {rec.clockOutTime ? formatDateTime(rec.clockOutTime) : 'Still active'}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table */}
          <Card padding="none" className="hidden md:block overflow-hidden">
            <table className="w-full text-left text-xs text-text-secondary">
              <thead className="bg-surface border-b border-border text-text-primary font-semibold">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Clock In Time</th>
                  <th className="py-3 px-4">Clock Out Time</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-surface/50">
                    <td className="py-3.5 px-4 font-semibold text-text-primary">
                      {formatDate(rec.date || rec.clockInTime)}
                    </td>
                    <td className="py-3.5 px-4">{formatDateTime(rec.clockInTime)}</td>
                    <td className="py-3.5 px-4">
                      {rec.clockOutTime ? formatDateTime(rec.clockOutTime) : '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {rec.durationMinutes ? `${Math.floor(rec.durationMinutes / 60)}h ${rec.durationMinutes % 60}m` : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Badge variant={rec.status === 'clocked_in' ? 'green' : 'blue'} size="sm">
                        {rec.status === 'clocked_in' ? 'Clocked In' : 'Completed'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </ContentWrapper>
  )
}
