# Lumos CRM — Backend API Specification & Developer Handover Document

> **Target Audience:** Backend Engineers / API Developers  
> **Frontend Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4  
> **API Architectural Style:** RESTful JSON API  
> **API Base URL Convention:** `/api/v1`  
> **Date of Specification:** November 2026  
> **Document Purpose:** Complete functional and technical contract between frontend and backend. Contains all required routes, request/response payloads, role-based access control, common response structures, and standardized error handling templates.

---

## Table of Contents

1. [Architectural Overview & Core Business Rules](#1-architectural-overview--core-business-rules)
2. [Global API Standards & Headers](#2-global-api-standards--headers)
3. [Standard Response Envelopes](#3-standard-response-envelopes)
   - 3.1 [Standard Success Response](#31-standard-success-response)
   - 3.2 [Standard Common Failure/Error Template](#32-standard-common-failureerror-template)
   - 3.3 [Common Error Scenarios & Templates](#33-common-error-scenarios--templates)
4. [Authentication & Authorization (RBAC)](#4-authentication--authorization-rbac)
   - 4.1 [Role & Permission Matrix](#41-role--permission-matrix)
   - 4.2 [Strict Data Privacy Safeguard (Client Masking)](#42-strict-data-privacy-safeguard-client-masking)
5. [Complete API Route Catalog](#5-complete-api-route-catalog)
   - 5.1 [Authentication & Session (`/api/v1/auth`)](#51-authentication--session)
   - 5.2 [Dashboard Metrics (`/api/v1/dashboard`)](#52-dashboard-metrics)
   - 5.3 [Client Management (`/api/v1/clients`)](#53-client-management)
   - 5.4 [Project Management (`/api/v1/projects`)](#54-project-management)
   - 5.5 [Doubts & Q&A Thread (`/api/v1/projects/:id/doubts` & `/api/v1/doubts`)](#55-doubts--qa-thread)
   - 5.6 [Internal Notes (`/api/v1/projects/:id/notes`)](#56-internal-notes)
   - 5.7 [Follow-Up Scheduler (`/api/v1/followups`)](#57-follow-up-scheduler)
   - 5.8 [In-App Notifications (`/api/v1/notifications`)](#58-in-app-notifications)
   - 5.9 [Employee Management (`/api/v1/employees`)](#59-employee-management)
   - 5.10 [Agency Analytics & Reports (`/api/v1/analytics`)](#510-agency-analytics--reports)
   - 5.11 [Agency Settings & Customizations (`/api/v1/settings`)](#511-agency-settings--customizations)
6. [Automated Cron Jobs & Background Tasks](#6-automated-cron-jobs--background-tasks)
7. [Database Entity Relationship Summary](#7-database-entity-relationship-summary)

---

## 1. Architectural Overview & Core Business Rules

Lumos CRM is a dedicated CRM and operations platform designed for a digital marketing agency.
The backend must enforce the following business fundamentals:

1. **Two Core User Roles:**
   - **`admin` (Agency Director / Head):** Single seeded super-admin account. Has unrestricted visibility and mutation rights over all clients, projects, financials, employees, doubts, analytics, and agency settings.
   - **`employee` (Staff / Specialists / Interns):** Restrained account created by Admin. Can ONLY view projects assigned to them.
2. **Strict Client Privacy Isolation (Critical Security Requirement):**
   - Employees must **NEVER** receive sensitive client personal information (`email`, `phone`, `address`, `notes`) over the network.
   - For employees, the backend must project only `{ id, fullName, companyName }`.
3. **Financial Confidentiality:**
   - Employees must **NEVER** see financial metrics (`budget`, `actualCost`, `profit`, agency revenue). These fields must be omitted or stripped by the serializer when an employee token requests project data.
4. **Project Pipeline Integrity:**
   - Defined pipeline: `new` → `in_progress` → `under_review` → `completed` → `delivered`.
   - Once a project moves to `delivered`, automated deadline reminder triggers for that project must be deactivated.
5. **No Self-Registration:**
   - Admin account is pre-seeded. Employees can only be registered by an Admin. Employees are assigned a temporary initial password and must change it on first login (`mustChangePassword: true`).

---

## 2. Global API Standards & Headers

- **Base Path:** `/api/v1`
- **Content Type:** `application/json; charset=utf-8`
- **Character Encoding:** UTF-8
- **Date & Time Format:** ISO 8601 extended strings (`YYYY-MM-DDTHH:mm:ss.sssZ`, UTC)
- **Currency Format:** All currency amounts are integer/floats in Indian Rupee (₹, INR).
- **Authentication Scheme:** `Authorization: Bearer <JWT_ACCESS_TOKEN>` or HTTP-only secure session cookies.
- **Pagination Standard:** Query parameters `?page=1&limit=10&sort=createdAt&order=desc`.

---

## 3. Standard Response Envelopes

Every single endpoint in the application **MUST** return a consistent, predictable JSON response envelope. The frontend relies on this deterministic wrapper.

### 3.1 Standard Success Response

Every successful request (HTTP 200, 201) returns this envelope:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 48,
    "totalPages": 5
  }
}
```

- `success` (boolean): Always `true` on 2xx responses.
- `message` (string): Human-readable summary suitable for toast notifications.
- `data` (object | array | null): The primary payload.
- `meta` (object, optional): Present on paginated list endpoints.

---

### 3.2 Standard Common Failure/Error Template

All error responses across all endpoints (4xx, 5xx) **MUST** strictly follow this exact same structure:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE_IDENTIFIER",
    "message": "Clear, user-friendly explanation of what went wrong.",
    "details": null,
    "timestamp": "2026-11-19T13:30:00.000Z",
    "path": "/api/v1/projects/proj-101"
  }
}
```

#### Fields Breakdown:
- `success`: Always `false`.
- `error.code`: A machine-readable string constant (e.g. `VALIDATION_ERROR`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `INTERNAL_SERVER_ERROR`).
- `error.message`: Developer and user-friendly explanation.
- `error.details`: `null` OR an array of structured field-level validation errors.
- `error.timestamp`: ISO 8601 timestamp when the failure occurred.
- `error.path`: The endpoint path that produced the error.

---

### 3.3 Common Error Scenarios & Templates

Backend developers do not need to invent unique error shapes per status code. Follow these standardized templates for common error conditions:

#### 1. Validation Error / Bad Request (HTTP 400)
Returned when input payload fails validation (missing required fields, malformed email, negative numbers, etc.):

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload. Please correct the highlighted errors.",
    "details": [
      {
        "field": "email",
        "issue": "Please provide a valid corporate email address."
      },
      {
        "field": "budget",
        "issue": "Budget must be a positive numeric value in INR."
      }
    ],
    "timestamp": "2026-11-19T13:30:00.000Z",
    "path": "/api/v1/projects"
  }
}
```

#### 2. Unauthorized / Authentication Failed (HTTP 401)
Returned when token is missing, expired, invalid, or login credentials do not match:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required or session has expired. Please log in again.",
    "details": null,
    "timestamp": "2026-11-19T13:30:00.000Z",
    "path": "/api/v1/auth/me"
  }
}
```

#### 3. Forbidden / Access Denied (HTTP 403)
Returned when an authenticated user attempts an action outside their role (e.g. employee trying to access `/api/v1/clients` or edit another employee's project):

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. You do not have permission to view or modify this resource.",
    "details": null,
    "timestamp": "2026-11-19T13:30:00.000Z",
    "path": "/api/v1/admin/employees"
  }
}
```

#### 4. Resource Not Found (HTTP 404)
Returned when an entity ID does not exist or has been deleted:

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "The requested project with ID 'proj-999' was not found.",
    "details": null,
    "timestamp": "2026-11-19T13:30:00.000Z",
    "path": "/api/v1/projects/proj-999"
  }
}
```

#### 5. Conflict / Business Rule Violation (HTTP 409)
Returned when an operation violates a business constraint (e.g., deleting a Service Category currently referenced by active projects, duplicate email):

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Cannot delete service category 'SEO' because it is actively assigned to 4 running projects.",
    "details": null,
    "timestamp": "2026-11-19T13:30:00.000Z",
    "path": "/api/v1/settings/categories/cat-1"
  }
}
```

#### 6. Request Timeout / Gateway Timeout (HTTP 408 / 504)
Returned if an upstream service (like email dispatch SMTP) or database lock times out:

```json
{
  "success": false,
  "error": {
    "code": "TIMEOUT_ERROR",
    "message": "The request timed out while waiting for a response. Please try again.",
    "details": null,
    "timestamp": "2026-11-19T13:30:00.000Z",
    "path": "/api/v1/auth/forgot-password"
  }
}
```

#### 7. Internal Server Error (HTTP 500)
Returned when an unexpected unhandled exception occurs. Never leak raw stack traces to the client:

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred on the server. Please contact support if the issue persists.",
    "details": null,
    "timestamp": "2026-11-19T13:30:00.000Z",
    "path": "/api/v1/analytics/overview"
  }
}
```

---

## 4. Authentication & Authorization (RBAC)

### 4.1 Role & Permission Matrix

| Module / Operation | Admin | Assigned Employee | Non-Assigned Employee |
|---|---|---|---|
| View All Clients (Full Contact Info) | ✅ Full | ❌ Forbidden | ❌ Forbidden |
| View Client Name + Company only | ✅ Full | ✅ Masked | ❌ Forbidden |
| Create / Edit Client | ✅ Full | ❌ Forbidden | ❌ Forbidden |
| View All Projects List | ✅ Full | ❌ Forbidden (Only assigned) | ❌ Forbidden |
| View Assigned Project Details | ✅ Full | ✅ Full (No financials) | ❌ Forbidden |
| View Project Financials (Budget, Cost, Profit) | ✅ Full | ❌ Forbidden | ❌ Forbidden |
| Create / Edit / Delete Project | ✅ Full | ❌ Forbidden | ❌ Forbidden |
| Update Project Pipeline Status | ✅ Any Status | ✅ Any Status | ❌ Forbidden |
| Raise Doubt on Project | ✅ Full | ✅ Own Project | ❌ Forbidden |
| Reply to Doubt | ✅ Full | ❌ Forbidden | ❌ Forbidden |
| Mark Doubt Resolved | ✅ Full | ✅ Own Doubt | ❌ Forbidden |
| Add Internal Project Note | ✅ Full | ✅ Own Project | ❌ Forbidden |
| Create Follow-Up | ✅ Any Client/Project | ✅ Assigned Project | ❌ Forbidden |
| View Follow-Up List | ✅ Full Agency | ✅ Only Assigned to Me | ❌ Forbidden |
| Toggle Follow-Up Status (`done`) | ✅ Full | ✅ Own Follow-up | ❌ Forbidden |
| Employee Management (CRUD, Pay Rates) | ✅ Full | ❌ Forbidden | ❌ Forbidden |
| Agency Analytics & Financial Reports | ✅ Full | ❌ Forbidden | ❌ Forbidden |
| Agency Settings (Categories, Reminders) | ✅ Full | ❌ Forbidden | ❌ Forbidden |

### 4.2 Strict Data Privacy Safeguard (Client Masking)

When the backend serializer prepares client data for an employee, it **must enforce this data transformation at the SQL/ORM query level**:

```typescript
// Admin receives full client:
{
  id: "client-1",
  fullName: "Vikram Malhotra",
  companyName: "Zenith Digital Ventures",
  email: "vikram@zenithventures.in",   // ADMIN ONLY
  phone: "+91 98201 44552",           // ADMIN ONLY
  address: "Bandra Kurla Complex, Mumbai", // ADMIN ONLY
  notes: "Prefers communication over email.", // ADMIN ONLY
  status: "active"
}

// Employee receives masked client projection:
{
  id: "client-1",
  fullName: "Vikram Malhotra",
  companyName: "Zenith Digital Ventures"
  // email, phone, address, and notes MUST be stripped
}
```

---

## 5. Complete API Route Catalog

Below is the definitive catalog of all endpoints required by the frontend application.

---

### 5.1 Authentication & Session

#### `POST /api/v1/auth/login`
- **Access:** Public
- **Description:** Authenticates either Admin or Employee credentials and creates a session.
- **Request Body:**
  ```json
  {
    "email": "admin@markcrm.com",
    "password": "adminSecretPassword123"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "admin",
        "email": "admin@markcrm.com",
        "fullName": "Rajesh Sharma",
        "role": "admin",
        "designation": "Agency Director & Head",
        "mustChangePassword": false
      }
    }
  }
  ```

#### `GET /api/v1/auth/me`
- **Access:** Authenticated (`admin` or `employee`)
- **Description:** Returns the current profile of the authenticated user from the token.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Current session fetched",
    "data": {
      "id": "emp-1",
      "email": "priya@markcrm.com",
      "fullName": "Priya Sharma",
      "role": "employee",
      "designation": "Senior SEO & Content Lead",
      "mustChangePassword": false
    }
  }
  ```

#### `POST /api/v1/auth/logout`
- **Access:** Authenticated
- **Description:** Invalidates token or clears session cookie.

#### `POST /api/v1/auth/forgot-password`
- **Access:** Public
- **Description:** Generates a secure, single-use password reset token and sends a reset link to the employee's registered email. (Link expires in 30 minutes).
- **Request Body:**
  ```json
  {
    "email": "priya@markcrm.com"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "If this email is registered, a password reset link has been sent.",
    "data": null
  }
  ```

#### `POST /api/v1/auth/reset-password`
- **Access:** Public (Token verified)
- **Description:** Verifies the reset token sent via email and sets a new password.
- **Request Body:**
  ```json
  {
    "token": "d7a46e91-88c2-40ab-96f3-348271e19481",
    "newPassword": "newSecurePassword2026!"
  }
  ```

#### `POST /api/v1/auth/change-password`
- **Access:** Authenticated
- **Description:** Allows authenticated users to change their password (required on first login if `mustChangePassword` is `true`).
- **Request Body:**
  ```json
  {
    "currentPassword": "initialPassword123",
    "newPassword": "myUpdatedStrongPassword2026!"
  }
  ```

---

### 5.2 Dashboard Metrics

#### `GET /api/v1/dashboard/admin`
- **Access:** Admin only
- **Description:** Returns the 6 high-level KPI cards and the live chronological activity feed for the Admin command center.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Admin dashboard metrics loaded",
    "data": {
      "metrics": {
        "overdueProjectsCount": 2,
        "upcomingDeadlinesCount": 3,
        "openDoubtsCount": 4,
        "pendingFollowupsTodayCount": 5,
        "activeProjectsCount": 11
      },
      "recentActivityFeed": [
        {
          "id": "act-1",
          "type": "status_changed",
          "description": "Priya Sharma updated project 'SEO Revamp' to In Progress",
          "timestamp": "2026-11-19T09:15:00.000Z",
          "projectId": "proj-1"
        },
        {
          "id": "act-2",
          "type": "doubt_raised",
          "description": "Arjun Mehta raised an urgent doubt on 'Black Friday Meta Ads'",
          "timestamp": "2026-11-19T08:30:00.000Z",
          "projectId": "proj-2"
        }
      ]
    }
  }
  ```

#### `GET /api/v1/dashboard/employee`
- **Access:** Employee only
- **Description:** Returns personal workload stats for the logged-in employee.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Employee dashboard metrics loaded",
    "data": {
      "myActiveProjectsCount": 4,
      "myOverdueProjectsCount": 0,
      "myUpcomingDeadlinesCount": 2,
      "myPendingFollowupsCount": 1,
      "myOpenDoubtsCount": 1,
      "recentAssignedProjects": [
        {
          "id": "proj-1",
          "name": "E-Commerce SEO Overhaul",
          "client": {
            "id": "client-1",
            "fullName": "Vikram Malhotra",
            "companyName": "Zenith Digital"
          },
          "status": "in_progress",
          "deliveryDate": "2026-11-25T18:00:00.000Z",
          "priority": "high"
        }
      ]
    }
  }
  ```

---

### 5.3 Client Management

#### `GET /api/v1/clients`
- **Access:** Admin only (Employees forbidden)
- **Query Parameters:** `?search=zenith&status=active&page=1&limit=10`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Clients retrieved successfully",
    "data": [
      {
        "id": "client-1",
        "fullName": "Vikram Malhotra",
        "companyName": "Zenith Digital Ventures",
        "email": "vikram@zenithventures.in",
        "phone": "+91 98201 44552",
        "address": "Bandra Kurla Complex, Mumbai, MH",
        "notes": "Fast approvals. Prefers bi-weekly status updates.",
        "status": "active",
        "totalProjects": 3,
        "lastProjectDate": "2026-11-10T00:00:00.000Z",
        "createdAt": "2026-06-15T10:00:00.000Z",
        "updatedAt": "2026-11-15T12:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

#### `GET /api/v1/clients/:id`
- **Access:** Admin only
- **Description:** Full 360-degree client profile including projects breakdown, billing metrics, notes, and follow-ups.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Client detail retrieved",
    "data": {
      "client": {
        "id": "client-1",
        "fullName": "Vikram Malhotra",
        "companyName": "Zenith Digital Ventures",
        "email": "vikram@zenithventures.in",
        "phone": "+91 98201 44552",
        "address": "Bandra Kurla Complex, Mumbai, MH",
        "notes": "Prefers communication over email.",
        "status": "active",
        "createdAt": "2026-06-15T10:00:00.000Z",
        "updatedAt": "2026-11-15T12:00:00.000Z"
      },
      "summary": {
        "totalProjects": 3,
        "deliveredProjects": 1,
        "inProgressProjects": 2,
        "totalBilled": 125000,
        "totalCost": 48000,
        "netProfit": 77000
      },
      "projects": [
        {
          "id": "proj-1",
          "name": "E-Commerce SEO Overhaul",
          "status": "in_progress",
          "priority": "high",
          "budget": 45000,
          "actualCost": 18000,
          "deliveryDate": "2026-11-25T00:00:00.000Z"
        }
      ],
      "followUps": [
        {
          "id": "fu-1",
          "scheduledAt": "2026-11-20T10:00:00.000Z",
          "status": "pending",
          "notes": "Discuss Q1 2027 retainer contract"
        }
      ]
    }
  }
  ```

#### `POST /api/v1/clients`
- **Access:** Admin only
- **Request Body:**
  ```json
  {
    "fullName": "Aakash Verma",
    "companyName": "Verma Logistics & Retail",
    "email": "aakash@vermalogistics.com",
    "phone": "+91 98112 34567",
    "address": "Connaught Place, New Delhi",
    "notes": "Initial inquiry from LinkedIn lead gen."
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Client registered successfully",
    "data": {
      "id": "client-15",
      "fullName": "Aakash Verma",
      "companyName": "Verma Logistics & Retail",
      "email": "aakash@vermalogistics.com",
      "phone": "+91 98112 34567",
      "address": "Connaught Place, New Delhi",
      "notes": "Initial inquiry from LinkedIn lead gen.",
      "status": "active",
      "createdAt": "2026-11-19T13:30:00.000Z",
      "updatedAt": "2026-11-19T13:30:00.000Z"
    }
  }
  ```

#### `PUT /api/v1/clients/:id`
- **Access:** Admin only
- **Description:** Updates client info.

#### `PATCH /api/v1/clients/:id/status`
- **Access:** Admin only
- **Request Body:** `{ "status": "inactive" }`

---

### 5.4 Project Management

#### `GET /api/v1/projects`
- **Access:** Authenticated (`admin` or `employee`)
- **Query Parameters:**
  - `status`: `new` | `in_progress` | `under_review` | `completed` | `delivered` | `all`
  - `priority`: `low` | `medium` | `high` | `urgent`
  - `categoryId`: filter by Service Category ID
  - `employeeId`: filter by assigned employee (Admin only)
  - `search`: string matching project name or client name
  - `filter`: `overdue` | `upcoming` | `all`
- **Note on Employee Access:** If called by an Employee token, the backend **MUST** automatically restrict the result set to projects where `primaryEmployeeId = user.id` OR `additionalMemberIds CONTAINS user.id`. Financial fields must be hidden and client fields must be masked.
- **Success Response (200 OK - Admin View):**
  ```json
  {
    "success": true,
    "message": "Projects fetched successfully",
    "data": [
      {
        "id": "proj-1",
        "name": "E-Commerce SEO Overhaul",
        "client": {
          "id": "client-1",
          "fullName": "Vikram Malhotra",
          "companyName": "Zenith Digital Ventures",
          "email": "vikram@zenithventures.in",
          "phone": "+91 98201 44552"
        },
        "serviceCategories": [
          { "id": "cat-1", "name": "SEO", "color": "#3b82f6" }
        ],
        "description": "Comprehensive technical SEO and backlink strategy.",
        "budget": 45000,
        "actualCost": 18000,
        "startDate": "2026-11-01T00:00:00.000Z",
        "deliveryDate": "2026-11-25T18:00:00.000Z",
        "priority": "high",
        "status": "in_progress",
        "primaryEmployee": {
          "id": "emp-1",
          "fullName": "Priya Sharma",
          "designation": "Senior SEO Lead"
        },
        "additionalMembers": [],
        "createdAt": "2026-11-01T10:00:00.000Z",
        "updatedAt": "2026-11-15T14:30:00.000Z"
      }
    ],
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
  }
  ```

- **Success Response (200 OK - Employee View):**
  ```json
  {
    "success": true,
    "message": "Assigned projects fetched successfully",
    "data": [
      {
        "id": "proj-1",
        "name": "E-Commerce SEO Overhaul",
        "client": {
          "id": "client-1",
          "fullName": "Vikram Malhotra",
          "companyName": "Zenith Digital Ventures"
        },
        "serviceCategories": [
          { "id": "cat-1", "name": "SEO", "color": "#3b82f6" }
        ],
        "description": "Comprehensive technical SEO and backlink strategy.",
        "startDate": "2026-11-01T00:00:00.000Z",
        "deliveryDate": "2026-11-25T18:00:00.000Z",
        "priority": "high",
        "status": "in_progress",
        "createdAt": "2026-11-01T10:00:00.000Z",
        "updatedAt": "2026-11-15T14:30:00.000Z"
      }
    ]
  }
  ```

#### `GET /api/v1/projects/:id`
- **Access:** Admin OR Assigned Employee
- **Description:** Complete detail of a single project.
- **Success Response (200 OK - Admin View):**
  ```json
  {
    "success": true,
    "message": "Project detail retrieved",
    "data": {
      "id": "proj-1",
      "name": "E-Commerce SEO Overhaul",
      "clientId": "client-1",
      "client": {
        "id": "client-1",
        "fullName": "Vikram Malhotra",
        "companyName": "Zenith Digital Ventures",
        "email": "vikram@zenithventures.in",
        "phone": "+91 98201 44552",
        "address": "Bandra Kurla Complex, Mumbai"
      },
      "serviceCategories": ["cat-1"],
      "description": "Fix crawling indexing issues, boost Core Web Vitals score.",
      "budget": 45000,
      "actualCost": 18000,
      "profit": 27000,
      "profitMargin": 60,
      "startDate": "2026-11-01T00:00:00.000Z",
      "deliveryDate": "2026-11-25T18:00:00.000Z",
      "priority": "high",
      "status": "in_progress",
      "primaryEmployeeId": "emp-1",
      "additionalMemberIds": ["emp-2"],
      "reminderOverrides": [
        { "daysBeforeDeadline": 5 },
        { "daysBeforeDeadline": 2 },
        { "daysBeforeDeadline": 0 }
      ],
      "createdAt": "2026-11-01T10:00:00.000Z",
      "updatedAt": "2026-11-15T14:30:00.000Z"
    }
  }
  ```

#### `POST /api/v1/projects`
- **Access:** Admin only
- **Request Body:**
  ```json
  {
    "name": "Winter Sale Meta Ads Campaign",
    "clientId": "client-1",
    "serviceCategories": ["cat-2"],
    "description": "High-ROAS retargeting and acquisition ads for Black Friday / Winter.",
    "budget": 35000,
    "actualCost": 12000,
    "startDate": "2026-11-20T00:00:00.000Z",
    "deliveryDate": "2026-12-05T18:00:00.000Z",
    "priority": "urgent",
    "primaryEmployeeId": "emp-2",
    "additionalMemberIds": ["emp-1"],
    "reminderOverrides": null
  }
  ```
- **Success Response (201 Created):** Returns the created project object with initial status `new`.

#### `PUT /api/v1/projects/:id`
- **Access:** Admin only
- **Description:** Update core project metadata.

#### `PATCH /api/v1/projects/:id/status`
- **Access:** Admin OR Assigned Employee
- **Description:** Updates the project status along the pipeline. Auto-logs an activity event and checks if reminders should stop.
- **Request Body:**
  ```json
  {
    "status": "under_review"
  }
  ```
- **Valid Values:** `'new' | 'in_progress' | 'under_review' | 'completed' | 'delivered'`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Project status updated to 'under_review'",
    "data": {
      "id": "proj-1",
      "status": "under_review",
      "updatedAt": "2026-11-19T13:45:00.000Z"
    }
  }
  ```

#### `PATCH /api/v1/projects/:id/financials`
- **Access:** Admin only
- **Request Body:**
  ```json
  {
    "budget": 50000,
    "actualCost": 21000
  }
  ```

#### `PATCH /api/v1/projects/:id/reminders`
- **Access:** Admin only
- **Description:** Customizes deadline reminder milestones for this specific project (overriding global settings).
- **Request Body:**
  ```json
  {
    "reminderOverrides": [
      { "daysBeforeDeadline": 7 },
      { "daysBeforeDeadline": 3 },
      { "daysBeforeDeadline": 1 }
    ]
  }
  ```

---

### 5.5 Doubts & Q&A Thread

#### `GET /api/v1/projects/:projectId/doubts`
- **Access:** Admin OR Assigned Employee
- **Query Parameters:** `?status=open` or `?status=all`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Doubts retrieved",
    "data": [
      {
        "id": "dbt-101",
        "projectId": "proj-1",
        "raisedById": "emp-1",
        "raisedByName": "Priya Sharma",
        "subject": "Missing Google Search Console Verification",
        "description": "Client has not delegated DNS access or GSC property owner permissions yet.",
        "priority": "urgent",
        "status": "open",
        "adminReply": null,
        "adminRepliedAt": null,
        "createdAt": "2026-11-19T10:00:00.000Z",
        "resolvedAt": null
      }
    ]
  }
  ```

#### `POST /api/v1/projects/:projectId/doubts`
- **Access:** Admin OR Assigned Employee
- **Description:** Raises a new doubt. Triggers in-app notification + email to Admin if raised by employee.
- **Request Body:**
  ```json
  {
    "subject": "Need brand assets for carousel ads",
    "description": "The client logo uploaded is low resolution. Can we request SVG/vector files?",
    "priority": "normal"
  }
  ```
- **Success Response (201 Created):**
  ```json
  {
    "success": true,
    "message": "Doubt submitted to agency admin",
    "data": {
      "id": "dbt-102",
      "projectId": "proj-1",
      "raisedById": "emp-2",
      "subject": "Need brand assets for carousel ads",
      "description": "The client logo uploaded is low resolution...",
      "priority": "normal",
      "status": "open",
      "createdAt": "2026-11-19T13:40:00.000Z"
    }
  }
  ```

#### `POST /api/v1/doubts/:id/reply`
- **Access:** Admin only
- **Description:** Admin writes a resolution/reply. Triggers in-app notification + email to the employee who raised it.
- **Request Body:**
  ```json
  {
    "reply": "I have requested vector assets from Vikram; use the temporary SVG in Google Drive folder until then."
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Reply sent successfully",
    "data": {
      "id": "dbt-102",
      "adminReply": "I have requested vector assets...",
      "adminRepliedAt": "2026-11-19T14:00:00.000Z"
    }
  }
  ```

#### `PATCH /api/v1/doubts/:id/resolve`
- **Access:** Admin OR Employee who raised the doubt
- **Description:** Marks the doubt as resolved.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Doubt marked as resolved",
    "data": {
      "id": "dbt-102",
      "status": "resolved",
      "resolvedAt": "2026-11-19T14:15:00.000Z"
    }
  }
  ```

---

### 5.6 Internal Notes

#### `GET /api/v1/projects/:projectId/notes`
- **Access:** Admin OR Assigned Employee
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Notes retrieved",
    "data": [
      {
        "id": "note-1",
        "projectId": "proj-1",
        "authorId": "admin",
        "authorType": "admin",
        "authorName": "Rajesh Sharma",
        "content": "Client requested to prioritize the mobile menu Core Web Vitals first.",
        "createdAt": "2026-11-16T11:00:00.000Z"
      }
    ]
  }
  ```

#### `POST /api/v1/projects/:projectId/notes`
- **Access:** Admin OR Assigned Employee
- **Request Body:**
  ```json
  {
    "content": "Submitted meta robots test report to client staging environment."
  }
  ```
- **Success Response (201 Created):** Returns created note object with timestamp and logged-in author metadata.

---

### 5.7 Follow-Up Scheduler

#### `GET /api/v1/followups`
- **Access:** Authenticated (`admin` sees all, `employee` sees only follow-ups assigned to them)
- **Query Parameters:** `?status=pending&dateFrom=2026-11-01&dateTo=2026-11-30&assignedTo=emp-1`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Follow-ups fetched",
    "data": [
      {
        "id": "fu-1",
        "projectId": "proj-1",
        "projectName": "E-Commerce SEO Overhaul",
        "clientId": "client-1",
        "clientName": "Vikram Malhotra",
        "clientCompany": "Zenith Digital Ventures",
        "scheduledAt": "2026-11-20T10:00:00.000Z",
        "assignedToId": "emp-1",
        "assignedToName": "Priya Sharma",
        "notes": "Call client to confirm analytics access approval.",
        "status": "pending",
        "createdAt": "2026-11-18T16:00:00.000Z"
      }
    ]
  }
  ```

#### `POST /api/v1/followups`
- **Access:** Admin OR Assigned Employee
- **Request Body:**
  ```json
  {
    "projectId": "proj-1",
    "clientId": "client-1",
    "scheduledAt": "2026-11-22T09:30:00.000Z",
    "assignedToId": "emp-1",
    "notes": "Follow up regarding creative copy approvals."
  }
  ```
- **Success Response (201 Created):** Returns created follow-up with status `'pending'`.

#### `PATCH /api/v1/followups/:id/status`
- **Access:** Admin OR Assigned Employee
- **Request Body:**
  ```json
  {
    "status": "done"
  }
  ```
- **Valid Values:** `'pending' | 'done' | 'missed'`
- **Success Response (200 OK):** Returns updated follow-up object.

#### `DELETE /api/v1/followups/:id`
- **Access:** Admin only

---

### 5.8 In-App Notifications

#### `GET /api/v1/notifications`
- **Access:** Authenticated
- **Description:** Returns the active notifications for the current authenticated user.
- **Query Parameters:** `?unreadOnly=true`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Notifications fetched",
    "data": [
      {
        "id": "notif-1",
        "recipientId": "emp-1",
        "type": "deadline_reminder",
        "title": "Deadline Reminder: 3 Days Left",
        "message": "Project 'E-Commerce SEO Overhaul' is due on 25 Nov 2026.",
        "relatedProjectId": "proj-1",
        "read": false,
        "createdAt": "2026-11-19T09:00:00.000Z"
      }
    ]
  }
  ```

#### `PATCH /api/v1/notifications/:id/read`
- **Access:** Authenticated (Owner of notification)
- **Description:** Marks a single notification as read.

#### `PATCH /api/v1/notifications/read-all`
- **Access:** Authenticated
- **Description:** Marks all notifications for the authenticated user as read.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "All notifications marked as read",
    "data": { "markedCount": 6 }
  }
  ```

---

### 5.9 Employee Management

#### `GET /api/v1/employees`
- **Access:** Admin only
- **Query Parameters:** `?search=priya&status=active&payType=salary`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Employees list fetched",
    "data": [
      {
        "id": "emp-1",
        "fullName": "Priya Sharma",
        "email": "priya@markcrm.com",
        "phone": "+91 98765 43210",
        "designation": "Senior SEO & Content Lead",
        "payType": "salary",
        "payRate": 65000,
        "joinDate": "2025-03-01T00:00:00.000Z",
        "status": "active",
        "mustChangePassword": false,
        "assignedProjectsCount": 4,
        "createdAt": "2025-03-01T10:00:00.000Z"
      }
    ]
  }
  ```

#### `GET /api/v1/employees/:id`
- **Access:** Admin only
- **Description:** Comprehensive employee performance profile.
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Employee details retrieved",
    "data": {
      "employee": {
        "id": "emp-1",
        "fullName": "Priya Sharma",
        "email": "priya@markcrm.com",
        "phone": "+91 98765 43210",
        "designation": "Senior SEO & Content Lead",
        "payType": "salary",
        "payRate": 65000,
        "joinDate": "2025-03-01T00:00:00.000Z",
        "status": "active",
        "mustChangePassword": false,
        "notes": "Handles high-tier clients and multi-language SEO."
      },
      "performance": {
        "totalProjectsHandled": 14,
        "completedOnTime": 13,
        "onTimeRate": 92.8,
        "openDoubts": 1,
        "avgDurationDays": 24
      },
      "assignedProjects": [
        {
          "id": "proj-1",
          "name": "E-Commerce SEO Overhaul",
          "clientName": "Zenith Digital Ventures",
          "status": "in_progress",
          "deliveryDate": "2026-11-25T00:00:00.000Z"
        }
      ]
    }
  }
  ```

#### `POST /api/v1/employees`
- **Access:** Admin only
- **Request Body:**
  ```json
  {
    "fullName": "Kavita Reddy",
    "email": "kavita@markcrm.com",
    "phone": "+91 98450 11223",
    "designation": "Social Media Strategist",
    "payType": "salary",
    "payRate": 48000,
    "joinDate": "2026-12-01T00:00:00.000Z",
    "initialPassword": "TempPassword@2026",
    "notes": "Experience in D2C beauty and wellness brands."
  }
  ```
- **Backend Action:** Hash `initialPassword` with bcrypt/argon2, set `mustChangePassword = true`, and record creation.
- **Success Response (201 Created):** Returns created employee record (without password hash).

#### `PUT /api/v1/employees/:id`
- **Access:** Admin only
- **Description:** Edit employee details (designation, salary/rate, phone, notes).

#### `PATCH /api/v1/employees/:id/status`
- **Access:** Admin only
- **Description:** Deactivates or reactivates employee account. Deactivated employees cannot log in.
- **Request Body:** `{ "status": "inactive" }`

---

### 5.10 Agency Analytics & Reports

#### `GET /api/v1/analytics/overview`
- **Access:** Admin only
- **Query Parameters:** `?range=month` | `quarter` | `year` | `all`
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Financial overview retrieved",
    "data": {
      "totalRevenue": 1060000,
      "totalCost": 477000,
      "netProfit": 583000,
      "profitMargin": 55,
      "monthlyTrends": [
        { "month": "Aug 2026", "revenue": 180000, "cost": 95000, "profit": 85000 },
        { "month": "Sep 2026", "revenue": 240000, "cost": 110000, "profit": 130000 },
        { "month": "Oct 2026", "revenue": 310000, "cost": 140000, "profit": 170000 },
        { "month": "Nov 2026", "revenue": 330000, "cost": 132000, "profit": 198000 }
      ],
      "categoryDistribution": [
        { "categoryName": "SEO", "color": "#3b82f6", "count": 6, "totalBudget": 290000 },
        { "categoryName": "Social Media Marketing", "color": "#8b5cf6", "count": 4, "totalBudget": 180000 }
      ],
      "clientRetention": {
        "newClients": 6,
        "returningClients": 4,
        "retentionRate": 40,
        "topClients": [
          {
            "clientId": "client-1",
            "clientName": "Vikram Malhotra",
            "companyName": "Zenith Digital Ventures",
            "totalProjects": 3,
            "totalValue": 125000
          }
        ]
      },
      "employeeLeaderboard": [
        {
          "employeeId": "emp-1",
          "employeeName": "Priya Sharma",
          "totalProjects": 14,
          "completedOnTime": 13,
          "onTimeRate": 92.8,
          "openDoubts": 1,
          "avgDurationDays": 24
        }
      ],
      "followUpPerformance": {
        "totalScheduled": 24,
        "completed": 20,
        "missed": 2,
        "pending": 2,
        "completionRate": 83.3
      }
    }
  }
  ```

---

### 5.11 Agency Settings & Customizations

#### `GET /api/v1/settings/categories`
- **Access:** Authenticated (Used across forms by both admin and employee)
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Service categories loaded",
    "data": [
      { "id": "cat-1", "name": "SEO", "color": "#3b82f6", "isDefault": true },
      { "id": "cat-2", "name": "Social Media Marketing", "color": "#8b5cf6", "isDefault": true },
      { "id": "cat-3", "name": "PPC & Google Ads", "color": "#10b981", "isDefault": true },
      { "id": "cat-4", "name": "Content Writing", "color": "#f59e0b", "isDefault": true },
      { "id": "cat-5", "name": "Web Design & Dev", "color": "#06b6d4", "isDefault": true },
      { "id": "cat-6", "name": "Email Marketing", "color": "#ec4899", "isDefault": true }
    ]
  }
  ```

#### `POST /api/v1/settings/categories`
- **Access:** Admin only
- **Request Body:** `{ "name": "Influencer Outreach", "color": "#e11d48" }`

#### `DELETE /api/v1/settings/categories/:id`
- **Access:** Admin only
- **Conflict Rule:** If any project has this category ID in its `serviceCategories` array, the backend **MUST** abort and return `409 CONFLICT` with the message: *"Cannot delete service category because it is in use by active projects."*

#### `GET /api/v1/settings/reminders`
- **Access:** Admin only
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Global reminder settings fetched",
    "data": {
      "reminders": [
        { "daysBeforeDeadline": 3 },
        { "daysBeforeDeadline": 2 },
        { "daysBeforeDeadline": 1 },
        { "daysBeforeDeadline": 0 }
      ]
    }
  }
  ```

#### `PUT /api/v1/settings/reminders`
- **Access:** Admin only
- **Request Body:**
  ```json
  {
    "reminders": [
      { "daysBeforeDeadline": 7 },
      { "daysBeforeDeadline": 3 },
      { "daysBeforeDeadline": 1 },
      { "daysBeforeDeadline": 0 }
    ]
  }
  ```

#### `GET /api/v1/settings/notifications`
- **Access:** Admin only
- **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Email notification preferences fetched",
    "data": {
      "emailDeadlineReminders": true,
      "emailOverdueAlerts": true,
      "emailDoubtAlerts": true,
      "emailFollowupReminders": true
    }
  }
  ```

#### `PUT /api/v1/settings/notifications`
- **Access:** Admin only
- **Request Body:**
  ```json
  {
    "emailDeadlineReminders": true,
    "emailOverdueAlerts": true,
    "emailDoubtAlerts": false,
    "emailFollowupReminders": true
  }
  ```

---

## 6. Automated Cron Jobs & Background Tasks

The backend server or worker queue (e.g. BullMQ, Celery, AWS EventBridge, or cron) must execute these scheduled tasks:

### Task 1: Daily Deadline Reminders (Runs daily at 09:00 AM UTC/IST)
- **Logic:**
  1. Query active projects where `status != 'delivered'` and `status != 'completed'`.
  2. For each project, determine the effective reminder milestone array (use `reminderOverrides` if present; otherwise use the global settings).
  3. Calculate `daysUntil = differenceInDays(deliveryDate, today)`.
  4. If `daysUntil` matches any milestone in the project's reminder schedule:
     - Create an `AppNotification` for the assigned employee(s) and admin: `type = 'deadline_reminder'`.
     - If agency email notification toggle is enabled, dispatch an email notification to the assigned employee(s) and admin.

### Task 2: Daily Overdue Project Alerts (Runs daily at 09:00 AM)
- **Logic:**
  1. Query projects where `deliveryDate < today` and `status != 'delivered'`.
  2. **Day 1 Overdue:** Alert both the assigned employee(s) and admin (in-app + email).
  3. **Days 2+ Overdue:** Alert **admin only** daily to avoid spamming the employee.

### Task 3: Follow-Up Scheduler Monitor (Runs every 15–30 minutes)
- **Logic:**
  1. Query follow-ups where `status == 'pending'` and `scheduledAt <= now()`.
  2. Send in-app notification: `type = 'followup_due'`.
  3. Dispatch email with client name, project name, and notes to the assigned employee and admin.
  4. If a follow-up passes its scheduled date by > 24 hours without being marked `done`, automatically flag status as `'missed'`.

---

## 7. Database Entity Relationship Summary

Backend developers can use PostgreSQL / MySQL with Prisma, Drizzle, or TypeORM. Below is the relational mapping:

- **User / Employee:**
  - `id` (PK, text/uuid)
  - `email` (unique, varchar)
  - `passwordHash` (varchar)
  - `role` (enum: `'admin' | 'employee'`)
  - `fullName`, `phone`, `designation`
  - `payType` (enum: `'salary' | 'intern' | 'hourly'`), `payRate` (numeric)
  - `mustChangePassword` (boolean)
  - `status` (enum: `'active' | 'inactive'`)

- **Client:**
  - `id` (PK, text/uuid)
  - `fullName`, `companyName` (varchar)
  - `email`, `phone`, `address`, `notes` (text)
  - `status` (enum: `'active' | 'inactive'`)

- **Project:**
  - `id` (PK, text/uuid)
  - `name` (varchar), `description` (text)
  - `clientId` (FK -> Client.id)
  - `budget` (numeric), `actualCost` (numeric, nullable)
  - `startDate` (timestamp), `deliveryDate` (timestamp)
  - `priority` (enum: `'low' | 'medium' | 'high' | 'urgent'`)
  - `status` (enum: `'new' | 'in_progress' | 'under_review' | 'completed' | 'delivered'`)
  - `primaryEmployeeId` (FK -> User.id, nullable)
  - `additionalMemberIds` (text[] or M:N join table)
  - `serviceCategories` (text[] or M:N join table -> ServiceCategory.id)
  - `reminderOverrides` (jsonb, nullable)

- **Doubt:**
  - `id` (PK, text/uuid)
  - `projectId` (FK -> Project.id)
  - `raisedById` (FK -> User.id)
  - `subject` (varchar), `description` (text)
  - `priority` (enum: `'normal' | 'urgent'`)
  - `status` (enum: `'open' | 'resolved'`)
  - `adminReply` (text, nullable), `adminRepliedAt` (timestamp, nullable)

- **Note:**
  - `id` (PK, text/uuid)
  - `projectId` (FK -> Project.id)
  - `authorId` (FK -> User.id)
  - `authorType` (enum: `'admin' | 'employee'`)
  - `content` (text)

- **FollowUp:**
  - `id` (PK, text/uuid)
  - `projectId` (FK -> Project.id)
  - `clientId` (FK -> Client.id)
  - `assignedToId` (FK -> User.id)
  - `scheduledAt` (timestamp)
  - `notes` (text, nullable)
  - `status` (enum: `'pending' | 'done' | 'missed'`)

- **AppNotification:**
  - `id` (PK, text/uuid)
  - `recipientId` (FK -> User.id)
  - `type` (enum)
  - `title`, `message` (varchar)
  - `relatedProjectId` (FK -> Project.id, nullable)
  - `read` (boolean, default false)

---

## 8. Frontend Integration Verification Checklist

When backend routes are deployed, verify against this checklist before handing off:
- [ ] Any request without `Authorization` header on protected routes returns HTTP 401 with standard error envelope.
- [ ] Employees attempting to access `/api/v1/clients` or `/api/v1/employees` receive HTTP 403 Forbidden.
- [ ] Employees calling `GET /api/v1/projects` or `GET /api/v1/projects/:id` **never** receive client phone/email or project budget/costs in the response JSON.
- [ ] Moving project status to `'delivered'` cancels pending deadline reminder triggers.
- [ ] Service category deletion returns HTTP 409 Conflict if actively used by any project.
- [ ] Password reset token expires after 30 minutes.
- [ ] All error responses match the common `{ success: false, error: { code, message, details, timestamp, path } }` structure.

---
*End of Backend Handover Specification. For questions or adjustments, refer to the frontend source in `app/` and `lib/types.ts`.*
