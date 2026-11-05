'use client'

// components/common/NotificationDrawer.tsx
import { Bell, Check } from 'lucide-react'
import { Drawer, Button, EmptyState } from '@/components/ui'
import { formatRelativeTime, getNotificationIcon, cn } from '@/lib/utils'
import type { AppNotification } from '@/lib/types'

interface NotificationDrawerProps {
  isOpen: boolean
  onClose: () => void
  notifications: AppNotification[]
  onMarkAllRead: () => void
  onMarkRead: (id: string) => void
}

const typeColors: Record<string, string> = {
  deadline_reminder: 'bg-warning-light',
  overdue:           'bg-danger-light',
  doubt_raised:      'bg-brand-100',
  doubt_replied:     'bg-brand-100',
  doubt_resolved:    'bg-success-light',
  followup_due:      'bg-success-light',
  status_changed:    'bg-surface',
}

export function NotificationDrawer({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  onMarkRead,
}: NotificationDrawerProps) {
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
      side="right"
      footer={
        unreadCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={onMarkAllRead}>
            <Check className="h-3.5 w-3.5" />
            Mark all as read
          </Button>
        ) : undefined
      }
    >
      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-10 w-10" />}
          title="All caught up!"
          description="No notifications right now."
        />
      ) : (
        <div className="flex flex-col gap-1 -mx-1">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => onMarkRead(notif.id)}
              className={cn(
                'w-full text-left flex items-start gap-3 px-3 py-3 rounded-lg',
                'transition-colors duration-150 hover:bg-surface',
                !notif.read && 'bg-brand-50',
              )}
            >
              {/* Icon bubble */}
              <span
                className={cn(
                  'flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center text-base',
                  typeColors[notif.type] ?? 'bg-surface',
                )}
              >
                {getNotificationIcon(notif.type)}
              </span>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-sm text-text-primary leading-snug',
                    !notif.read && 'font-medium',
                  )}
                >
                  {notif.title}
                </p>
                <p className="text-xs text-text-muted mt-0.5 leading-snug">
                  {notif.message}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {formatRelativeTime(notif.createdAt)}
                </p>
              </div>

              {/* Unread dot */}
              {!notif.read && (
                <span className="flex-shrink-0 h-2 w-2 rounded-full bg-brand-500 mt-1.5" />
              )}
            </button>
          ))}
        </div>
      )}
    </Drawer>
  )
}

