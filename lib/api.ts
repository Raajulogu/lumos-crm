// lib/api.ts
// ─────────────────────────────────────────────────────────────
// Production REST API Client & Service Layer for Lumos CRM
// Connects to Next.js / Express backend at NEXT_PUBLIC_API_URL
// ─────────────────────────────────────────────────────────────

import type {
  Client,
  Project,
  Employee,
  Doubt,
  Note,
  FollowUp,
  AppNotification,
  ServiceCategory,
  ProjectStatus,
  FollowUpStatus,
  DoubtPriority,
  CreateClientPayload,
  CreateProjectPayload,
  CreateEmployeePayload,
  ReminderConfig,
  GlobalReminderSettings,
} from './types'

const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://lumos-us.vercel.app/api/v1'
// Normalize URL so it doesn't end with a trailing slash and guarantees /api/v1 base
export const API_BASE_URL = RAW_API_URL.replace(/\/+$/, '').endsWith('/api/v1')
  ? RAW_API_URL.replace(/\/+$/, '')
  : `${RAW_API_URL.replace(/\/+$/, '')}/api/v1`

// ─── Token Management ─────────────────────────────────────────

const TOKEN_KEY = 'crm_auth_token'

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeAuthToken(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

// ─── Typed API Error ──────────────────────────────────────────

export class ApiError extends Error {
  status: number
  code?: string
  details?: Array<{ field?: string; issue?: string }> | null

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Array<{ field?: string; issue?: string }> | null,
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

// ─── Core Fetch Wrapper ───────────────────────────────────────

interface ApiResponse<T = unknown> {
  success: boolean
  message?: string
  data: T
  meta?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  error?: {
    code: string
    message: string
    details?: Array<{ field?: string; issue?: string }> | null
    timestamp?: string
    path?: string
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<{ data: T; meta?: ApiResponse<T>['meta']; message?: string }> {
  const token = getAuthToken()
  const headers = new Headers(options.headers || {})

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  const url = `${API_BASE_URL}${cleanEndpoint}`

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    })

    // Handle empty response (e.g. 204 No Content)
    if (res.status === 204) {
      return { data: null as unknown as T }
    }

    const json = (await res.json().catch(() => null)) as ApiResponse<T> | null

    if (!res.ok) {
      const errPayload = json?.error
      const message =
        errPayload?.message ||
        json?.message ||
        `Request failed with status ${res.status}`
      const code = errPayload?.code || (res.status === 404 ? 'NOT_FOUND' : 'API_ERROR')
      const details = errPayload?.details || null

      if (res.status === 401 && typeof window !== 'undefined') {
        removeAuthToken()
        window.dispatchEvent(new Event('crm_auth_unauthorized'))
      }

      throw new ApiError(message, res.status, code, details)
    }

    if (json && typeof json === 'object' && 'data' in json) {
      return {
        data: json.data,
        meta: json.meta,
        message: json.message,
      }
    }

    // Direct fallback if backend sent raw payload
    return { data: json as unknown as T }
  } catch (err) {
    if (err instanceof ApiError) {
      throw err
    }
    const message = err instanceof Error ? err.message : 'Network connection error'
    throw new ApiError(message, 0, 'NETWORK_ERROR')
  }
}

// ─── Normalization & Unwrapping Helpers ───────────────────────

function normalizeEntity<T>(entity: T): T {
  if (!entity || typeof entity !== 'object') return entity
  const e = { ...entity } as any
  if (!e.id && e._id) {
    e.id = String(e._id)
  }
  return e as T
}

function extractList<T>(data: any, preferredField?: string): T[] {
  if (!data) return []
  if (Array.isArray(data)) return data.map(normalizeEntity)
  if (typeof data === 'object') {
    if (preferredField && Array.isArray(data[preferredField])) {
      return data[preferredField].map(normalizeEntity)
    }
    if (Array.isArray(data.items)) return data.items.map(normalizeEntity)
    if (Array.isArray(data.data)) return data.data.map(normalizeEntity)
    if (Array.isArray(data.results)) return data.results.map(normalizeEntity)
    if (Array.isArray(data.projects)) return data.projects.map(normalizeEntity)
    if (Array.isArray(data.clients)) return data.clients.map(normalizeEntity)
    if (Array.isArray(data.employees)) return data.employees.map(normalizeEntity)
    if (Array.isArray(data.doubts)) return data.doubts.map(normalizeEntity)
    if (Array.isArray(data.notes)) return data.notes.map(normalizeEntity)
    if (Array.isArray(data.followups)) return data.followups.map(normalizeEntity)
    if (Array.isArray(data.categories)) return data.categories.map(normalizeEntity)
  }
  return []
}

function extractEntity<T>(data: any, preferredField?: string): T {
  if (!data || typeof data !== 'object') return data
  let target = data
  if (preferredField && data[preferredField] && typeof data[preferredField] === 'object') {
    target = data[preferredField]
  } else if ('data' in data && data.data && typeof data.data === 'object' && !Array.isArray(data.data)) {
    target = data.data
  }
  return normalizeEntity(target) as T
}

// ─── API Services Catalog ─────────────────────────────────────

export const api = {
  // ── Auth ──
  auth: {
    async login(credentials: { email: string; password: string }) {
      const res = await apiRequest<{
        token: string
        user: {
          id: string
          email: string
          fullName: string
          role: 'admin' | 'employee'
          designation: string
          mustChangePassword: boolean
        }
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      })
      if (res.data?.token) {
        setAuthToken(res.data.token)
      }
      return res.data
    },

    async getMe() {
      const res = await apiRequest<{
        id: string
        email: string
        fullName: string
        role: 'admin' | 'employee'
        designation: string
        mustChangePassword: boolean
        phone?: string
      }>('/auth/me')
      return res.data
    },

    async logout() {
      try {
        await apiRequest('/auth/logout', { method: 'POST' })
      } finally {
        removeAuthToken()
      }
    },

    async forgotPassword(email: string) {
      const res = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      return res
    },

    async resetPassword(payload: { token: string; newPassword: string }) {
      const res = await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return res
    },

    async changePassword(payload: { currentPassword?: string; newPassword: string }) {
      const res = await apiRequest('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return res
    },
  },

  // ── Dashboard ──
  dashboard: {
    async getAdminMetrics() {
      const res = await apiRequest<{
        metrics: {
          overdueProjectsCount: number
          upcomingDeadlinesCount: number
          openDoubtsCount: number
          pendingFollowupsTodayCount: number
          activeProjectsCount: number
        }
        recentActivityFeed: Array<{
          id: string
          type: string
          description: string
          timestamp: string
          projectId?: string
        }>
      }>('/dashboard/admin')
      return res.data
    },

    async getEmployeeMetrics() {
      const res = await apiRequest<{
        myActiveProjectsCount: number
        myOverdueProjectsCount: number
        myUpcomingDeadlinesCount: number
        myPendingFollowupsCount: number
        myOpenDoubtsCount: number
        recentAssignedProjects: Array<{
          id: string
          name: string
          client: { id: string; fullName: string; companyName: string }
          status: ProjectStatus
          deliveryDate: string
          priority: string
        }>
      }>('/dashboard/employee')
      return res.data
    },
  },

  // ── Clients ──
  clients: {
    async list(params?: { search?: string; status?: string; page?: number; limit?: number }) {
      const q = new URLSearchParams()
      if (params?.search) q.set('search', params.search)
      if (params?.status && params.status !== 'all') q.set('status', params.status)
      if (params?.page) q.set('page', params.page.toString())
      if (params?.limit) q.set('limit', params.limit.toString())

      const res = await apiRequest<any>(`/clients?${q.toString()}`)
      const clients = extractList<Client>(res.data, 'clients')
      return { clients, meta: res.meta }
    },

    async getById(id: string) {
      const res = await apiRequest<{
        client: Client
        summary?: {
          totalProjects: number
          deliveredProjects: number
          inProgressProjects: number
          totalBilled: number
          totalCost: number
          netProfit: number
        }
        projects?: Project[]
        followUps?: FollowUp[]
      }>(`/clients/${id}`)
      const raw = res.data as any
      if (raw && typeof raw === 'object') {
        const clientObj = raw.client || raw
        return {
          ...raw,
          client: normalizeEntity(clientObj),
          projects: extractList<Project>(raw.projects, 'projects'),
          followUps: extractList<FollowUp>(raw.followUps, 'followups'),
        }
      }
      return raw
    },

    async create(payload: CreateClientPayload) {
      const res = await apiRequest<Client>('/clients', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return extractEntity<Client>(res.data, 'client')
    },

    async update(id: string, payload: Partial<CreateClientPayload>) {
      const res = await apiRequest<Client>(`/clients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      return extractEntity<Client>(res.data, 'client')
    },

    async toggleStatus(id: string, status: 'active' | 'inactive') {
      const res = await apiRequest<Client>(`/clients/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      return extractEntity<Client>(res.data, 'client')
    },
  },

  // ── Projects ──
  projects: {
    async list(params?: {
      status?: string
      priority?: string
      categoryId?: string
      employeeId?: string
      search?: string
      filter?: string
      page?: number
      limit?: number
    }) {
      const q = new URLSearchParams()
      if (params?.status && params.status !== 'all') q.set('status', params.status)
      if (params?.priority && params.priority !== 'all') q.set('priority', params.priority)
      if (params?.categoryId && params.categoryId !== 'all') q.set('categoryId', params.categoryId)
      if (params?.employeeId && params.employeeId !== 'all') q.set('employeeId', params.employeeId)
      if (params?.search) q.set('search', params.search)
      if (params?.filter && params.filter !== 'all') q.set('filter', params.filter)
      if (params?.page) q.set('page', params.page.toString())
      if (params?.limit) q.set('limit', params.limit.toString())

      const res = await apiRequest<any>(`/projects?${q.toString()}`)
      const projects = extractList<Project>(res.data, 'projects')
      return { projects, meta: res.meta }
    },

    async getById(id: string) {
      const res = await apiRequest<any>(`/projects/${id}`)
      return extractEntity<Project & {
        client?: { id: string; fullName: string; companyName: string; email?: string; phone?: string; address?: string }
        primaryEmployee?: Employee
        profit?: number
        profitMargin?: number
      }>(res.data, 'project')
    },

    async create(payload: CreateProjectPayload) {
      const res = await apiRequest<Project>('/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return extractEntity<Project>(res.data, 'project')
    },

    async update(id: string, payload: Partial<CreateProjectPayload>) {
      const res = await apiRequest<Project>(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      return extractEntity<Project>(res.data, 'project')
    },

    async updateStatus(id: string, status: ProjectStatus) {
      const res = await apiRequest<Project>(`/projects/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      return extractEntity<Project>(res.data, 'project')
    },

    async updateFinancials(id: string, payload: { budget: number; actualCost?: number }) {
      const res = await apiRequest<Project>(`/projects/${id}/financials`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      return extractEntity<Project>(res.data, 'project')
    },

    async updateReminders(id: string, reminderOverrides: ReminderConfig[]) {
      const res = await apiRequest<Project>(`/projects/${id}/reminders`, {
        method: 'PATCH',
        body: JSON.stringify({ reminderOverrides }),
      })
      return extractEntity<Project>(res.data, 'project')
    },
  },

  // ── Doubts ──
  doubts: {
    async listByProject(projectId: string, status?: string) {
      const q = status && status !== 'all' ? `?status=${status}` : ''
      const res = await apiRequest<any>(`/projects/${projectId}/doubts${q}`)
      return extractList<Doubt>(res.data, 'doubts')
    },

    async raise(
      projectId: string,
      payload: { subject: string; description: string; priority: DoubtPriority },
    ) {
      const res = await apiRequest<Doubt>(`/projects/${projectId}/doubts`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return extractEntity<Doubt>(res.data, 'doubt')
    },

    async reply(id: string, reply: string) {
      const res = await apiRequest<Doubt>(`/doubts/${id}/reply`, {
        method: 'POST',
        body: JSON.stringify({ reply }),
      })
      return extractEntity<Doubt>(res.data, 'doubt')
    },

    async resolve(id: string) {
      const res = await apiRequest<Doubt>(`/doubts/${id}/resolve`, {
        method: 'PATCH',
      })
      return extractEntity<Doubt>(res.data, 'doubt')
    },
  },

  // ── Notes ──
  notes: {
    async listByProject(projectId: string) {
      const res = await apiRequest<any>(`/projects/${projectId}/notes`)
      return extractList<Note>(res.data, 'notes')
    },

    async add(projectId: string, content: string) {
      const res = await apiRequest<Note>(`/projects/${projectId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      })
      return extractEntity<Note>(res.data, 'note')
    },
  },

  // ── Follow-Ups ──
  followups: {
    async list(params?: {
      status?: string
      assignedTo?: string
      dateFrom?: string
      dateTo?: string
      page?: number
      limit?: number
    }) {
      const q = new URLSearchParams()
      if (params?.status && params.status !== 'all') q.set('status', params.status)
      if (params?.assignedTo) q.set('assignedTo', params.assignedTo)
      if (params?.dateFrom) q.set('dateFrom', params.dateFrom)
      if (params?.dateTo) q.set('dateTo', params.dateTo)
      if (params?.page) q.set('page', params.page.toString())
      if (params?.limit) q.set('limit', params.limit.toString())

      const res = await apiRequest<any>(`/followups?${q.toString()}`)
      const followups = extractList<FollowUp>(res.data, 'followups')
      return { followups, meta: res.meta }
    },

    async create(payload: {
      projectId: string
      clientId: string
      scheduledAt: string
      assignedToId: string
      notes?: string
    }) {
      const res = await apiRequest<FollowUp>('/followups', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return extractEntity<FollowUp>(res.data, 'followup')
    },

    async updateStatus(id: string, status: FollowUpStatus) {
      const res = await apiRequest<FollowUp>(`/followups/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      return extractEntity<FollowUp>(res.data, 'followup')
    },

    async delete(id: string) {
      const res = await apiRequest(`/followups/${id}`, {
        method: 'DELETE',
      })
      return res
    },
  },

  // ── Notifications ──
  notifications: {
    async list(params?: { unreadOnly?: boolean }) {
      const q = params?.unreadOnly ? '?unreadOnly=true' : ''
      const res = await apiRequest<any>(`/notifications${q}`)
      return extractList<AppNotification>(res.data, 'notifications')
    },

    async markRead(id: string) {
      const res = await apiRequest<AppNotification>(`/notifications/${id}/read`, {
        method: 'PATCH',
      })
      return extractEntity<AppNotification>(res.data, 'notification')
    },

    async markAllRead() {
      const res = await apiRequest<{ markedCount: number }>('/notifications/read-all', {
        method: 'PATCH',
      })
      return res.data
    },
  },

  // ── Employees ──
  employees: {
    async list(params?: { search?: string; status?: string; payType?: string }) {
      const q = new URLSearchParams()
      if (params?.search) q.set('search', params.search)
      if (params?.status && params.status !== 'all') q.set('status', params.status)
      if (params?.payType && params.payType !== 'all') q.set('payType', params.payType)

      const res = await apiRequest<any>(`/employees?${q.toString()}`)
      return extractList<Employee>(res.data, 'employees')
    },

    async getById(id: string) {
      const res = await apiRequest<{
        employee: Employee
        performance?: {
          totalProjectsHandled: number
          completedOnTime: number
          onTimeRate: number
          openDoubts: number
          avgDurationDays: number
        }
        assignedProjects?: Project[]
      }>(`/employees/${id}`)
      return res.data
    },

    async create(payload: CreateEmployeePayload) {
      const res = await apiRequest<Employee>('/employees', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return res.data
    },

    async update(id: string, payload: Partial<CreateEmployeePayload>) {
      const res = await apiRequest<Employee>(`/employees/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      return res.data
    },

    async toggleStatus(id: string, status: 'active' | 'inactive') {
      const res = await apiRequest<Employee>(`/employees/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      return res.data
    },
  },

  // ── Analytics ──
  analytics: {
    async getOverview(range: 'month' | 'quarter' | 'year' | 'all' = 'quarter') {
      const res = await apiRequest<{
        totalRevenue: number
        totalCost: number
        netProfit: number
        profitMargin: number
        monthlyTrends: Array<{
          month: string
          revenue: number
          cost: number
          profit: number
        }>
        categoryDistribution: Array<{
          categoryName: string
          color: string
          count: number
          totalBudget: number
        }>
        clientRetention: {
          newClients: number
          returningClients: number
          retentionRate: number
          topClients: Array<{
            clientId: string
            clientName: string
            companyName: string
            totalProjects: number
            totalValue: number
          }>
        }
        employeeLeaderboard: Array<{
          employeeId: string
          employeeName: string
          totalProjects: number
          completedOnTime: number
          onTimeRate: number
          openDoubts: number
          avgDurationDays: number
        }>
        followUpPerformance: {
          totalScheduled: number
          completed: number
          missed: number
          pending: number
          completionRate: number
        }
      }>(`/analytics/overview?range=${range}`)
      return res.data
    },
  },

  // ── Settings & Customization ──
  settings: {
    async getCategories() {
      const res = await apiRequest<any>('/settings/categories')
      return extractList<ServiceCategory>(res.data, 'categories')
    },

    async createCategory(payload: { name: string; color?: string }) {
      const res = await apiRequest<ServiceCategory>('/settings/categories', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return res.data
    },

    async deleteCategory(id: string) {
      const res = await apiRequest(`/settings/categories/${id}`, {
        method: 'DELETE',
      })
      return res
    },

    async getReminders() {
      const res = await apiRequest<GlobalReminderSettings>('/settings/reminders')
      return res.data?.reminders || []
    },

    async updateReminders(reminders: ReminderConfig[]) {
      const res = await apiRequest<GlobalReminderSettings>('/settings/reminders', {
        method: 'PUT',
        body: JSON.stringify({ reminders }),
      })
      return res.data?.reminders || []
    },

    async getNotificationPreferences() {
      const res = await apiRequest<{
        emailDeadlineReminders: boolean
        emailOverdueAlerts: boolean
        emailDoubtAlerts: boolean
        emailFollowupReminders: boolean
      }>('/settings/notifications')
      return res.data
    },

    async updateNotificationPreferences(payload: {
      emailDeadlineReminders?: boolean
      emailOverdueAlerts?: boolean
      emailDoubtAlerts?: boolean
      emailFollowupReminders?: boolean
    }) {
      const res = await apiRequest('/settings/notifications', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      return res.data
    },
  },
}
