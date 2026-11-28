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
  FollowUpEvaluation,
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
  ProjectTask,
  TaskPunch,
  TaskAssigneeSummary,
  AttendanceRecord,
  CreateTaskPayload,
  UpdateTaskPayload,
  PunchOutPayload,
  TaskStatus,
  LeaveRequest,
  LeaveType,
  PermissionRequest,
  PermissionType,
  HrmsMailRecord,
  EmployeeWorksheet,
  EmployeeWorksheetTaskItem,
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
  if (e.agreedBudget !== undefined && e.budget === undefined) {
    e.budget = Number(e.agreedBudget)
  }
  if (e.incurredCost !== undefined && e.actualCost === undefined) {
    e.actualCost = Number(e.incurredCost)
  }
  if (e.deadline && !e.deliveryDate) {
    e.deliveryDate = e.deadline
  }
  if (e.onboardingNotes !== undefined && e.notes === undefined) {
    e.notes = e.onboardingNotes
  }
  if (e.clientId && typeof e.clientId === 'object') {
    const cid = e.clientId.id || e.clientId._id
    if (!e.client) e.client = normalizeEntity(e.clientId)
    e.clientId = cid ? String(cid) : ''
  }
  if (e.primaryEmployeeId && typeof e.primaryEmployeeId === 'object') {
    const eid = e.primaryEmployeeId.id || e.primaryEmployeeId._id
    if (!e.primaryEmployee) e.primaryEmployee = normalizeEntity(e.primaryEmployeeId)
    e.primaryEmployeeId = eid ? String(eid) : ''
  }
  if (e.projectId && typeof e.projectId === 'object') {
    const pid = e.projectId.id || e.projectId._id
    if (!e.project) e.project = normalizeEntity(e.projectId)
    if (!e.projectName && e.projectId.name) e.projectName = e.projectId.name
    e.projectId = pid ? String(pid) : ''
  }
  return e as T
}

function normalizeTask(raw: any): ProjectTask {
  const t = normalizeEntity(raw) as any
  const assigneeIdsSet = new Set<string>()
  const assigneesMap = new Map<string, TaskAssigneeSummary>()

  if (Array.isArray(t.assignees)) {
    for (const item of t.assignees) {
      if (item && typeof item === 'object') {
        const id = String(item.id || item._id || '')
        if (id) {
          assigneeIdsSet.add(id)
          assigneesMap.set(id, {
            id,
            fullName: item.fullName || 'Staff',
            email: item.email,
            designation: item.designation,
          })
        }
      }
    }
  }

  if (Array.isArray(t.assigneeIds)) {
    for (const item of t.assigneeIds) {
      if (item && typeof item === 'object') {
        const id = String(item.id || item._id || '')
        if (id) {
          assigneeIdsSet.add(id)
          if (!assigneesMap.has(id)) {
            assigneesMap.set(id, {
              id,
              fullName: item.fullName || 'Staff',
              email: item.email,
              designation: item.designation,
            })
          }
        }
      } else if (typeof item === 'string' && item) {
        assigneeIdsSet.add(item)
      }
    }
  }

  if (t.assignedTo && typeof t.assignedTo === 'object') {
    const id = String(t.assignedTo.id || t.assignedTo._id || t.assignedToId || '')
    if (id) {
      assigneeIdsSet.add(id)
      if (!assigneesMap.has(id)) {
        assigneesMap.set(id, {
          id,
          fullName: t.assignedTo.fullName || 'Staff',
          email: t.assignedTo.email,
          designation: t.assignedTo.designation,
        })
      }
    }
  } else if (typeof t.assignedToId === 'string' && t.assignedToId) {
    assigneeIdsSet.add(t.assignedToId)
  }

  const initialAssigneeCount = assigneeIdsSet.size

  // Merge local task extensions (multi-assignees, startDate, auto-close) if present
  if (typeof window !== 'undefined' && t.id) {
    try {
      const metaRaw = localStorage.getItem(`crm_task_meta_${t.id}`)
      if (metaRaw) {
        const meta = JSON.parse(metaRaw)
        if (!t.startDate && meta.startDate) t.startDate = meta.startDate
        if (Array.isArray(meta.assigneeIds) && initialAssigneeCount <= 1) {
          meta.assigneeIds.forEach((id: string) => assigneeIdsSet.add(id))
        }
        if (Array.isArray(meta.assignees)) {
          meta.assignees.forEach((a: TaskAssigneeSummary) => {
            if (a?.id && !assigneesMap.has(a.id)) assigneesMap.set(a.id, a)
          })
        }
        if (meta.autoCloseUpdateText) t.autoCloseUpdateText = meta.autoCloseUpdateText
        if (meta.autoClosedAt) t.autoClosedAt = meta.autoClosedAt
      }
    } catch {}
  }

  const resolvedIds = Array.from(assigneeIdsSet)
  const resolvedAssignees = Array.from(assigneesMap.values())
  const primaryId = resolvedIds[0] || (typeof t.assignedToId === 'string' ? t.assignedToId : null)
  const primaryObj = t.assignedTo || resolvedAssignees[0] || null

  return {
    ...t,
    startDate: t.startDate || t.createdAt,
    assignedToId: primaryId,
    assignedTo: primaryObj,
    assigneeIds: resolvedIds,
    assignees: resolvedAssignees,
  }
}

function saveTaskMeta(taskId: string, patch: Partial<ProjectTask>) {
  if (typeof window === 'undefined' || !taskId) return
  try {
    const key = `crm_task_meta_${taskId}`
    const prev = JSON.parse(localStorage.getItem(key) || '{}')
    localStorage.setItem(key, JSON.stringify({ ...prev, ...patch }))
  } catch {}
}

function getFollowUpMeta(id: string): {
  isVisibleToEmployee?: boolean
  hideDetailsFromEmployee?: boolean
  evaluation?: FollowUpEvaluation | null
} {
  if (typeof window === 'undefined' || !id) return {}
  try {
    const meta = JSON.parse(localStorage.getItem(`crm_followup_meta_${id}`) || '{}')
    return meta
  } catch {
    return {}
  }
}

function saveFollowUpMeta(
  id: string,
  patch: {
    isVisibleToEmployee?: boolean
    hideDetailsFromEmployee?: boolean
    evaluation?: FollowUpEvaluation | null
  },
) {
  if (typeof window === 'undefined' || !id) return
  try {
    const key = `crm_followup_meta_${id}`
    const prev = JSON.parse(localStorage.getItem(key) || '{}')
    localStorage.setItem(key, JSON.stringify({ ...prev, ...patch }))
  } catch {}
}

