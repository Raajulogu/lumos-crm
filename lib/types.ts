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
  description?: string
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
  agreedBudget?: number            // backend alias support
  actualCost?: number              // optional, filled later
  incurredCost?: number            // backend alias support
  startDate: string                // ISO date string
  deliveryDate: string             // ISO date string (deadline)
  deadlineStatus?: string          // custom deadline status label
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

// ─── Follow-Ups & Evaluations ─────────────────────────────────

export type FollowUpStatus = 'pending' | 'done' | 'missed'

export interface FollowUpEvaluation {
  id: string
  followupId: string
  projectId?: string
  userId?: string
  employeeName?: string
  rating: number           // 1 to 5
  properlyCompleted: boolean
  comments: string
  adminReviewStatus?: 'pending' | 'approved' | 'needs_followup'
  adminReviewNotes?: string
  createdAt: string
}

export interface FollowUp {
  id: string
  projectId: string
  clientId: string
  scheduledAt: string      // ISO datetime string
  assignedToId: string     // employee ID or 'admin'
  assignedToName: string   // display name
  notes?: string
  status: FollowUpStatus
  isVisibleToEmployee?: boolean
  hideDetailsFromEmployee?: boolean
  evaluation?: FollowUpEvaluation | null
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

// ─── Project Tasks & Task Punches ─────────────────────────────

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface TaskAssigneeSummary {
  id: string
  fullName: string
  email?: string
  designation?: string
}

export interface ProjectTask {
  id: string
  projectId: string
  projectName?: string
  clientName?: string
  title: string
  description?: string
  startDate?: string       // Auto-captured creation/start timestamp
  assignedToId?: string | null
  assignedTo?: TaskAssigneeSummary | null
  assigneeIds?: string[]
  assignees?: TaskAssigneeSummary[]
  status: TaskStatus
  priority: TaskPriority
  dueDate?: string
  estimatedHours?: number
  totalLoggedMinutes?: number
  totalPunchesCount?: number
  autoClosedAt?: string
  autoCloseUpdateText?: string
  createdAt: string
  updatedAt: string
}

export interface TaskPunch {
  id: string
  taskId: string
  taskTitle?: string
  projectId: string
  projectName?: string
  employeeId: string
  employeeName?: string
  startTime: string // ISO string
  endTime?: string  // ISO string (null while running)
  durationSeconds?: number
  statusAtStop?: TaskStatus
  notes?: string
  autoPunched?: boolean
  createdAt: string
}

export interface CreateTaskPayload {
  title: string
  description?: string
  assignedToId?: string | null
  assigneeIds?: string[]
  priority?: TaskPriority
  status?: TaskStatus
  startDate?: string
  dueDate?: string
  estimatedHours?: number
}

export interface UpdateTaskPayload {
  title?: string
  description?: string
  assignedToId?: string | null
  assigneeIds?: string[]
  priority?: TaskPriority
  status?: TaskStatus
  startDate?: string
  dueDate?: string
  estimatedHours?: number
}

export interface PunchOutPayload {
  statusAtStop: TaskStatus
  notes?: string
  autoPunched?: boolean
}

export interface EmployeeWorksheetTaskItem {
  taskId: string
  title: string
  projectId: string
  projectName?: string
  clientName?: string
  status: TaskStatus
  priority: TaskPriority
  startDate?: string
  dueDate?: string
  estimatedHours?: number
  workedSeconds: number
  workedHours: number
  punchCount: number
  lastWorkedAt?: string
  autoClosedAt?: string
  autoCloseUpdateText?: string
}

export interface EmployeeWorksheetSummary {
  totalWorkedSeconds: number
  totalWorkedHours: number
  totalTasksAssigned: number
  tasksCompleted: number
  tasksInProgress: number
  tasksTodo: number
  totalPunchSessions: number
  autoPunchedCount: number
}

export interface EmployeeWorksheet {
  employee?: {
    id: string
    fullName: string
    email?: string
    designation?: string
    payType?: PayType
  }
  range?: {
    from?: string
    to?: string
  }
  summary: EmployeeWorksheetSummary
  tasks: EmployeeWorksheetTaskItem[]
  punches: TaskPunch[]
}

// ─── Daily Shift Attendance & HRMS ────────────────────────────

export interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName?: string
  employeeDesignation?: string
  clockInTime: string
  clockOutTime?: string
  durationMinutes?: number
  date: string // YYYY-MM-DD
  status: 'clocked_in' | 'clocked_out'
  createdAt: string
}

export type LeaveType = 'casual' | 'sick' | 'earned' | 'unpaid'
export type HrmsRequestStatus = 'pending' | 'approved' | 'rejected'

export interface LeaveRequest {
  id: string
  userId: string
  employeeName?: string
  employeeEmail?: string
  employeeDesignation?: string
  startDate: string
  endDate: string
  type: LeaveType
  reason: string
  status: HrmsRequestStatus
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
  createdAt: string
}

export type PermissionType = 'late_arrival' | 'early_exit' | 'short_break' | 'official_errand'

export interface PermissionRequest {
  id: string
  userId: string
  employeeName?: string
  employeeEmail?: string
  employeeDesignation?: string
  date: string
  type: PermissionType
  fromTime?: string
  toTime?: string
  reason: string
  status: HrmsRequestStatus
  reviewedBy?: string
  reviewedAt?: string
  reviewNotes?: string
  createdAt: string
}

export interface HrmsMailRecord {
  id: string
  to: string
  subject: string
  html: string
  sentAt: string
  status: 'sent' | 'queued'
}

export interface UpdateEmployeePasswordPayload {
  password: string
}


