'use client'

// components/layout/Sidebar.tsx
import { Suspense } from 'react'
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
  ArrowRightLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/constants'
import { useAuth } from '@/lib/auth-context'

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
  const { currentUser, logout, loginAs } = useAuth()
  const navItems = role === 'admin' ? ADMIN_NAV : EMPLOYEE_NAV

  function handleLogout() {
    if (onClose) onClose()
    logout()
    router.push('/login')
  }

  function handleSwitchToOppositePortal() {
    if (onClose) onClose()
    if (role === 'admin') {
      loginAs('emp-1')
      router.push('/employee/dashboard')
    } else {
      loginAs('admin')
      router.push('/admin/dashboard')
    }
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

      {/* Sidebar Footer with Active Persona Card, Portal Switcher & Logout */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-sidebar-border space-y-2">
          {/* Active User Indicator */}
          <div className="px-2 py-1.5 rounded-lg bg-sidebar-hover/60 border border-sidebar-border/40">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-text/80">
              Logged in as
            </p>
            <p className="text-xs font-bold text-white truncate">
              {currentUser.fullName}
            </p>
            <p className="text-[10px] text-brand-300 truncate">
              {currentUser.designation}
            </p>
          </div>

          {/* Quick Switch Button */}
          <button
            type="button"
            onClick={handleSwitchToOppositePortal}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-colors cursor-pointer text-left"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 text-brand-400" />
            <span>
              {role === 'admin' ? 'Switch to Employee View' : 'Switch to Admin Portal'}
            </span>
          </button>

          {/* Direct Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-danger/80 hover:bg-sidebar-hover hover:text-danger transition-colors cursor-pointer text-left"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      ) : (
        <div className="p-2 border-t border-sidebar-border flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleSwitchToOppositePortal}
            title={role === 'admin' ? 'Switch to Employee View' : 'Switch to Admin Portal'}
            className="p-2 rounded-lg text-sidebar-text hover:text-white hover:bg-sidebar-hover transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="h-4 w-4 text-brand-400" />
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