function normalizeFollowUp(raw: any): FollowUp {
  const f = normalizeEntity(raw) as any
  const meta = getFollowUpMeta(f.id)
  return {
    ...f,
    isVisibleToEmployee:
      f.isVisibleToEmployee !== undefined
        ? f.isVisibleToEmployee
        : meta.isVisibleToEmployee !== undefined
        ? meta.isVisibleToEmployee
        : true,
    hideDetailsFromEmployee:
      f.hideDetailsFromEmployee !== undefined
        ? f.hideDetailsFromEmployee
        : meta.hideDetailsFromEmployee ?? false,
    evaluation: f.evaluation ?? meta.evaluation ?? null,
  }
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

    async update(id: string, payload: Partial<CreateClientPayload> & { status?: 'active' | 'inactive' }) {
      const apiPayload = {
        ...payload,
        onboardingNotes: payload.notes,
      }
      try {
        const res = await apiRequest<Client>(`/clients/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(apiPayload),
        })
        return extractEntity<Client>(res.data, 'client')
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
          const res = await apiRequest<Client>(`/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
          return extractEntity<Client>(res.data, 'client')
        }
        throw err
      }
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
      try {
        const res = await apiRequest<Project>(`/projects/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            budget: payload.budget,
            agreedBudget: payload.budget,
            actualCost: payload.actualCost,
            incurredCost: payload.actualCost,
          }),
        })
        return extractEntity<Project>(res.data, 'project')
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
          const res = await apiRequest<Project>(`/projects/${id}/financials`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          })
          return extractEntity<Project>(res.data, 'project')
        }
        throw err
      }
    },

    async patchDetails(
      id: string,
      payload: {
        agreedBudget?: number
        incurredCost?: number
        budget?: number
        actualCost?: number
        deliveryDate?: string
        deadline?: string
        deadlineStatus?: string
        status?: ProjectStatus
      },
    ) {
      try {
        const res = await apiRequest<Project>(`/projects/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        return extractEntity<Project>(res.data, 'project')
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
          if (payload.agreedBudget !== undefined || payload.incurredCost !== undefined) {
            await apiRequest<Project>(`/projects/${id}/financials`, {
              method: 'PATCH',
              body: JSON.stringify({
                budget: payload.agreedBudget ?? payload.budget ?? 0,
                actualCost: payload.incurredCost ?? payload.actualCost,
              }),
            }).catch(() => {})
          }
          if (payload.deliveryDate || payload.deadline) {
            await apiRequest<Project>(`/projects/${id}`, {
              method: 'PUT',
              body: JSON.stringify({
                deliveryDate: payload.deliveryDate || payload.deadline,
                ...(payload.status ? { status: payload.status } : {}),
              }),
            }).catch(() => {})
          }
          if (payload.status) {
            await apiRequest<Project>(`/projects/${id}/status`, {
              method: 'PATCH',
              body: JSON.stringify({ status: payload.status }),
            }).catch(() => {})
          }
        } else {
          throw err
        }
      }
      return { id, ...payload } as unknown as Project
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
      const followups = extractList<FollowUp>(res.data, 'followups').map(normalizeFollowUp)
      return { followups, meta: res.meta }
    },

    async create(payload: {
      projectId: string
      clientId: string
      scheduledAt: string
      assignedToId: string
      notes?: string
      isVisibleToEmployee?: boolean
      hideDetailsFromEmployee?: boolean
    }) {
      const res = await apiRequest<FollowUp>('/followups', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      const created = normalizeFollowUp(extractEntity<FollowUp>(res.data, 'followup'))
      if (created?.id) {
        saveFollowUpMeta(created.id, {
          isVisibleToEmployee: payload.isVisibleToEmployee ?? true,
          hideDetailsFromEmployee: payload.hideDetailsFromEmployee ?? false,
        })
      }
      return created
    },

    async updateVisibility(
      id: string,
      payload: { isVisibleToEmployee?: boolean; hideDetailsFromEmployee?: boolean },
    ) {
      saveFollowUpMeta(id, payload)
      try {
        const res = await apiRequest<FollowUp>(`/followups/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        return normalizeFollowUp(extractEntity<FollowUp>(res.data, 'followup'))
      } catch {
        return { id, ...payload } as Partial<FollowUp>
      }
    },

    async updateStatus(id: string, status: FollowUpStatus) {
      const res = await apiRequest<FollowUp>(`/followups/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      return normalizeFollowUp(extractEntity<FollowUp>(res.data, 'followup'))
    },

    async submitEvaluation(
      followupId: string,
      payload: {
        rating: number
        comments: string
        properlyCompleted: boolean
        projectId?: string
        employeeName?: string
      },
    ): Promise<FollowUpEvaluation> {
      let created: FollowUpEvaluation | null = null
      try {
        const res = await apiRequest<FollowUpEvaluation>(
          `/followups/${followupId}/evaluation`,
          {
            method: 'POST',
            body: JSON.stringify({
              rating: payload.rating,
              comments: payload.comments,
              properlyCompleted: payload.properlyCompleted,
            }),
          },
        )
        created = extractEntity<FollowUpEvaluation>(res.data, 'evaluation')
      } catch {}

      const evaluation: FollowUpEvaluation = created || {
        id: `eval-${Date.now()}`,
        followupId,
        projectId: payload.projectId,
        employeeName: payload.employeeName,
        rating: payload.rating,
        properlyCompleted: payload.properlyCompleted,
        comments: payload.comments,
        adminReviewStatus: 'pending',
        createdAt: new Date().toISOString(),
      }

      saveFollowUpMeta(followupId, { evaluation })
      if (typeof window !== 'undefined') {
        try {
          const key = 'crm_followup_evaluations'
          const list: FollowUpEvaluation[] = JSON.parse(localStorage.getItem(key) || '[]')
          const next = [evaluation, ...list.filter((e) => e.followupId !== followupId)]
          localStorage.setItem(key, JSON.stringify(next))
        } catch {}
      }
      return evaluation
    },

    async getEvaluations(projectId?: string): Promise<FollowUpEvaluation[]> {
      let apiList: FollowUpEvaluation[] = []
      try {
        const q = projectId ? `?projectId=${encodeURIComponent(projectId)}` : ''
        const res = await apiRequest<any>(`/followups/evaluations${q}`)
        apiList = extractList<FollowUpEvaluation>(res.data, 'evaluations')
      } catch {}

      if (typeof window !== 'undefined') {
        try {
          const localList: FollowUpEvaluation[] = JSON.parse(
            localStorage.getItem('crm_followup_evaluations') || '[]',
          )
          const mergedMap = new Map<string, FollowUpEvaluation>()
          for (const item of localList) mergedMap.set(item.followupId, item)
          for (const item of apiList) mergedMap.set(item.followupId, item)
          const all = Array.from(mergedMap.values())
          return projectId ? all.filter((e) => e.projectId === projectId) : all
        } catch {}
      }
      return apiList
    },

    async reviewEvaluation(
      followupId: string,
      review: {
        adminReviewStatus: 'pending' | 'approved' | 'needs_followup'
        adminReviewNotes?: string
      },
    ): Promise<FollowUpEvaluation | null> {
      try {
        await apiRequest(`/followups/${followupId}/evaluation`, {
          method: 'PATCH',
          body: JSON.stringify(review),
        })
      } catch {}

      const meta = getFollowUpMeta(followupId)
      if (meta.evaluation) {
        const updated: FollowUpEvaluation = {
          ...meta.evaluation,
          ...review,
        }
        saveFollowUpMeta(followupId, { evaluation: updated })
        if (typeof window !== 'undefined') {
          try {
            const key = 'crm_followup_evaluations'
            const list: FollowUpEvaluation[] = JSON.parse(localStorage.getItem(key) || '[]')
            localStorage.setItem(
              key,
              JSON.stringify(list.map((e) => (e.followupId === followupId ? updated : e))),
            )
          } catch {}
        }
        return updated
      }
      return null
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

    async updatePassword(id: string, password: string) {
      const res = await apiRequest<{ success: boolean; message?: string }>(`/employees/${id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password }),
      })
      return res.data || { success: true }
    },

    async getWorksheet(
      employeeId: string,
      range?: { from?: string; to?: string },
      preloaded?: { projects?: Project[]; clients?: Client[] },
    ): Promise<EmployeeWorksheet> {
      const q = new URLSearchParams()
      if (range?.from) q.set('from', range.from)
      if (range?.to) q.set('to', range.to)
      const query = q.toString() ? `?${q.toString()}` : ''

      try {
        const res = await apiRequest<EmployeeWorksheet>(`/employees/${employeeId}/worksheet${query}`)
        if (res.data && Array.isArray(res.data.tasks) && Array.isArray(res.data.punches)) {
          return res.data
        }
      } catch {}

      // Fallback aggregation across projects, tasks, and task punches
      const [projectsList, clientsList] = await Promise.all([
        preloaded?.projects
          ? Promise.resolve(preloaded.projects)
          : api.projects.list({ limit: 100 }).then((r) => r.projects || []).catch(() => [] as Project[]),
        preloaded?.clients
          ? Promise.resolve(preloaded.clients)
          : api.clients.list({ limit: 100 }).then((r) => r.clients || []).catch(() => [] as Client[]),
      ])

      const projectMap = new Map<string, Project>()
      projectsList.forEach((p) => {
        const pid = p.id || (p as Project & { _id?: string })._id
        if (pid) projectMap.set(pid, p)
      })

      const clientMap = new Map<string, Client>()
      clientsList.forEach((c) => {
        const cid = c.id || (c as Client & { _id?: string })._id
        if (cid) clientMap.set(cid, c)
      })

      const taskMap = new Map<string, ProjectTask>()

      // Try direct /tasks?assigneeId=... first if supported
      try {
        const directRes = await apiRequest<unknown>(`/tasks?assigneeId=${encodeURIComponent(employeeId)}`)
        const directTasks = extractList<ProjectTask>(directRes.data, 'tasks').map(normalizeTask)
        directTasks.forEach((t) => {
          if (t.id) taskMap.set(t.id, t)
        })
      } catch {}

      // Also scan project task lists
      if (projectsList.length > 0) {
        const taskResults = await Promise.allSettled(
          projectsList.map((p) => api.tasks.listByProject(p.id)),
        )
        taskResults.forEach((res) => {
          if (res.status === 'fulfilled') {
            res.value.forEach((t) => {
              if (t.id) taskMap.set(t.id, t)
            })
          }
        })
      }

      const assignedTasks = Array.from(taskMap.values()).filter((t) => {
        const rawSingle = (t.assignedToId || '') as unknown as string | { id?: string; _id?: string }
        const singleId =
          typeof rawSingle === 'object' && rawSingle !== null
            ? String(rawSingle.id || rawSingle._id || '')
            : String(rawSingle || '')
        return (
          singleId === employeeId ||
          t.assignedTo?.id === employeeId ||
          Boolean(t.assigneeIds?.includes(employeeId)) ||
          Boolean(t.assignees?.some((a) => a.id === employeeId))
        )
      })

      const fromMs = range?.from ? new Date(`${range.from}T00:00:00`).getTime() : null
      const toMs = range?.to ? new Date(`${range.to}T23:59:59.999`).getTime() : null

      const punchesResults = await Promise.allSettled(
        assignedTasks.map((t) => api.tasks.getPunches(t.id)),
      )

      const allEmployeePunches: TaskPunch[] = []
      const taskWorkedMap = new Map<
        string,
        { seconds: number; count: number; lastWorkedAt?: string }
      >()

      assignedTasks.forEach((task, idx) => {
        const punchRes = punchesResults[idx]
        const rawPunches = punchRes?.status === 'fulfilled' ? punchRes.value : []

        const proj = projectMap.get(task.projectId)
        const client = proj ? clientMap.get(proj.clientId) : undefined
        const resolvedProjectName = task.projectName || proj?.name || 'Project'

        const matchingPunches = rawPunches.filter((p) => {
          const punchEmpRaw = p.employeeId as unknown as string | { id?: string; _id?: string }
          const punchEmpId =
            typeof punchEmpRaw === 'object' && punchEmpRaw !== null
              ? String(punchEmpRaw.id || punchEmpRaw._id || '')
              : String(punchEmpRaw || '')
          const matchesEmp =
            punchEmpId === employeeId ||
            (!punchEmpId || punchEmpId === 'current')
          if (!matchesEmp) return false

          if (fromMs !== null || toMs !== null) {
            const ts = new Date(p.startTime || p.createdAt).getTime()
            if (isNaN(ts)) return false
            if (fromMs !== null && ts < fromMs) return false
            if (toMs !== null && ts > toMs) return false
          }
          return true
        })

        let taskSeconds = 0
        let lastWorkedAt: string | undefined

        matchingPunches.forEach((p) => {
          const computedSeconds =
            typeof p.durationSeconds === 'number' && p.durationSeconds >= 0
              ? p.durationSeconds
              : p.endTime
              ? Math.max(
                  0,
                  Math.floor(
                    (new Date(p.endTime).getTime() - new Date(p.startTime).getTime()) / 1000,
                  ),
                )
              : 0

          taskSeconds += computedSeconds
          const ts = p.endTime || p.startTime || p.createdAt
          if (!lastWorkedAt || (ts && ts > lastWorkedAt)) {
            lastWorkedAt = ts
          }

          allEmployeePunches.push({
            ...p,
            taskTitle: p.taskTitle || task.title,
            projectId: p.projectId || task.projectId,
            projectName: p.projectName || resolvedProjectName,
            durationSeconds: computedSeconds,
          })
        })

        // Fallback if backend tracks aggregate minutes directly on task without granular punch docs
        if (matchingPunches.length === 0 && !fromMs && !toMs && (task.totalLoggedMinutes || 0) > 0) {
          taskSeconds = Math.round((task.totalLoggedMinutes || 0) * 60)
        }

        taskWorkedMap.set(task.id, {
          seconds: taskSeconds,
          count: matchingPunches.length || (taskSeconds > 0 ? task.totalPunchesCount || 1 : 0),
          lastWorkedAt: lastWorkedAt || task.updatedAt,
        })

        if (!task.clientName && client?.companyName) {
          task.clientName = client.companyName
        }
        if (!task.projectName && proj?.name) {
          task.projectName = proj.name
        }
      })

      const worksheetTasks: EmployeeWorksheetTaskItem[] = assignedTasks
        .map((task) => {
          const stats = taskWorkedMap.get(task.id) || { seconds: 0, count: 0 }
          const proj = projectMap.get(task.projectId)
          const client = proj ? clientMap.get(proj.clientId) : undefined
          return {
            taskId: task.id,
            title: task.title,
            projectId: task.projectId,
            projectName: task.projectName || proj?.name || 'Project',
            clientName: task.clientName || client?.companyName,
            status: task.status,
            priority: task.priority,
            startDate: task.startDate || task.createdAt,
            dueDate: task.dueDate,
            estimatedHours: task.estimatedHours,
            workedSeconds: stats.seconds,
            workedHours: Math.round((stats.seconds / 3600) * 100) / 100,
            punchCount: stats.count,
            lastWorkedAt: stats.lastWorkedAt,
            autoClosedAt: task.autoClosedAt,
            autoCloseUpdateText: task.autoCloseUpdateText,
          }
        })
        .sort((a, b) => b.workedSeconds - a.workedSeconds || (b.lastWorkedAt || '').localeCompare(a.lastWorkedAt || ''))

      allEmployeePunches.sort((a, b) =>
        (b.startTime || b.createdAt).localeCompare(a.startTime || a.createdAt),
      )

      const totalWorkedSeconds = worksheetTasks.reduce((sum, t) => sum + t.workedSeconds, 0)
      const tasksCompleted = worksheetTasks.filter((t) => t.status === 'completed').length
      const tasksTodo = worksheetTasks.filter((t) => t.status === 'todo').length
      const tasksInProgress = worksheetTasks.filter(
        (t) => t.status === 'in_progress' || t.status === 'review' || t.status === 'blocked',
      ).length
      const autoPunchedCount = allEmployeePunches.filter((p) => p.autoPunched).length

      return {
        range,
        summary: {
          totalWorkedSeconds,
          totalWorkedHours: Math.round((totalWorkedSeconds / 3600) * 100) / 100,
          totalTasksAssigned: worksheetTasks.length,
          tasksCompleted,
          tasksInProgress,
          tasksTodo,
          totalPunchSessions: allEmployeePunches.length,
          autoPunchedCount,
        },
        tasks: worksheetTasks,
        punches: allEmployeePunches,
      }
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
      let apiList: ServiceCategory[] = []
      try {
        const res = await apiRequest<any>('/settings/categories')
        apiList = extractList<ServiceCategory>(res.data, 'categories')
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
          try {
            const res = await apiRequest<any>('/service-categories')
            apiList = extractList<ServiceCategory>(res.data, 'categories')
          } catch {}
        }
      }

      if (typeof window !== 'undefined') {
        try {
          const customRaw = localStorage.getItem('crm_custom_categories')
          if (customRaw) {
            const custom: ServiceCategory[] = JSON.parse(customRaw)
            const map = new Map<string, ServiceCategory>()
            apiList.forEach((c) => map.set(c.name.toLowerCase(), c))
            custom.forEach((c) => {
              if (!map.has(c.name.toLowerCase())) map.set(c.name.toLowerCase(), c)
            })
            return Array.from(map.values())
          }
        } catch {}
      }
      return apiList
    },

    async createCategory(payload: { name: string; description?: string; color?: string }) {
      let created: ServiceCategory | null = null
      try {
        const res = await apiRequest<ServiceCategory>('/settings/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        created = extractEntity<ServiceCategory>(res.data, 'category')
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
          try {
            const res = await apiRequest<ServiceCategory>('/service-categories', {
              method: 'POST',
              body: JSON.stringify(payload),
            })
            created = extractEntity<ServiceCategory>(res.data, 'category')
          } catch {}
        }
      }

      if (!created) {
        created = {
          id: `cat-${Date.now()}`,
          name: payload.name,
          description: payload.description,
          color: payload.color || '#3b82f6',
          isDefault: false,
          createdAt: new Date().toISOString(),
        }
      }

      if (typeof window !== 'undefined') {
        try {
          const key = 'crm_custom_categories'
          const prev: ServiceCategory[] = JSON.parse(localStorage.getItem(key) || '[]')
          const next = [created, ...prev.filter((c) => c.name.toLowerCase() !== created!.name.toLowerCase())]
          localStorage.setItem(key, JSON.stringify(next))
        } catch {}
      }
      return created
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

  // ── Tasks & Work Punches ──
  tasks: {
    async listByProject(projectId: string, q?: string): Promise<ProjectTask[]> {
      let rawList: ProjectTask[] = []
      const query = q?.trim() ? `&q=${encodeURIComponent(q.trim())}` : ''
      try {
        const res = await apiRequest<any>(`/tasks?projectId=${encodeURIComponent(projectId)}${query}`)
        rawList = extractList<ProjectTask>(res.data, 'tasks')
      } catch {
        try {
          const res = await apiRequest<any>(`/projects/${projectId}/tasks`)
          rawList = extractList<ProjectTask>(res.data, 'tasks')
        } catch {}
      }

      let localList: ProjectTask[] = []
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`crm_tasks_${projectId}`)
        if (stored) {
          try {
            localList = JSON.parse(stored)
          } catch {}
        }
      }

      const source = rawList.length > 0 ? rawList : localList
      const normalized = source.map(normalizeTask)
      if (q?.trim()) {
        const term = q.trim().toLowerCase()
        return normalized.filter(
          (t) =>
            t.title.toLowerCase().includes(term) ||
            (t.description || '').toLowerCase().includes(term) ||
            (t.assignees || []).some((a) => a.fullName.toLowerCase().includes(term)),
        )
      }
      return normalized
    },

    async getById(taskId: string, projectId?: string): Promise<ProjectTask | null> {
      try {
        const res = await apiRequest<any>(`/tasks/${taskId}`)
        const ent = extractEntity<ProjectTask>(res.data, 'task')
        if (ent?.id) return normalizeTask(ent)
      } catch {}

      if (typeof window !== 'undefined') {
        if (projectId) {
          try {
            const list: ProjectTask[] = JSON.parse(localStorage.getItem(`crm_tasks_${projectId}`) || '[]')
            const found = list.find((t) => t.id === taskId)
            if (found) return normalizeTask(found)
          } catch {}
        }
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && k.startsWith('crm_tasks_')) {
            try {
              const list: ProjectTask[] = JSON.parse(localStorage.getItem(k) || '[]')
              const found = list.find((t) => t.id === taskId)
              if (found) return normalizeTask(found)
            } catch {}
          }
        }
      }
      return null
    },

    async listMyAssigned(params?: { status?: TaskStatus; search?: string }): Promise<ProjectTask[]> {
      const q = new URLSearchParams()
      if (params?.status && params.status !== ('all' as any)) q.set('status', params.status)
      if (params?.search) q.set('search', params.search)
      try {
        const res = await apiRequest<any>(`/tasks/my-assigned?${q.toString()}`)
        const list = extractList<ProjectTask>(res.data, 'tasks').map(normalizeTask)
        if (list && list.length > 0) return list
      } catch {}
      if (typeof window !== 'undefined') {
        try {
          const userStr = localStorage.getItem('crm_active_user')
          const user = userStr ? JSON.parse(userStr) : null
          const allTasks: ProjectTask[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i)
            if (k && k.startsWith('crm_tasks_')) {
              const val = JSON.parse(localStorage.getItem(k) || '[]')
              allTasks.push(...val.map(normalizeTask))
            }
          }
          let filtered = allTasks
          if (user?.id) {
            filtered = allTasks.filter(
              (t) =>
                t.assignedToId === user.id ||
                (Array.isArray(t.assigneeIds) && t.assigneeIds.includes(user.id)),
            )
          }
          if (params?.status && params.status !== ('all' as any)) {
            filtered = filtered.filter((t) => t.status === params.status)
          }
          if (params?.search) {
            const s = params.search.toLowerCase()
            filtered = filtered.filter(
              (t) =>
                t.title.toLowerCase().includes(s) ||
                (t.description || '').toLowerCase().includes(s),
            )
          }
          return filtered
        } catch {}
      }
      return []
    },

    async create(
      projectId: string,
      payload: CreateTaskPayload & { assignees?: TaskAssigneeSummary[] },
    ): Promise<ProjectTask> {
      const startDate = payload.startDate || new Date().toISOString()
      const assigneeIds =
        payload.assigneeIds && payload.assigneeIds.length > 0
          ? payload.assigneeIds
          : payload.assignedToId
          ? [payload.assignedToId]
          : []
      const primaryId = assigneeIds[0] || payload.assignedToId || null

      const requestPayload = {
        ...payload,
        projectId,
        startDate,
        assigneeIds,
        assignedToId: primaryId,
      }

      let createdTask: ProjectTask | null = null
      try {
        const res = await apiRequest<ProjectTask>(`/projects/${projectId}/tasks`, {
          method: 'POST',
          body: JSON.stringify(requestPayload),
        })
        createdTask = extractEntity<ProjectTask>(res.data, 'task')
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
          try {
            const res = await apiRequest<ProjectTask>('/tasks', {
              method: 'POST',
              body: JSON.stringify(requestPayload),
            })
            createdTask = extractEntity<ProjectTask>(res.data, 'task')
          } catch {}
        }
      }

      if (!createdTask) {
        createdTask = {
          id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          projectId,
          title: payload.title,
          description: payload.description || '',
          startDate,
          assignedToId: primaryId,
          assigneeIds,
          assignees: payload.assignees || [],
          status: payload.status || 'todo',
          priority: payload.priority || 'medium',
          dueDate: payload.dueDate,
          estimatedHours: payload.estimatedHours,
          totalLoggedMinutes: 0,
          totalPunchesCount: 0,
          createdAt: startDate,
          updatedAt: startDate,
        }
      }

      const normalized = normalizeTask({
        ...createdTask,
        startDate: createdTask.startDate || startDate,
        assigneeIds: createdTask.assigneeIds?.length ? createdTask.assigneeIds : assigneeIds,
        assignees: payload.assignees?.length ? payload.assignees : createdTask.assignees,
        assignedToId: createdTask.assignedToId ?? primaryId,
      })

      saveTaskMeta(normalized.id, {
        startDate: normalized.startDate,
        assigneeIds: normalized.assigneeIds,
        assignees: normalized.assignees,
      })

      if (typeof window !== 'undefined') {
        const key = `crm_tasks_${projectId}`
        const current: ProjectTask[] = JSON.parse(localStorage.getItem(key) || '[]')
        const updated = [normalized, ...current.filter((t) => t.id !== normalized.id)]
        localStorage.setItem(key, JSON.stringify(updated))
      }
      return normalized
    },

    async update(
      taskId: string,
      projectId: string,
      payload: UpdateTaskPayload & { assignees?: TaskAssigneeSummary[] },
    ): Promise<ProjectTask> {
      const requestBody = {
        ...payload,
        ...(payload.assigneeIds
          ? { assignedToId: payload.assigneeIds[0] || null }
          : {}),
      }

      let updatedTask: ProjectTask | null = null
      try {
        const res = await apiRequest<ProjectTask>(`/tasks/${taskId}`, {
          method: 'PUT',
          body: JSON.stringify(requestBody),
        })
        updatedTask = extractEntity<ProjectTask>(res.data, 'task')
      } catch {}

      if (payload.assigneeIds || payload.assignees) {
        saveTaskMeta(taskId, {
          ...(payload.assigneeIds ? { assigneeIds: payload.assigneeIds } : {}),
          ...(payload.assignees ? { assignees: payload.assignees } : {}),
        })
      }

      if (typeof window !== 'undefined') {
        const key = `crm_tasks_${projectId}`
        const current: ProjectTask[] = JSON.parse(localStorage.getItem(key) || '[]')
        const idx = current.findIndex((t) => t.id === taskId)
        if (idx !== -1) {
          current[idx] = normalizeTask({
            ...current[idx],
            ...requestBody,
            ...(updatedTask || {}),
            assigneeIds: payload.assigneeIds ?? current[idx].assigneeIds,
            assignees: payload.assignees ?? current[idx].assignees,
            updatedAt: new Date().toISOString(),
          })
          localStorage.setItem(key, JSON.stringify(current))
          return current[idx]
        }
      }

      return normalizeTask(updatedTask || ({ id: taskId, projectId, ...requestBody } as any))
    },

    async delete(taskId: string, projectId: string): Promise<{ success: boolean }> {
      try {
        await apiRequest(`/tasks/${taskId}`, { method: 'DELETE' })
      } catch {}
      if (typeof window !== 'undefined') {
        const key = `crm_tasks_${projectId}`
        const current: ProjectTask[] = JSON.parse(localStorage.getItem(key) || '[]')
        localStorage.setItem(key, JSON.stringify(current.filter((t) => t.id !== taskId)))
      }
      return { success: true }
    },

    async assign(taskId: string, projectId: string, employeeId: string | null, employeeObj?: any): Promise<ProjectTask> {
      const assigneeIds = employeeId ? [employeeId] : []
      const assignees = employeeObj ? [employeeObj] : []
      return this.assignMultiple(taskId, projectId, assigneeIds, assignees)
    },

    async assignMultiple(
      taskId: string,
      projectId: string,
      assigneeIds: string[],
      assignees: TaskAssigneeSummary[] = [],
    ): Promise<ProjectTask> {
      const primaryId = assigneeIds[0] || null
      try {
        await apiRequest(`/tasks/${taskId}`, {
          method: 'PUT',
          body: JSON.stringify({ assigneeIds, assignedToId: primaryId }),
        })
      } catch {
        try {
          await apiRequest(`/tasks/${taskId}/assign`, {
            method: 'PATCH',
            body: JSON.stringify({ employeeId: primaryId, assigneeIds }),
          })
        } catch {}
      }

      saveTaskMeta(taskId, { assigneeIds, assignees })

      if (typeof window !== 'undefined') {
        const key = `crm_tasks_${projectId}`
        const current: ProjectTask[] = JSON.parse(localStorage.getItem(key) || '[]')
        const idx = current.findIndex((t) => t.id === taskId)
        if (idx !== -1) {
          current[idx] = normalizeTask({
            ...current[idx],
            assignedToId: primaryId,
            assignedTo: assignees[0] || null,
            assigneeIds,
            assignees,
            updatedAt: new Date().toISOString(),
          })
          localStorage.setItem(key, JSON.stringify(current))
          return current[idx]
        }
      }
      return normalizeTask({
        id: taskId,
        projectId,
        assignedToId: primaryId,
        assignedTo: assignees[0] || null,
        assigneeIds,
        assignees,
      })
    },

    async bulkAssign(
      taskIds: string[],
      projectId: string,
      employeeId: string | null,
      employeeObj?: any,
    ): Promise<{ success: boolean; count: number }> {
      const assigneeIds = employeeId ? [employeeId] : []
      const assignees = employeeObj ? [employeeObj] : []
      return this.bulkAssignMultiple(taskIds, projectId, assigneeIds, assignees)
    },

    async bulkAssignMultiple(
      taskIds: string[],
      projectId: string,
      assigneeIds: string[],
      assignees: TaskAssigneeSummary[] = [],
    ): Promise<{ success: boolean; count: number }> {
      const primaryId = assigneeIds[0] || null
      try {
        await apiRequest(`/projects/${projectId}/tasks/bulk-assign`, {
          method: 'POST',
          body: JSON.stringify({ taskIds, employeeId: primaryId, assigneeIds }),
        })
      } catch {}

      for (const tid of taskIds) {
        saveTaskMeta(tid, { assigneeIds, assignees })
      }

      if (typeof window !== 'undefined') {
        const key = `crm_tasks_${projectId}`
        const current: ProjectTask[] = JSON.parse(localStorage.getItem(key) || '[]')
        const updated = current.map((t) => {
          if (taskIds.includes(t.id)) {
            return normalizeTask({
              ...t,
              assignedToId: primaryId,
              assignedTo: assignees[0] || null,
              assigneeIds,
              assignees,
              updatedAt: new Date().toISOString(),
            })
          }
          return t
        })
        localStorage.setItem(key, JSON.stringify(updated))
      }
      return { success: true, count: taskIds.length }
    },

    async autoUpdate(
      taskId: string,
      projectId: string,
      payload: { updateText: string; statusAtStop?: TaskStatus; punchId?: string },
    ): Promise<{ success: boolean }> {
      try {
        await apiRequest(`/tasks/${taskId}/auto-update`, {
          method: 'POST',
          body: JSON.stringify({
            updateText: payload.updateText,
            statusAtStop: payload.statusAtStop,
          }),
        })
      } catch {}

      const now = new Date().toISOString()
      saveTaskMeta(taskId, {
        autoCloseUpdateText: payload.updateText,
        autoClosedAt: now,
      })

      if (typeof window !== 'undefined') {
        try {
          const pKey = `crm_punches_${taskId}`
          const punches: TaskPunch[] = JSON.parse(localStorage.getItem(pKey) || '[]')
          if (punches.length > 0) {
            const targetIdx = payload.punchId
              ? punches.findIndex((p) => p.id === payload.punchId)
              : 0
            const idx = targetIdx !== -1 ? targetIdx : 0
            punches[idx] = {
              ...punches[idx],
              statusAtStop: payload.statusAtStop || punches[idx].statusAtStop,
              notes: payload.updateText,
              autoPunched: true,
            }
            localStorage.setItem(pKey, JSON.stringify(punches))
          }

          if (projectId) {
            const tKey = `crm_tasks_${projectId}`
            const currentTasks: ProjectTask[] = JSON.parse(localStorage.getItem(tKey) || '[]')
            const updatedTasks = currentTasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    ...(payload.statusAtStop ? { status: payload.statusAtStop } : {}),
                    autoCloseUpdateText: payload.updateText,
                    autoClosedAt: now,
                    updatedAt: now,
                  }
                : t,
            )
            localStorage.setItem(tKey, JSON.stringify(updatedTasks))
          }
        } catch {}
      }

      return { success: true }
    },

    async punchIn(taskId: string, projectId: string, taskTitle?: string): Promise<TaskPunch> {
      let punch: TaskPunch | null = null
      try {
        const res = await apiRequest<TaskPunch>(`/tasks/${taskId}/punches/start`, { method: 'POST' })
        punch = res.data
      } catch {}

      if (!punch) {
        let empId = 'current'
        let empName = 'Employee'
        if (typeof window !== 'undefined') {
          const userStr = localStorage.getItem('crm_active_user')
          if (userStr) {
            const u = JSON.parse(userStr)
            empId = u.id || empId
            empName = u.fullName || empName
          }
        }
        punch = {
          id: `punch-${Date.now()}`,
          taskId,
          projectId,
          taskTitle: taskTitle || 'Task',
          employeeId: empId,
          employeeName: empName,
          startTime: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        }
      }
      return punch
    },

    async punchOut(punchId: string, taskId: string, projectId: string, payload: PunchOutPayload, durationSeconds: number): Promise<TaskPunch> {
      let punch: TaskPunch | null = null
      try {
        const res = await apiRequest<TaskPunch>(`/tasks/${taskId}/punches/${punchId}/stop`, {
          method: 'POST',
          body: JSON.stringify({ ...payload, durationSeconds }),
        })
        punch = res.data
      } catch {}

      let empId = 'current'
      let empName = 'Employee'
      if (typeof window !== 'undefined') {
        try {
          const userStr = localStorage.getItem('crm_active_user')
          if (userStr) {
            const u = JSON.parse(userStr)
            empId = u.id || empId
            empName = u.fullName || empName
          }
        } catch {}
      }

      const endTime = new Date().toISOString()
      const finishedPunch: TaskPunch = punch || {
        id: punchId,
        taskId,
        projectId,
        employeeId: empId,
        employeeName: empName,
        startTime: new Date(Date.now() - durationSeconds * 1000).toISOString(),
        endTime,
        durationSeconds,
        statusAtStop: payload.statusAtStop,
        notes: payload.notes,
        autoPunched: payload.autoPunched,
        createdAt: endTime,
      }

      if (typeof window !== 'undefined') {
        const pKey = `crm_punches_${taskId}`
        const punches: TaskPunch[] = JSON.parse(localStorage.getItem(pKey) || '[]')
        localStorage.setItem(pKey, JSON.stringify([finishedPunch, ...punches]))

        const tKey = `crm_tasks_${projectId}`
        const currentTasks: ProjectTask[] = JSON.parse(localStorage.getItem(tKey) || '[]')
        const idx = currentTasks.findIndex((t) => t.id === taskId)
        if (idx !== -1) {
          const addedMinutes = Math.round(durationSeconds / 60)
          currentTasks[idx].totalLoggedMinutes = (currentTasks[idx].totalLoggedMinutes || 0) + addedMinutes
          currentTasks[idx].totalPunchesCount = (currentTasks[idx].totalPunchesCount || 0) + 1
          currentTasks[idx].status = payload.statusAtStop
          currentTasks[idx].updatedAt = endTime
          localStorage.setItem(tKey, JSON.stringify(currentTasks))
        }
      }

      return finishedPunch
    },

    async getPunches(taskId: string): Promise<TaskPunch[]> {
      try {
        const res = await apiRequest<any>(`/tasks/${taskId}/punches`)
        const list = extractList<TaskPunch>(res.data, 'punches')
        if (list && list.length > 0) return list
      } catch {}
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(`crm_punches_${taskId}`)
        if (stored) {
          try {
            return JSON.parse(stored)
          } catch {}
        }
      }
      return []
    },
  },

  // ── Daily Shift Attendance ──
  attendance: {
    async getStatus(): Promise<{ isClockedIn: boolean; currentRecord: AttendanceRecord | null }> {
      try {
        const res = await apiRequest<{ isClockedIn: boolean; currentRecord: AttendanceRecord | null }>('/attendance/status')
        if (res.data) return res.data
      } catch {}
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('crm_active_shift')
        if (stored) {
          try {
            const rec: AttendanceRecord = JSON.parse(stored)
            if (rec && rec.status === 'clocked_in') {
              return { isClockedIn: true, currentRecord: rec }
            }
          } catch {}
        }
      }
      return { isClockedIn: false, currentRecord: null }
    },

    async clockIn(): Promise<AttendanceRecord> {
      let rec: AttendanceRecord | null = null
      try {
        const res = await apiRequest<AttendanceRecord>('/attendance/clock-in', { method: 'POST' })
        rec = res.data
      } catch {}

      if (!rec) {
        let empId = 'current'
        let empName = 'Employee'
        if (typeof window !== 'undefined') {
          const userStr = localStorage.getItem('crm_active_user')
          if (userStr) {
            const u = JSON.parse(userStr)
            empId = u.id || empId
            empName = u.fullName || empName
          }
        }
        const now = new Date()
        rec = {
          id: `att-${Date.now()}`,
          employeeId: empId,
          employeeName: empName,
          clockInTime: now.toISOString(),
          date: now.toISOString().split('T')[0],
          status: 'clocked_in',
          createdAt: now.toISOString(),
        }
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('crm_active_shift', JSON.stringify(rec))
        const history: AttendanceRecord[] = JSON.parse(localStorage.getItem('crm_shift_history') || '[]')
        localStorage.setItem('crm_shift_history', JSON.stringify([rec, ...history]))
      }
      return rec
    },

    async clockOut(): Promise<AttendanceRecord> {
      let rec: AttendanceRecord | null = null
      try {
        const res = await apiRequest<AttendanceRecord>('/attendance/clock-out', { method: 'POST' })
        rec = res.data
      } catch {}

      const now = new Date()
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('crm_active_shift')
        if (stored) {
          const current: AttendanceRecord = JSON.parse(stored)
          const startTime = new Date(current.clockInTime).getTime()
          const durationMinutes = Math.max(1, Math.round((now.getTime() - startTime) / (1000 * 60)))
          rec = {
            ...current,
            clockOutTime: now.toISOString(),
            durationMinutes,
            status: 'clocked_out',
          }
          localStorage.removeItem('crm_active_shift')
          const history: AttendanceRecord[] = JSON.parse(localStorage.getItem('crm_shift_history') || '[]')
          const updatedHistory = history.map((h) => (h.id === rec!.id ? rec! : h))
          localStorage.setItem('crm_shift_history', JSON.stringify(updatedHistory))
        }
      }

      return rec || {
        id: `att-${Date.now()}`,
        employeeId: 'current',
        clockInTime: now.toISOString(),
        clockOutTime: now.toISOString(),
        durationMinutes: 0,
        date: now.toISOString().split('T')[0],
        status: 'clocked_out',
        createdAt: now.toISOString(),
      }
    },

    async getHistory(): Promise<AttendanceRecord[]> {
      try {
        const res = await apiRequest<any>('/hrms/attendance')
        const list = extractList<AttendanceRecord>(res.data, 'attendance')
        if (list && list.length > 0) return list
      } catch {
        try {
          const res = await apiRequest<any>('/attendance/history')
          const list = extractList<AttendanceRecord>(res.data, 'attendance')
          if (list && list.length > 0) return list
        } catch {}
      }
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('crm_shift_history')
        if (stored) {
          try {
            return JSON.parse(stored)
          } catch {}
        }
      }
      return []
    },
  },

  // ── HRMS (Attendance, Leave, Permission, Send Mail) ──
  hrms: {
    async getAttendance(params?: {
      userId?: string
      from?: string
      to?: string
    }): Promise<AttendanceRecord[]> {
      const q = new URLSearchParams()
      if (params?.userId && params.userId !== 'all') q.set('userId', params.userId)
      if (params?.from) q.set('from', params.from)
      if (params?.to) q.set('to', params.to)
      const query = q.toString() ? `?${q.toString()}` : ''

      let apiList: AttendanceRecord[] = []
      try {
        const res = await apiRequest<unknown>(`/hrms/attendance${query}`)
        apiList = extractList<AttendanceRecord>(res.data, 'attendance')
      } catch {
        try {
          const res = await apiRequest<unknown>('/attendance/history')
          apiList = extractList<AttendanceRecord>(res.data, 'attendance')
        } catch {}
      }

      let localList: AttendanceRecord[] = []
      if (typeof window !== 'undefined') {
        try {
          localList = JSON.parse(localStorage.getItem('crm_shift_history') || '[]')
        } catch {}
      }

      const merged = new Map<string, AttendanceRecord>()
      const normalizeAtt = (rec: AttendanceRecord): AttendanceRecord => {
        const rawEmp = rec.employeeId as unknown as
          | string
          | { id?: string; _id?: string; fullName?: string; designation?: string }
        const empObj = typeof rawEmp === 'object' && rawEmp !== null ? rawEmp : null
        return {
          ...rec,
          id: rec.id || (rec as AttendanceRecord & { _id?: string })._id || '',
          employeeId: empObj ? String(empObj.id || empObj._id || '') : String(rawEmp || ''),
          employeeName: rec.employeeName || empObj?.fullName,
          employeeDesignation: rec.employeeDesignation || empObj?.designation,
        }
      }

      localList.map(normalizeAtt).forEach((r) => {
        if (r.id) merged.set(r.id, r)
      })
      apiList.map(normalizeAtt).forEach((r) => {
        if (r.id) merged.set(r.id, r)
      })

      let result = Array.from(merged.values()).sort((a, b) =>
        (b.clockInTime || b.createdAt).localeCompare(a.clockInTime || a.createdAt),
      )

      if (params?.userId && params.userId !== 'all') {
        result = result.filter((r) => r.employeeId === params.userId)
      }
      if (params?.from) {
        result = result.filter((r) => (r.date || r.clockInTime.slice(0, 10)) >= params.from!)
      }
      if (params?.to) {
        result = result.filter((r) => (r.date || r.clockInTime.slice(0, 10)) <= params.to!)
      }
      return result
    },

    async punchAttendance(type: 'in' | 'out', timestamp?: string): Promise<AttendanceRecord> {
      try {
        const res = await apiRequest<AttendanceRecord>('/hrms/attendance', {
          method: 'POST',
          body: JSON.stringify({ type, timestamp: timestamp || new Date().toISOString() }),
        })
        if (res.data) return res.data
      } catch {}
      return type === 'in' ? api.attendance.clockIn() : api.attendance.clockOut()
    },

    async getLeaves(params?: { status?: string; userId?: string }): Promise<LeaveRequest[]> {
      const q = new URLSearchParams()
      if (params?.status && params.status !== 'all') q.set('status', params.status)
      if (params?.userId && params.userId !== 'all') q.set('userId', params.userId)
      const query = q.toString() ? `?${q.toString()}` : ''

      let apiList: LeaveRequest[] = []
      try {
        const res = await apiRequest<unknown>(`/hrms/leave${query}`)
        apiList = extractList<LeaveRequest>(res.data, 'leaves')
      } catch {}

      let localList: LeaveRequest[] = []
      let localReviews: Record<string, Partial<LeaveRequest>> = {}
      if (typeof window !== 'undefined') {
        try {
          localList = JSON.parse(localStorage.getItem('crm_hrms_leaves') || '[]')
          localReviews = JSON.parse(localStorage.getItem('crm_hrms_leave_reviews') || '{}')
        } catch {}
      }

      const normalizeLeave = (l: LeaveRequest): LeaveRequest => {
        const rawUser = l.userId as unknown as
          | string
          | { id?: string; _id?: string; fullName?: string; email?: string; designation?: string }
        const userObj = typeof rawUser === 'object' && rawUser !== null ? rawUser : null
        const id = l.id || (l as LeaveRequest & { _id?: string })._id || ''
        const override = localReviews[id]
        const base: LeaveRequest = {
          ...l,
          id,
          userId: userObj ? String(userObj.id || userObj._id || '') : String(rawUser || ''),
          employeeName: l.employeeName || userObj?.fullName,
          employeeEmail: l.employeeEmail || userObj?.email,
          employeeDesignation: l.employeeDesignation || userObj?.designation,
        }
        if (override && base.status === 'pending') {
          return { ...base, ...override }
        }
        return base
      }

      const merged = new Map<string, LeaveRequest>()
      localList.map(normalizeLeave).forEach((item) => {
        if (item.id) merged.set(item.id, item)
      })
      apiList.map(normalizeLeave).forEach((item) => {
        if (item.id) merged.set(item.id, item)
      })

      let result = Array.from(merged.values()).sort((a, b) =>
        (b.createdAt || b.startDate).localeCompare(a.createdAt || a.startDate),
      )

      if (params?.status && params.status !== 'all') {
        result = result.filter((l) => l.status === params.status)
      }
      if (params?.userId && params.userId !== 'all') {
        result = result.filter((l) => l.userId === params.userId)
      }
      return result
    },

    async applyLeave(payload: {
      startDate: string
      endDate: string
      type: LeaveType
      reason: string
    }): Promise<LeaveRequest> {
      let created: LeaveRequest | null = null
      try {
        const res = await apiRequest<LeaveRequest>('/hrms/leave', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        created = extractEntity<LeaveRequest>(res.data, 'leave')
      } catch {}

      if (!created) {
        let userId = 'current'
        let employeeName = 'Employee'
        let employeeEmail = ''
        let employeeDesignation = ''
        if (typeof window !== 'undefined') {
          try {
            const u = JSON.parse(localStorage.getItem('crm_active_user') || '{}')
            userId = u.id || userId
            employeeName = u.fullName || employeeName
            employeeEmail = u.email || ''
            employeeDesignation = u.designation || ''
          } catch {}
        }
        created = {
          id: `leave-${Date.now()}`,
          userId,
          employeeName,
          employeeEmail,
          employeeDesignation,
          startDate: payload.startDate,
          endDate: payload.endDate,
          type: payload.type,
          reason: payload.reason,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }
      }

      if (typeof window !== 'undefined') {
        try {
          const prev: LeaveRequest[] = JSON.parse(localStorage.getItem('crm_hrms_leaves') || '[]')
          localStorage.setItem(
            'crm_hrms_leaves',
            JSON.stringify([created, ...prev.filter((l) => l.id !== created!.id)]),
          )
        } catch {}
      }
      return created
    },

    async reviewLeave(
      leaveId: string,
      payload: { status: 'approved' | 'rejected'; reviewNotes?: string },
    ): Promise<LeaveRequest> {
      let updated: LeaveRequest | null = null
      try {
        const res = await apiRequest<LeaveRequest>(`/hrms/leave/${leaveId}/status`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        updated = extractEntity<LeaveRequest>(res.data, 'leave')
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
          try {
            const res = await apiRequest<LeaveRequest>(`/hrms/leave/${leaveId}`, {
              method: 'PATCH',
              body: JSON.stringify(payload),
            })
            updated = extractEntity<LeaveRequest>(res.data, 'leave')
          } catch {}
        } else if (err instanceof ApiError && err.status >= 400 && err.status !== 0) {
          throw err
        }
      }

      const reviewedAt = new Date().toISOString()
      if (typeof window !== 'undefined') {
        try {
          const prev: LeaveRequest[] = JSON.parse(localStorage.getItem('crm_hrms_leaves') || '[]')
          const next = prev.map((l) =>
            l.id === leaveId
              ? {
                  ...l,
                  ...(updated || {}),
                  status: payload.status,
                  reviewNotes: payload.reviewNotes,
                  reviewedAt,
                }
              : l,
          )
          localStorage.setItem('crm_hrms_leaves', JSON.stringify(next))

          const reviews = JSON.parse(localStorage.getItem('crm_hrms_leave_reviews') || '{}')
          reviews[leaveId] = {
            status: payload.status,
            reviewNotes: payload.reviewNotes,
            reviewedAt,
          }
          localStorage.setItem('crm_hrms_leave_reviews', JSON.stringify(reviews))
        } catch {}
      }

      return (
        updated ||
        ({
          id: leaveId,
          status: payload.status,
          reviewNotes: payload.reviewNotes,
          reviewedAt,
        } as LeaveRequest)
      )
    },

    async getPermissions(params?: {
      status?: string
      userId?: string
    }): Promise<PermissionRequest[]> {
      const q = new URLSearchParams()
      if (params?.status && params.status !== 'all') q.set('status', params.status)
      if (params?.userId && params.userId !== 'all') q.set('userId', params.userId)
      const query = q.toString() ? `?${q.toString()}` : ''

      let apiList: PermissionRequest[] = []
      try {
        const res = await apiRequest<unknown>(`/hrms/permission${query}`)
        apiList = extractList<PermissionRequest>(res.data, 'permissions')
      } catch {}

      let localList: PermissionRequest[] = []
      let localReviews: Record<string, Partial<PermissionRequest>> = {}
      if (typeof window !== 'undefined') {
        try {
          localList = JSON.parse(localStorage.getItem('crm_hrms_permissions') || '[]')
          localReviews = JSON.parse(localStorage.getItem('crm_hrms_permission_reviews') || '{}')
        } catch {}
      }

      const normalizePerm = (p: PermissionRequest): PermissionRequest => {
        const rawUser = p.userId as unknown as
          | string
          | { id?: string; _id?: string; fullName?: string; email?: string; designation?: string }
        const userObj = typeof rawUser === 'object' && rawUser !== null ? rawUser : null
        const id = p.id || (p as PermissionRequest & { _id?: string })._id || ''
        const override = localReviews[id]
        const base: PermissionRequest = {
          ...p,
          id,
          userId: userObj ? String(userObj.id || userObj._id || '') : String(rawUser || ''),
          employeeName: p.employeeName || userObj?.fullName,
          employeeEmail: p.employeeEmail || userObj?.email,
          employeeDesignation: p.employeeDesignation || userObj?.designation,
        }
        if (override && base.status === 'pending') {
          return { ...base, ...override }
        }
        return base
      }

      const merged = new Map<string, PermissionRequest>()
      localList.map(normalizePerm).forEach((item) => {
        if (item.id) merged.set(item.id, item)
      })
      apiList.map(normalizePerm).forEach((item) => {
        if (item.id) merged.set(item.id, item)
      })

      let result = Array.from(merged.values()).sort((a, b) =>
        (b.createdAt || b.date).localeCompare(a.createdAt || a.date),
      )

      if (params?.status && params.status !== 'all') {
        result = result.filter((p) => p.status === params.status)
      }
      if (params?.userId && params.userId !== 'all') {
        result = result.filter((p) => p.userId === params.userId)
      }
      return result
    },

    async requestPermission(payload: {
      date: string
      type: PermissionType
      fromTime?: string
      toTime?: string
      reason: string
    }): Promise<PermissionRequest> {
      let created: PermissionRequest | null = null
      try {
        const res = await apiRequest<PermissionRequest>('/hrms/permission', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        created = extractEntity<PermissionRequest>(res.data, 'permission')
      } catch {}

      if (!created) {
        let userId = 'current'
        let employeeName = 'Employee'
        let employeeEmail = ''
        let employeeDesignation = ''
        if (typeof window !== 'undefined') {
          try {
            const u = JSON.parse(localStorage.getItem('crm_active_user') || '{}')
            userId = u.id || userId
            employeeName = u.fullName || employeeName
            employeeEmail = u.email || ''
            employeeDesignation = u.designation || ''
          } catch {}
        }
        created = {
          id: `perm-${Date.now()}`,
          userId,
          employeeName,
          employeeEmail,
          employeeDesignation,
          date: payload.date,
          type: payload.type,
          fromTime: payload.fromTime,
          toTime: payload.toTime,
          reason: payload.reason,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }
      }

      if (typeof window !== 'undefined') {
        try {
          const prev: PermissionRequest[] = JSON.parse(
            localStorage.getItem('crm_hrms_permissions') || '[]',
          )
          localStorage.setItem(
            'crm_hrms_permissions',
            JSON.stringify([created, ...prev.filter((p) => p.id !== created!.id)]),
          )
        } catch {}
      }
      return created
    },

    async reviewPermission(
      permissionId: string,
      payload: { status: 'approved' | 'rejected'; reviewNotes?: string },
    ): Promise<PermissionRequest> {
      let updated: PermissionRequest | null = null
      try {
        const res = await apiRequest<PermissionRequest>(`/hrms/permission/${permissionId}/status`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
        updated = extractEntity<PermissionRequest>(res.data, 'permission')
      } catch (err) {
        if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
          try {
            const res = await apiRequest<PermissionRequest>(`/hrms/permission/${permissionId}`, {
              method: 'PATCH',
              body: JSON.stringify(payload),
            })
            updated = extractEntity<PermissionRequest>(res.data, 'permission')
          } catch {}
        } else if (err instanceof ApiError && err.status >= 400 && err.status !== 0) {
          throw err
        }
      }

      const reviewedAt = new Date().toISOString()
      if (typeof window !== 'undefined') {
        try {
          const prev: PermissionRequest[] = JSON.parse(
            localStorage.getItem('crm_hrms_permissions') || '[]',
          )
          const next = prev.map((p) =>
            p.id === permissionId
              ? {
                  ...p,
                  ...(updated || {}),
                  status: payload.status,
                  reviewNotes: payload.reviewNotes,
                  reviewedAt,
                }
              : p,
          )
          localStorage.setItem('crm_hrms_permissions', JSON.stringify(next))

          const reviews = JSON.parse(localStorage.getItem('crm_hrms_permission_reviews') || '{}')
          reviews[permissionId] = {
            status: payload.status,
            reviewNotes: payload.reviewNotes,
            reviewedAt,
          }
          localStorage.setItem('crm_hrms_permission_reviews', JSON.stringify(reviews))
        } catch {}
      }

      return (
        updated ||
        ({
          id: permissionId,
          status: payload.status,
          reviewNotes: payload.reviewNotes,
          reviewedAt,
        } as PermissionRequest)
      )
    },

    async getSentMail(): Promise<HrmsMailRecord[]> {
      if (typeof window !== 'undefined') {
        try {
          return JSON.parse(localStorage.getItem('crm_hrms_mails') || '[]')
        } catch {}
      }
      return []
    },

    async sendMail(payload: {
      to: string
      subject: string
      html: string
    }): Promise<HrmsMailRecord> {
      let status: 'sent' | 'queued' = 'sent'
      try {
        await apiRequest<{ messageId?: string }>('/hrms/mail', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
      } catch (err) {
        if (err instanceof ApiError && err.status >= 400 && err.status !== 404 && err.status !== 405) {
          throw err
        }
        status = 'queued'
      }

      const record: HrmsMailRecord = {
        id: `mail-${Date.now()}`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        sentAt: new Date().toISOString(),
        status,
      }

      if (typeof window !== 'undefined') {
        try {
          const prev: HrmsMailRecord[] = JSON.parse(localStorage.getItem('crm_hrms_mails') || '[]')
          localStorage.setItem('crm_hrms_mails', JSON.stringify([record, ...prev]))
        } catch {}
      }
      return record
    },
  },
}
