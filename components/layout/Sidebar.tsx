'use client'

// components/layout/Sidebar.tsx
import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'

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
  const navItems = role === 'admin' ? ADMIN_NAV : EMPLOYEE_NAV

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
          <span className="text-white font-bold text-lg tracking-tight">
            {APP_NAME}
          </span>
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

      {/* Role label at bottom */}
      {!isCollapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <span className="text-xs text-sidebar-text uppercase tracking-wider font-medium">
            {role === 'admin' ? '⚡ Admin Portal' : '👤 Employee Portal'}
          </span>
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
