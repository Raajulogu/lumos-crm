// lib/utils.ts
// ─────────────────────────────────────────────────────────────
// Project-wide utility functions.
// Import: import { cn, formatDate, formatCurrency } from '@/lib/utils'
// ─────────────────────────────────────────────────────────────

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ProjectStatus, ProjectPriority, NotificationType } from './types'

// ─── Class name merger ────────────────────────────────────────
// Use this for all conditional Tailwind class building.
// Never concatenate className strings with + or template literals.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ─── Date Formatting ─────────────────────────────────────────

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

// Fixed application reference date (Nov 5, 2026) for deterministic mock data calculations.
// Used identically on both Server and Client to guarantee zero hydration mismatch.
const APP_MOCK_DATE = new Date('2026-11-05T00:00:00Z')

export function getSafeNow(): Date {
  return APP_MOCK_DATE
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = getSafeNow()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return formatDate(dateStr)
}

export function getDaysUntil(dateStr: string): number {
  const date = new Date(dateStr)
  const now = getSafeNow()
  // Reset time to compare dates only
  date.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  const diffMs = date.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function isOverdue(deliveryDate: string, status: ProjectStatus): boolean {
  if (status === 'delivered') return false
  return getDaysUntil(deliveryDate) < 0
}

// ─── Currency ─────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function calculateProfit(budget: number, actualCost?: number): number | null {
  if (actualCost === undefined || actualCost === null) return null
  return budget - actualCost
}

// ─── Status Helpers ───────────────────────────────────────────

export function getStatusLabel(status: ProjectStatus): string {
  const labels: Record<ProjectStatus, string> = {
    new: 'New',
    in_progress: 'In Progress',
    under_review: 'Under Review',
    completed: 'Completed',
    delivered: 'Delivered',
  }
  return labels[status]
}

export function getStatusColor(status: ProjectStatus): string {
  const colors: Record<ProjectStatus, string> = {
    new: 'bg-brand-100 text-brand-700',
    in_progress: 'bg-warning-light text-warning-dark',
    under_review: 'bg-purple-light text-purple-dark',
    completed: 'bg-success-light text-success-dark',
    delivered: 'bg-success-light text-success-dark',
  }
  return colors[status]
}

export function getPriorityLabel(priority: ProjectPriority): string {
  const labels: Record<ProjectPriority, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
    urgent: 'Urgent',
  }
  return labels[priority]
}

export function getPriorityColor(priority: ProjectPriority): string {
  const colors: Record<ProjectPriority, string> = {
    low: 'bg-surface text-text-secondary border border-border',
    medium: 'bg-brand-100 text-brand-700',
    high: 'bg-warning-light text-warning-dark',
    urgent: 'bg-danger-light text-danger-dark',
  }
  return colors[priority]
}

export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    deadline_reminder: '🕐',
    overdue: '⚠️',
    doubt_raised: '💬',
    doubt_replied: '💬',
    doubt_resolved: '✅',
    followup_due: '📞',
    status_changed: '🔄',
  }
  return icons[type]
}

// ─── String Helpers ───────────────────────────────────────────

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ─── Array / Object Helpers ───────────────────────────────────

export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const groupKey = String(item[key])
      if (!acc[groupKey]) acc[groupKey] = []
      acc[groupKey].push(item)
      return acc
    },
    {} as Record<string, T[]>,
  )
}

export function sortBy<T>(arr: T[], key: keyof T, direction: 'asc' | 'desc' = 'asc'): T[] {
  return [...arr].sort((a, b) => {
    const aVal = a[key]
    const bVal = b[key]
    if (aVal < bVal) return direction === 'asc' ? -1 : 1
    if (aVal > bVal) return direction === 'asc' ? 1 : -1
    return 0
  })
}

// ─── ID Generator (temp for mock data) ───────────────────────

export function generateId(): string {
  return Math.random().toString(36).slice(2, 11)
}

