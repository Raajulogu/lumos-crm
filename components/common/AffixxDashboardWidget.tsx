'use client'

// components/common/AffixxDashboardWidget.tsx
// Employee Workspace Overview & Quick HRMS Launcher (AFFIXX Dashboard Model)

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardHeader, Badge, Button } from '@/components/ui'
import { api } from '@/lib/api'
import type { AttendanceRecord, ProjectTask } from '@/lib/types'
import {
  Clock,
  CalendarOff,
  FileCheck,
  Mail,
  Plus,
  LogIn,
  LogOut,
  ListTodo,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

interface AffixxDashboardWidgetProps {
  tasks: ProjectTask[]
}

export function AffixxDashboardWidget({ tasks }: AffixxDashboardWidgetProps) {
  const [shiftRecord, setShiftRecord] = useState<AttendanceRecord | null>(null)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [isPunching, setIsPunching] = useState(false)

  useEffect(() => {
    let mounted = true
    const syncStatus = () => {
      api.attendance
        .getStatus()
        .then((res) => {
          if (!mounted) return
          setIsClockedIn(res.isClockedIn)
          setShiftRecord(res.currentRecord)
        })
        .catch(() => {})
    }
    syncStatus()
    window.addEventListener('crm_attendance_change', syncStatus)
    return () => {
      mounted = false
      window.removeEventListener('crm_attendance_change', syncStatus)
    }
  }, [])

  async function handleQuickShiftToggle() {
    setIsPunching(true)
    try {
      if (isClockedIn) {
        const rec = await api.hrms.punchAttendance('out')
        setShiftRecord(rec)
        setIsClockedIn(false)
      } else {
        const rec = await api.hrms.punchAttendance('in')
        setShiftRecord(rec)
        setIsClockedIn(true)
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('crm_attendance_change'))
      }
    } finally {
      setIsPunching(false)
    }
  }

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) => t.status === 'completed').length
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length
  const totalLoggedMins = tasks.reduce((sum, t) => sum + (t.totalLoggedMinutes || 0), 0)
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const hrmsShortcuts = [
    {
      label: 'Attendance',
      href: '/employee/hrms/attendance',
      icon: Clock,
      color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
    {
      label: 'Leave',
      href: '/employee/hrms/leave',
      icon: CalendarOff,
      color: 'text-amber-700 bg-amber-50 border-amber-200',
    },
    {
      label: 'Permission',
      href: '/employee/hrms/permission',
      icon: FileCheck,
      color: 'text-purple-700 bg-purple-50 border-purple-200',
    },
    {
      label: 'Send Mail',
      href: '/employee/hrms/mail',
      icon: Mail,
      color: 'text-brand-700 bg-brand-50 border-brand-200',
    },
  ]

  return (
    <div className="space-y-4">
      {/* AFFIXX Workspace & Attendance Summary Card */}
      <Card padding="md">
        <CardHeader
          title="Workspace & HRMS Hub"
          description="Shift check-in, work summary & quick actions"
          action={
            <Badge variant={isClockedIn ? 'green' : 'gray'} size="sm" dot>
              {isClockedIn ? 'On Shift' : 'Off Duty'}
            </Badge>
          }
        />

        {/* Office Shift Quick Punch */}
        <div className="p-3 rounded-xl bg-surface border border-border mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium text-text-muted">Daily Office Shift</p>
            <p className="text-xs font-bold text-text-primary mt-0.5">
              {isClockedIn && shiftRecord?.clockInTime
                ? `Clocked in at ${new Date(shiftRecord.clockInTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}`
                : 'Start your daily attendance'}
            </p>
          </div>
          <Button
            type="button"
            variant={isClockedIn ? 'danger' : 'primary'}
            size="sm"
            isLoading={isPunching}
            onClick={handleQuickShiftToggle}
          >
            {isClockedIn ? (
              <>
                <LogOut className="h-3.5 w-3.5" />
                <span>Punch Out</span>
              </>
            ) : (
              <>
                <LogIn className="h-3.5 w-3.5" />
                <span>Punch In</span>
              </>
            )}
          </Button>
        </div>

        {/* Work Output & Task Progress Bar */}
        <div className="space-y-2 mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-brand-600" />
              <span>Task Completion Rate</span>
            </span>
            <span className="font-bold text-brand-700">{completionPct}%</span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-300"
              style={{ width: `${completionPct}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[11px]">
            <div className="bg-white rounded-lg p-1.5 border border-border/70">
              <p className="text-text-muted">In Progress</p>
              <p className="font-bold text-brand-700 text-xs mt-0.5">{inProgressTasks}</p>
            </div>
            <div className="bg-white rounded-lg p-1.5 border border-border/70">
              <p className="text-text-muted">Completed</p>
              <p className="font-bold text-success-dark text-xs mt-0.5">{completedTasks}</p>
            </div>
            <div className="bg-white rounded-lg p-1.5 border border-border/70">
              <p className="text-text-muted">Logged</p>
              <p className="font-bold text-text-primary text-xs mt-0.5 font-mono">
                {Math.floor(totalLoggedMins / 60)}h {totalLoggedMins % 60}m
              </p>
            </div>
          </div>
        </div>

        {/* HRMS Quick Navigation Grid */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-2">
            HRMS Quick Access
          </p>
          <div className="grid grid-cols-2 gap-2">
            {hrmsShortcuts.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-white hover:bg-surface hover:border-border-strong transition-all text-xs font-medium text-text-primary"
                >
                  <span className={`p-1.5 rounded-lg border ${item.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Add Task Shortcut */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
          <Link href="/employee/tasks" className="text-xs font-medium text-text-secondary hover:text-brand-600 inline-flex items-center gap-1">
            <ListTodo className="h-3.5 w-3.5" />
            <span>All Tasks</span>
            <ArrowRight className="h-3 w-3" />
          </Link>

          <Link href="/employee/tasks?action=add">
            <Button variant="secondary" size="sm">
              <Plus className="h-3.5 w-3.5" />
              <span>Add Task</span>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
