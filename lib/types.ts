// lib/types.ts
// ─────────────────────────────────────────────────────────────
// ALL shared TypeScript interfaces for the CRM.
// Do NOT define entity types inside component files.
// Import from here: import type { Client, Project } from '@/lib/types'
// ─────────────────────────────────────────────────────────────

// ─── Auth & Users ────────────────────────────────────────────

export type UserRole = 'admin' | 'employee'

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  fullName: string
}

// ─── Employees ───────────────────────────────────────────────

export type PayType = 'salary' | 'intern' | 'hourly'
export type EmployeeStatus = 'active' | 'inactive'

export interface Employee {
  id: string
  fullName: string
  email: string
  phone: string
  designation: string
  payType: PayType
  payRate: number          // ₹/month for salary, ₹/hour for hourly/intern
  joinDate: string         // ISO date string
  status: EmployeeStatus
  mustChangePassword: boolean
  notes?: string
  createdAt: string
}

// ─── Service Categories ───────────────────────────────────────

export interface ServiceCategory {
  id: string
  name: string
  color: string            // hex color e.g. "#3b82f6"
  isDefault: boolean
  createdAt: string
}

// ─── Clients ─────────────────────────────────────────────────

export type ClientStatus = 'active' | 'inactive'

export interface Client {
  id: string
  fullName: string
  companyName: string
  email: string            // admin-only visible
  phone: string            // admin-only visible
  address?: string         // admin-only visible
  notes?: string
  status: ClientStatus
  createdAt: string
  updatedAt: string
}

// Client summary for employee-facing views (no personal details)
export interface ClientPublic {
  id: string
  fullName: string
  companyName: string
}

// ─── Projects ────────────────────────────────────────────────

export type ProjectStatus =
  | 'new'
  | 'in_progress'
  | 'under_review'
  | 'completed'
  | 'delivered'

export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface ReminderConfig {
  daysBeforeDeadline: number
}

export interface Project {
  id: string
  name: string
  clientId: string
  serviceCategories: string[]      // array of ServiceCategory IDs
  description: string
  budget: number                   // agreed price in ₹
  actualCost?: number              // optional, filled later
  startDate: string                // ISO date string
  deliveryDate: string             // ISO date string (deadline)
  priority: ProjectPriority
  status: ProjectStatus
  primaryEmployeeId?: string
  additionalMemberIds: string[]
  reminderOverrides?: ReminderConfig[]  // null/undefined = use global setting
  createdAt: string
  updatedAt: string
}

// ─── Doubts ──────────────────────────────────────────────────

export type DoubtPriority = 'normal' | 'urgent'
export type DoubtStatus = 'open' | 'resolved'

export interface Doubt {
  id: string
  projectId: string
  raisedById: string       // employee ID
  subject: string
  description: string
  priority: DoubtPriority
  status: DoubtStatus
  adminReply?: string
  adminRepliedAt?: string
  createdAt: string
  resolvedAt?: string
}

// ─── Notes ───────────────────────────────────────────────────

export type NoteAuthorType = 'admin' | 'employee'

export interface Note {
  id: string
  projectId: string
  authorId: string         // employee ID or 'admin'
  authorType: NoteAuthorType
  authorName: string       // display name
  content: string
  createdAt: string
}

// ─── Follow-Ups ──────────────────────────────────────────────

export type FollowUpStatus = 'pending' | 'done' | 'missed'

export interface FollowUp {
  id: string
  projectId: string
  clientId: string
  scheduledAt: string      // ISO datetime string
  assignedToId: string     // employee ID or 'admin'
  assignedToName: string   // display name
  notes?: string
  status: FollowUpStatus
  createdAt: string
}

// ─── Notifications ───────────────────────────────────────────

export type NotificationType =
  | 'deadline_reminder'
  | 'overdue'
  | 'doubt_raised'
  | 'doubt_replied'
  | 'followup_due'
  | 'status_changed'
  | 'doubt_resolved'

export interface AppNotification {
  id: string
  recipientId: string      // employee ID or 'admin'
  type: NotificationType
  title: string
  message: string
  relatedProjectId?: string
  relatedClientId?: string
  read: boolean
  createdAt: string
}

// ─── Global Reminder Settings ────────────────────────────────

export interface GlobalReminderSettings {
  reminders: ReminderConfig[]  // e.g. [{daysBeforeDeadline: 3}, {daysBeforeDeadline: 1}]
}

// ─── Analytics ───────────────────────────────────────────────

export interface MonthlyRevenue {
  month: string            // e.g. "Nov 2026"
  revenue: number
  cost: number
  profit: number
}

export interface EmployeePerformance {
  employeeId: string
  employeeName: string
  totalProjects: number
  completedOnTime: number
  onTimeRate: number       // percentage 0-100
  openDoubts: number
  avgDurationDays: number
}

export interface ClientRetentionData {
  newClients: number
  returningClients: number
  retentionRate: number    // percentage 0-100
  topClients: TopClient[]
}

export interface TopClient {
  clientId: string
  clientName: string
  companyName: string
  totalProjects: number
  totalValue: number
}

// ─── UI State Types ───────────────────────────────────────────

export type SortDirection = 'asc' | 'desc'

export interface TableSort {
  column: string
  direction: SortDirection
}

export interface PaginationState {
  page: number
  perPage: number
  total: number
}

// ─── Form Types ───────────────────────────────────────────────

export interface CreateClientPayload {
  fullName: string
  companyName: string
  email: string
  phone: string
  address?: string
  notes?: string
}

export interface CreateProjectPayload {
  name: string
  clientId: string
  serviceCategories: string[]
  description: string
  budget: number
  actualCost?: number
  startDate: string
  deliveryDate: string
  priority: ProjectPriority
  primaryEmployeeId?: string
  additionalMemberIds: string[]
}

export interface CreateEmployeePayload {
  fullName: string
  email: string
  phone: string
  designation: string
  payType: PayType
  payRate: number
  joinDate: string
  initialPassword: string
  notes?: string
}

