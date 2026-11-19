'use client'

// app/employee/layout.tsx
// Dashboard shell layout for the employee portal with dynamic active employee context.

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileNav } from '@/components/layout/MobileNav'
import { NotificationDrawer } from '@/components/common/NotificationDrawer'
import { api } from '@/lib/api'
import type { AppNotification } from '@/lib/types'
import { useSidebar } from '@/hooks/useSidebar'
import { useAuth } from '@/lib/auth-context'

interface EmployeeLayoutProps {
  children: React.ReactNode
}

export default function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const { currentUser } = useAuth()
  const { isOpen, isCollapsed, open, close, toggleCollapse } = useSidebar()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    api.notifications
      .list()
      .then((data) => {
        if (data) setNotifications(data)
      })
      .catch(() => {})
  }, [currentUser.id])

  async function handleMarkRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
    try {
      await api.notifications.markRead(id)
    } catch {}
  }

  async function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await api.notifications.markAllRead()
    } catch {}
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        role="employee"
        isCollapsed={isCollapsed}
        onCollapse={toggleCollapse}
        isOpen={isOpen}
        onClose={close}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          onMenuClick={open}
          userName={currentUser.role === 'employee' ? currentUser.fullName : 'Priya Sharma'}
          userRole="employee"
          onNotificationClick={() => setNotifOpen(true)}
        />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      <MobileNav role="employee" />

      <NotificationDrawer
        isOpen={notifOpen}
        onClose={() => setNotifOpen(false)}
        notifications={notifications}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
      />
    </div>
  )
}
