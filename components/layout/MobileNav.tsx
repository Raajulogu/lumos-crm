'use client'

// components/layout/MobileNav.tsx
// Fixed bottom navigation bar shown on mobile only.

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Phone,
  Menu,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ADMIN_MOBILE_NAV = [
  { label: 'Home',     href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Clients',  href: '/admin/clients',   icon: Users },
  { label: 'Projects', href: '/admin/projects',  icon: Briefcase },
  { label: 'Follow-ups', href: '/admin/followups', icon: Phone },
  { label: 'More',     href: '/admin/settings',  icon: Menu },
]

const EMPLOYEE_MOBILE_NAV = [
  { label: 'Home',     href: '/employee/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/employee/projects',  icon: Briefcase },
  { label: 'Follow-ups', href: '/employee/followups', icon: Phone },
]

interface MobileNavProps {
  role: 'admin' | 'employee'
}

function MobileNavLinks({ role }: { role: 'admin' | 'employee' }) {
  const pathname = usePathname()
  const navItems = role === 'admin' ? ADMIN_MOBILE_NAV : EMPLOYEE_MOBILE_NAV

  return (
    <div
      className={cn(
        'grid h-16 items-center',
        navItems.length === 3 ? 'grid-cols-3' : 'grid-cols-5',
      )}
    >
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.href || pathname?.startsWith(item.href + '/')

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 h-full',
              'text-xs font-medium transition-colors duration-150',
              'active:scale-95',
              isActive
                ? 'text-brand-600'
                : 'text-text-muted hover:text-text-secondary',
            )}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              className={cn(
                'h-5 w-5',
                isActive ? 'text-brand-600' : 'text-text-muted',
              )}
            />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </div>
  )
}

export function MobileNav({ role }: MobileNavProps) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden
                 bg-white border-t border-border
                 safe-area-inset-bottom"
      aria-label="Mobile navigation"
    >
      <Suspense fallback={<div className="h-16" />}>
        <MobileNavLinks role={role} />
      </Suspense>
    </nav>
  )
}
