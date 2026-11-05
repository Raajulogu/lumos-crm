'use client'

// app/(admin)/layout.tsx
// Dashboard shell layout for the admin portal.
// Renders: Sidebar (desktop) + Topbar + MobileNav

import { useState } from 'react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { MobileNav } from '@/components/layout/MobileNav'
import { NotificationDrawer } from '@/components/common/NotificationDrawer'
import { mockNotifications } from '@/lib/mock-data'
import { useSidebar } from '@/hooks/useSidebar'
import { useAuth } from '@/lib/auth-context'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { currentUser } = useAuth()
  const { isOpen, isCollapsed, open, close, toggleCollapse } = useSidebar()
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState(
    mockNotifications.filter((n) => n.recipientId === 'admin'),
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
      {/* Desktop sidebar */}
      <Sidebar
        role="admin"
        isCollapsed={isCollapsed}
        onCollapse={toggleCollapse}
        isOpen={isOpen}
        onClose={close}
      />

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar
          onMenuClick={open}
          userName={currentUser.role === 'admin' ? currentUser.fullName : 'Rajesh Sharma'}
          userRole="admin"
          onNotificationClick={() => setNotifOpen(true)}
        />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav role="admin" />

      {/* Notification drawer */}
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

