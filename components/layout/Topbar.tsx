'use client'

// components/layout/Topbar.tsx
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
  ArrowRightLeft,
} from 'lucide-react'
import { Button, Avatar, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import { mockNotifications } from '@/lib/mock-data'

interface TopbarProps {
  onMenuClick: () => void        // opens mobile sidebar
  userName: string
  userRole: 'admin' | 'employee'
  onNotificationClick: () => void
  className?: string
}

export function Topbar({
  onMenuClick,
  userName,
  userRole,
  onNotificationClick,
  className,
}: TopbarProps) {
  const router = useRouter()
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Count unread notifications for this user
  const unreadCount = mockNotifications.filter(
    (n) => n.recipientId === (userRole === 'admin' ? 'admin' : 'emp-1') && !n.read,
  ).length

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
    router.push('/login')
  }

  const userEmail =
    userRole === 'admin' ? 'admin@markcrm.com' : 'priya@markcrm.com'

  return (
    <header
      className={cn(
        'h-16 flex items-center justify-between gap-4 px-4 md:px-6',
        'bg-white border-b border-border sticky top-0 z-30',
        className,
      )}
    >
      {/* Left — hamburger (mobile only) */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="md:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Portal Switcher Pill (Quick Desktop Link) */}
        <div className="hidden sm:flex items-center mr-2">
          {userRole === 'admin' ? (
            <Link
              href="/employee/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-50 text-brand-700 hover:bg-brand-100 transition-colors border border-brand-200"
              title="Preview employee perspective"
            >
              <User className="h-3.5 w-3.5" />
              <span>Go to Employee Portal</span>
            </Link>
          ) : (
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-800 hover:bg-slate-200 transition-colors border border-slate-300"
              title="Return to admin perspective"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Go to Admin Portal</span>
            </Link>
          )}
        </div>

        {/* Notification bell */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={onNotificationClick}
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
          >
            <Bell className="h-5 w-5" />
          </Button>
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full
                         bg-danger text-white text-xs font-bold flex items-center justify-center"
              aria-hidden="true"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>

        {/* User Avatar & Dropdown Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-surface transition-colors cursor-pointer"
            aria-expanded={isUserMenuOpen}
            aria-label="User profile and navigation options"
          >
            <Avatar name={userName} size="sm" />
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-text-primary leading-tight">
                {userName}
              </span>
              <span className="text-[10px] text-text-muted capitalize">
                {userRole === 'admin' ? 'Company Head' : 'Marketing Staff'}
              </span>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-text-muted hidden md:block" />
          </button>

          {/* Dropdown Card */}
          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-white shadow-lg p-2 z-50 text-xs">
              {/* User summary header */}
              <div className="p-2 border-b border-border/80 pb-2.5">
                <p className="font-bold text-sm text-text-primary leading-tight">
                  {userName}
                </p>
                <p className="text-text-muted text-[11px] mt-0.5">{userEmail}</p>
                <div className="mt-2">
                  <Badge
                    variant={userRole === 'admin' ? 'blue' : 'purple'}
                    size="sm"
                  >
                    {userRole === 'admin' ? '⚡ Administrator' : '👤 Employee Portal'}
                  </Badge>
                </div>
              </div>

              {/* Portal switcher options */}
              <div className="py-1.5 space-y-0.5">
                {userRole === 'admin' ? (
                  <Link
                    href="/employee/dashboard"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary font-medium transition-colors"
                  >
                    <ArrowRightLeft className="h-4 w-4 text-brand-600" />
                    <span>Switch to Employee View</span>
                  </Link>
                ) : (
                  <Link
                    href="/admin/dashboard"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary font-medium transition-colors"
                  >
                    <Shield className="h-4 w-4 text-brand-600" />
                    <span>Switch to Admin Portal</span>
                  </Link>
                )}

                {userRole === 'admin' && (
                  <Link
                    href="/admin/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-text-secondary hover:bg-surface hover:text-text-primary transition-colors"
                  >
                    <Settings className="h-4 w-4 text-text-muted" />
                    <span>Settings & Categories</span>
                  </Link>
                )}
              </div>

              {/* Logout Option */}
              <div className="pt-1.5 border-t border-border/80">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-danger hover:bg-danger-light font-medium transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
