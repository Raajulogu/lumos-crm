// lib/constants.ts
// ─────────────────────────────────────────────────────────────
// App-wide constants. Import: import { PROJECT_STATUSES } from '@/lib/constants'
// ─────────────────────────────────────────────────────────────

import type { ProjectStatus, ProjectPriority } from './types'

export const APP_NAME = 'MarkCRM'
export const APP_TAGLINE = 'CRM for Digital Marketing Teams'

// Project status pipeline — ordered
export const PROJECT_STATUSES: ProjectStatus[] = [
  'new',
  'in_progress',
  'under_review',
  'completed',
  'delivered',
]

export const PROJECT_PRIORITIES: ProjectPriority[] = ['low', 'medium', 'high', 'urgent']

// Default reminder config (days before deadline)
export const DEFAULT_REMINDER_DAYS = [3, 2, 1, 0]

// Default service categories (pre-loaded)
export const DEFAULT_CATEGORIES = [
  { name: 'SEO', color: '#3b82f6' },
  { name: 'Social Media Marketing', color: '#8b5cf6' },
  { name: 'PPC / Google Ads', color: '#f59e0b' },
  { name: 'Content Writing', color: '#06b6d4' },
  { name: 'Web Design', color: '#22c55e' },
  { name: 'Email Marketing', color: '#ef4444' },
]

// Nav items for admin sidebar
export const ADMIN_NAV_ITEMS = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard' },
  { label: 'Clients', href: '/admin/clients', icon: 'Users' },
  { label: 'Projects', href: '/admin/projects', icon: 'Briefcase' },
  { label: 'Follow-ups', href: '/admin/followups', icon: 'Phone' },
  { label: 'Employees', href: '/admin/employees', icon: 'UserCheck' },
  { label: 'Analytics', href: '/admin/analytics', icon: 'BarChart2' },
  { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
]

// Nav items for employee sidebar (fewer items)
export const EMPLOYEE_NAV_ITEMS = [
  { label: 'Dashboard', href: '/employee/dashboard', icon: 'LayoutDashboard' },
  { label: 'My Projects', href: '/employee/projects', icon: 'Briefcase' },
  { label: 'Follow-ups', href: '/employee/followups', icon: 'Phone' },
]

// Mobile bottom nav (5 items max — most important)
export const ADMIN_MOBILE_NAV = [
  { label: 'Home', href: '/admin/dashboard', icon: 'LayoutDashboard' },
  { label: 'Clients', href: '/admin/clients', icon: 'Users' },
  { label: 'Projects', href: '/admin/projects', icon: 'Briefcase' },
  { label: 'Follow-ups', href: '/admin/followups', icon: 'Phone' },
  { label: 'More', href: '/admin/settings', icon: 'Menu' },
]

export const EMPLOYEE_MOBILE_NAV = [
  { label: 'Home', href: '/employee/dashboard', icon: 'LayoutDashboard' },
  { label: 'Projects', href: '/employee/projects', icon: 'Briefcase' },
  { label: 'Follow-ups', href: '/employee/followups', icon: 'Phone' },
]

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50]

