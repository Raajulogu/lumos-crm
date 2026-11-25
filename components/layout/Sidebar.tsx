'use client'

// components/layout/Sidebar.tsx
import { Suspense, useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Phone,
  UserCheck,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  LogIn,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { AttendanceRecord } from '@/lib/types'

const ICON_MAP = {
  LayoutDashboard,
  Users,
  Briefcase,
  Phone,
  UserCheck,
  BarChart2,
  Settings,
}

interface NavItem {
  label: string
  href: string
  icon: keyof typeof ICON_MAP
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard',  href: '/admin/dashboard',  icon: 'LayoutDashboard' },
  { label: 'Clients',    href: '/admin/clients',    icon: 'Users' },
  { label: 'Projects',   href: '/admin/projects',   icon: 'Briefcase' },
  { label: 'Follow-ups', href: '/admin/followups',  icon: 'Phone' },
  { label: 'Employees',  href: '/admin/employees',  icon: 'UserCheck' },
  { label: 'Analytics',  href: '/admin/analytics',  icon: 'BarChart2' },
  { label: 'Settings',   href: '/admin/settings',   icon: 'Settings' },
]

const EMPLOYEE_NAV: NavItem[] = [
  { label: 'Dashboard',   href: '/employee/dashboard',  icon: 'LayoutDashboard' },
  { label: 'My Projects', href: '/employee/projects',   icon: 'Briefcase' },
  { label: 'Follow-ups',  href: '/employee/followups',  icon: 'Phone' },
]

interface SidebarProps {
  role: 'admin' | 'employee'
  isCollapsed?: boolean
  onCollapse?: () => void
  isOpen?: boolean
  onClose?: () => void
}

function SidebarNavLinks({
  navItems,
  isCollapsed,
  onClose,
}: {
  navItems: NavItem[]
  isCollapsed: boolean
  onClose?: () => void
}) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 py-4 px-2 space-y-0.5" aria-label="Main navigation">
      {navItems.map((item) => {
        const Icon = ICON_MAP[item.icon]
        const isActive =
          pathname === item.href || pathname?.startsWith(item.href + '/')

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium',
              'transition-colors duration-150',
              isCollapsed && 'justify-center px-0',
              isActive
                ? 'bg-sidebar-active text-white'
                : 'text-sidebar-text hover:bg-sidebar-hover hover:text-sidebar-text-active',
            )}
            title={isCollapsed ? item.label : undefined}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar({
  role,
  isCollapsed = false,
  onCollapse,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const router = useRouter()
  const { currentUser, logout } = useAuth()
  const navItems = role === 'admin' ? ADMIN_NAV : EMPLOYEE_NAV

  // Daily Shift Attendance State (Clock In / Clock Out for office login)
  const [shiftRecord, setShiftRecord] = useState<AttendanceRecord | null>(null)
  const [isClockedIn, setIsClockedIn] = useState(false)
  const [shiftElapsedSeconds, setShiftElapsedSeconds] = useState(0)
  const [isPunchingAttendance, setIsPunchingAttendance] = useState(false)

  useEffect(() => {
    let mounted = true
    api.attendance
      .getStatus()
      .then((status) => {
        if (!mounted) return
        setIsClockedIn(status.isClockedIn)
        setShiftRecord(status.currentRecord || null)
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [currentUser.id])

  useEffect(() => {
    if (!isClockedIn || !shiftRecord?.clockInTime) {
      setShiftElapsedSeconds(0)
      return
    }

    const updateTimer = () => {
      const start = new Date(shiftRecord.clockInTime).getTime()
      const diff = Math.max(0, Math.floor((Date.now() - start) / 1000))
      setShiftElapsedSeconds(diff)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isClockedIn, shiftRecord])

  async function handleClockIn() {
    setIsPunchingAttendance(true)
    try {
      const rec = await api.attendance.clockIn()
      setShiftRecord(rec)
      setIsClockedIn(true)
    } finally {
      setIsPunchingAttendance(false)
    }
  }

  async function handleClockOut() {
    setIsPunchingAttendance(true)
    try {
      const rec = await api.attendance.clockOut()
      setShiftRecord(rec)
      setIsClockedIn(false)
    } finally {
      setIsPunchingAttendance(false)
    }
  }

  function formatShiftTime(totalSec: number) {
    const hrs = Math.floor(totalSec / 3600)
    const mins = Math.floor((totalSec % 3600) / 60)
    const secs = totalSec % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  function formatClockTime(isoStr?: string) {
    if (!isoStr) return ''
    try {
      const d = new Date(isoStr)
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  function handleLogout() {
    if (onClose) onClose()
    logout()
    router.push('/login')
  }

  const sidebarContent = (
    <div
      className={cn(
        'flex flex-col h-full bg-sidebar-bg transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          'flex items-center border-b border-sidebar-border',
          isCollapsed ? 'justify-center h-16 px-0' : 'justify-between h-16 px-5',
        )}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg tracking-tight">
              {APP_NAME}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-brand-900/60 text-brand-300 border border-brand-700/50">
              Agency OS
            </span>
          </div>
        )}
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="text-sidebar-text hover:text-white p-1 rounded-md md:hidden"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {/* Desktop collapse button */}
        {onCollapse && (
          <button
            onClick={onCollapse}
            className="text-sidebar-text hover:text-white p-1 rounded-md hidden md:flex"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Nav items wrapped in Suspense for Next.js 16 partial prefetching */}
      <Suspense fallback={<div className="flex-1" />}>
        <SidebarNavLinks
          navItems={navItems}
          isCollapsed={isCollapsed}
          onClose={onClose}
        />
      </Suspense>

      {/* Sidebar Footer with Daily Shift Punch, Active User Card & Logout */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-sidebar-border space-y-2.5">
          {/* Daily Shift Login Punch (Shift Attendance) */}
          <div className="p-2.5 rounded-xl bg-sidebar-hover/70 border border-sidebar-border/60">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-sidebar-text/80 flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-brand-400" />
                Office Shift
              </span>
              {isClockedIn ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Clocked In
                </span>
              ) : (
                <span className="text-[10px] text-sidebar-text/60 font-medium">Off Duty</span>
              )}
            </div>

            {isClockedIn ? (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between px-1">
                  <span className="text-[11px] text-sidebar-text/70">
                    Since {formatClockTime(shiftRecord?.clockInTime)}
                  </span>
                  <span className="font-mono text-xs font-bold text-emerald-300">
                    {formatShiftTime(shiftElapsedSeconds)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClockOut}
                  disabled={isPunchingAttendance}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-60"
                  title="Punch Out / Leave Office"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Punch Out (End Shift)</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleClockIn}
                disabled={isPunchingAttendance}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all cursor-pointer shadow-xs disabled:opacity-60"
                title="Punch In / Start Office Shift"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Punch In (Start Shift)</span>
              </button>
            )}
          </div>

          {/* Active User Indicator */}
          <div className="px-2.5 py-2 rounded-lg bg-sidebar-hover/40 border border-sidebar-border/30">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-text/70">
              Logged in as
            </p>
            <p className="text-xs font-bold text-white truncate">
              {currentUser.fullName || 'Team Member'}
            </p>
            <p className="text-[10px] text-brand-300 truncate">
              {currentUser.designation || 'Staff'}
            </p>
          </div>

          {/* Direct Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium text-danger/80 hover:bg-sidebar-hover hover:text-danger transition-colors cursor-pointer text-left"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      ) : (
        <div className="p-2 border-t border-sidebar-border flex flex-col items-center gap-2">
          {/* Collapsed punch button */}
          <button
            type="button"
            onClick={isClockedIn ? handleClockOut : handleClockIn}
            disabled={isPunchingAttendance}
            title={isClockedIn ? `Clocked In (${formatShiftTime(shiftElapsedSeconds)}) - Click to Punch Out` : 'Punch In (Start Shift)'}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isClockedIn
                ? 'bg-emerald-600 text-white'
                : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
            }`}
          >
            {isClockedIn ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-lg text-danger/80 hover:text-danger hover:bg-sidebar-hover transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )

  return (
    <>
      <aside className="hidden md:flex flex-shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="relative z-50 flex h-full w-64">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  )
}
