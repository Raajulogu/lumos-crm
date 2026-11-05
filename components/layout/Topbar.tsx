'use client'

// components/layout/Topbar.tsx
import { Menu, Bell } from 'lucide-react'
import { Button, Avatar } from '@/components/ui'
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
  // Count unread notifications for this user (mock: admin)
  const unreadCount = mockNotifications.filter(
    (n) => n.recipientId === (userRole === 'admin' ? 'admin' : 'emp-1') && !n.read,
  ).length

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

      {/* Spacer — pushes right items to end */}
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

        {/* User avatar */}
        <Avatar name={userName} size="sm" />
      </div>
    </header>
  )
}

