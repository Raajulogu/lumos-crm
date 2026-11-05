'use client'

// app/(employee)/layout.tsx
// Dashboard shell layout for the employee portal.

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileNav } from '@/components/layout/MobileNav'
import { NotificationDrawer } from '@/components/common/NotificationDrawer'
import { mockNotifications } from '@/lib/mock-data'
import { useSidebar } from '@/hooks/useSidebar'

interface EmployeeLayoutProps {
  children: React.ReactNode
}

export default function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const { isOpen, isCollapsed, open, close, toggleCollapse } = useSidebar()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState(
    mockNotifications.filter((n) => n.recipientId === 'emp-1'),
  )

  function handleMarkRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
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
          userName="Priya Sharma"
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

