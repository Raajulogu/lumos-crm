'use client'

// components/layout/Topbar.tsx
// Header navigation bar featuring persona switching, unread notifications,
// and quick portal toggling for Admin & Employees.

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Menu,
  Bell,
  LogOut,
  ChevronDown,
  User,
  Shield,
  Settings,
  Briefcase,
} from 'lucide-react'
import { Button, Avatar, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

interface TopbarProps {
  onMenuClick: () => void // opens mobile sidebar
  userName?: string
  userRole: 'admin' | 'employee'
  onNotificationClick: () => void
  className?: string
}

export function Topbar({
  onMenuClick,
  userName: propUserName,
  userRole,
  onNotificationClick,
  className,
}: TopbarProps) {
  const router = useRouter()
  const { currentUser, logout } = useAuth()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const activeName = propUserName || currentUser.fullName || 'User'
  const activeEmail = currentUser.email || ''
  const activeDesignation = currentUser.designation || (userRole === 'admin' ? 'Agency Director & Head' : 'Team Member')

  // Fetch unread count from real API
  useEffect(() => {
    api.notifications
      .list({ unreadOnly: true })
      .then((notifs) => {
        if (notifs) {
          const unread = notifs.filter((n) => !n.read).length
          setUnreadCount(unread)
        }
      })
      .catch(() => {})
  }, [userRole, currentUser.id])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    setIsUserMenuOpen(false)
    logout()
    router.push('/login')
  }

  return (
    <header
      className={cn(
        'h-16 flex items-center justify-between gap-3 px-4 md:px-6',
        'bg-white border-b border-border sticky top-0 z-30 shadow-xs',
        className,
      )}
    >
      {/* Left — hamburger (mobile only) */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          aria-label="Open menu"
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Current Workspace Pill Indicator */}
        <div className="hidden sm:flex items-center gap-2">
          {userRole === 'admin' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Shield className="h-3.5 w-3.5 text-blue-600" />
              <span>Agency Workspace</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <User className="h-3.5 w-3.5 text-emerald-600" />
              <span>Employee Portal</span>
            </span>
          )}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNotificationClick}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell className="h-5 w-5 text-text-secondary" />
          </Button>
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full
                         bg-danger text-white text-[10px] font-bold flex items-center justify-center animate-pulse"
              aria-hidden="true"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-surface border border-transparent hover:border-border transition-all cursor-pointer"
            aria-expanded={isUserMenuOpen}
            aria-label="User profile options"
          >
            <Avatar name={activeName} size="sm" />
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-text-primary leading-tight">
                {activeName}
              </span>
              <span className="text-[10px] text-text-muted capitalize truncate max-w-[120px]">
                {activeDesignation}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-text-muted hidden md:block" />
          </button>

          {/* Dropdown Menu Card */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-white shadow-xl p-2 z-50 text-xs">
              {/* User summary header */}
              <div className="p-2.5 bg-slate-50/70 rounded-xl border border-slate-100 mb-1">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-sm text-text-primary leading-tight">
                    {activeName}
                  </p>
                  <Badge
                    variant={userRole === 'admin' ? 'blue' : 'purple'}
                    size="sm"
                  >
                    {userRole === 'admin' ? 'Admin' : 'Staff'}
                  </Badge>
                </div>
                {activeEmail && (
                  <p className="text-text-muted text-[11px] mt-0.5 font-mono">{activeEmail}</p>
                )}
                <p className="text-text-secondary text-[11px] mt-1 font-medium">
                  {activeDesignation}
                </p>
              </div>

              {/* Navigation links */}
              {userRole === 'admin' ? (
                <div className="py-1">
                  <Link
                    href="/admin/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
                  >
                    <Settings className="h-3.5 w-3.5 text-text-muted" />
                    <span>Agency Settings</span>
                  </Link>
                </div>
              ) : (
                <div className="py-1">
                  <Link
                    href="/employee/projects"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-text-muted" />
                    <span>My Assigned Projects</span>
                  </Link>
                </div>
              )}

              {/* Logout Option */}
              <div className="pt-1.5 border-t border-border mt-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-danger hover:bg-danger-light font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
