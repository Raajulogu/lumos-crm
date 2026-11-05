'use client'

// app/employee/layout.tsx
// Dashboard shell layout for the employee portal with dynamic active employee context.

import { useState, useMemo } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileNav } from '@/components/layout/MobileNav'
import { NotificationDrawer } from '@/components/common/NotificationDrawer'
import { mockNotifications } from '@/lib/mock-data'
import { useSidebar } from '@/hooks/useSidebar'
import { useAuth } from '@/lib/auth-context'

interface EmployeeLayoutProps {
  children: React.ReactNode
}

export default function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const { currentUser } = useAuth()
  const { isOpen, isCollapsed, open, close, toggleCollapse } = useSidebar()
  const [notifOpen, setNotifOpen] = useState(false)

  // Current employee notifications
  const userNotifications = useMemo(() => {
    return mockNotifications.filter((n) => n.recipientId === currentUser.id)
  }, [currentUser.id])

  const [notifications, setNotifications] = useState(userNotifications)

  function handleMarkRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    )
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
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
