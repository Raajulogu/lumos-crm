# Digital Marketing Agency CRM — Product Requirements Document

> **Scope:** Frontend only. All data mocked during frontend dev. Backend integration phase follows after all modules are UI-complete.
> **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4
> **Last Updated:** November 2026

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [User Roles & Access Control](#2-user-roles--access-control)
3. [Authentication & Account Management](#3-authentication--account-management)
4. [Module Breakdown](#4-module-breakdown)
   - 4.1 [Admin Dashboard](#41-admin-dashboard)
   - 4.2 [Client Management](#42-client-management)
   - 4.3 [Project Management](#43-project-management)
   - 4.4 [Doubts & Internal Communication](#44-doubts--internal-communication)
   - 4.5 [Follow-Up Scheduler](#45-follow-up-scheduler)
   - 4.6 [Notification & Reminder System](#46-notification--reminder-system)
   - 4.7 [Employee Management](#47-employee-management)
   - 4.8 [Analytics](#48-analytics)
   - 4.9 [Settings & Customization](#49-settings--customization)
   - 4.10 [Employee Dashboard](#410-employee-dashboard)
5. [Data Models](#5-data-models)
6. [Build Order (Phase Plan)](#6-build-order-phase-plan)
7. [Design & UX Rules](#7-design--ux-rules)

---

## 1. Product Vision

A purpose-built CRM for a **digital marketing agency** to:

- Onboard new and returning clients and log their project requirements
- Assign projects to employees (full-time, intern, or hourly)
- Track project progress through a defined status pipeline
- Automatically send deadline reminder emails to employees and admin
- Schedule follow-ups with clients and get reminded on the right date
- Let employees raise doubts internally on their assigned projects
- Give the admin full visibility into clients, projects, employees, and profits
- Restrict employees to only see their own work — no client personal details

**What this is NOT (out of scope for now):**
- No client-facing portal — clients never log in
- No file uploads or attachments
- No SMS / WhatsApp notifications
- No attendance or payroll calculation

---

## 2. User Roles & Access Control

### 2.1 — Role Summary

| Feature / Data | Admin | Employee |
|---|---|---|
| View all clients | ✅ | ❌ |
| View assigned clients | ✅ | ✅ (name + company only) |
| See client contact details (phone, email, address) | ✅ | ❌ |
| Create / edit clients | ✅ | ❌ |
| Create / edit projects | ✅ | ❌ |
| View all projects | ✅ | ❌ |
| View assigned projects | ✅ | ✅ |
| Update project status | ✅ | ✅ (own projects only) |
| Raise doubts on a project | ✅ | ✅ (own projects only) |
| Reply to doubts | ✅ | ✅ (own projects only) |
| Manage employees | ✅ | ❌ |
| View employee list | ✅ | ❌ |
| View analytics | ✅ | ❌ |
| Manage service categories | ✅ | ❌ |
| Manage reminder settings | ✅ | ❌ |
| Change own password | ✅ | ✅ (via email token) |
| Follow-up scheduler | ✅ | ✅ (own follow-ups only) |
| Receive deadline reminder emails | ✅ | ✅ (own projects) |
| Receive follow-up notifications | ✅ | ✅ (own follow-ups) |
| In-app notifications | ✅ | ✅ |

### 2.2 — There is ONE admin account

- One login for the company head / admin
- Admin account is set up during initial app setup (not self-registered)
- Admin cannot be deleted

---

## 3. Authentication & Account Management

### 3.1 — Admin Login
- Email + Password
- Standard session-based login
- No self-registration — admin is seeded

### 3.2 — Employee Login
- Email + Password (password created by admin when creating employee account)
- Employee cannot self-register

### 3.3 — Employee Password Change
- Employee can reset password via **email token verification** only
- Flow: Enter registered email → receive token link → set new password
- No security questions, no phone OTP

### 3.4 — Session & Security
- Role stored in session — pages are protected by role
- `/admin/*` routes — admin only
- `/employee/*` routes — employee only
- Shared login page at `/login`

---

## 4. Module Breakdown

---

### 4.1 Admin Dashboard

**Route:** `/admin/dashboard`

**Purpose:** First screen admin sees after login — a situational awareness overview.

#### Widgets / Sections

| Widget | What It Shows |
|---|---|
| **Overdue Projects** | Count of projects past their delivery date without "Delivered" status |
| **Upcoming Deadlines** | Projects due in the next 7 days |
| **Unread Doubts** | Total unread employee doubts across all projects |
| **Follow-ups Today** | Follow-ups scheduled for today |
| **Active Projects** | Total projects currently in progress |
| **Recent Activity Feed** | Last 10 status changes, doubts raised, notes added |

#### Quick Actions (from dashboard)
- ➕ Add New Client
- ➕ Add New Project
- 🔔 View all notifications

---

### 4.2 Client Management

**Routes:** `/admin/clients` (list) · `/admin/clients/new` · `/admin/clients/[id]`

#### Client List View
- Table with columns: Name, Company, Phone, Email, Total Projects, Last Project Date, Status (Active/Inactive)
- Search by name or company
- Filter by status
- Click row → go to client detail

#### Add New Client Form

**Required fields:**
- Full Name *
- Company Name *
- Email *
- Phone Number *
- Address (optional)
- Notes (optional — first contact notes)

> When a returning client adds a new project, admin searches existing clients and selects them — does NOT create a duplicate.

#### Client Detail Page

**Sections:**
1. **Client Info** — all fields above with an Edit button (admin only)
2. **Projects Summary**
   - Total projects: X
   - Successful (Delivered): X
   - In Progress: X
   - Total billed: ₹X (sum of all project budgets)
3. **Project List** — table of all projects for this client with status badge and quick link
4. **Follow-ups** — list of all scheduled follow-ups for this client
5. **Notes** — chronological notes log (admin can add notes here)

#### Data Privacy
- Employees cannot access `/admin/clients` routes at all
- Employees only see `client name + company` on their project cards

---

### 4.3 Project Management

**Routes:** `/admin/projects` (list) · `/admin/projects/new` · `/admin/projects/[id]`  
**Employee:** `/employee/projects` (own only) · `/employee/projects/[id]`

#### Create New Project Form

**Client Selection:**
- Search existing clients (auto-complete) → select
- Or "Add New Client" link that opens the client form first

**Project Fields:**

| Field | Type | Required |
|---|---|---|
| Project Name | Text | ✅ |
| Client | Search/Select | ✅ |
| Service Category | Multi-select (from custom list) | ✅ |
| Description / Requirements | Rich text area | ✅ |
| Budget (agreed price) | Number (₹) | ✅ |
| Actual Cost | Number (₹) | Optional (can fill later) |
| Start Date | Date picker | ✅ |
| Delivery Date (Deadline) | Date picker | ✅ |
| Primary Assigned Employee | Select from employee list | Optional (can assign later) |
| Additional Team Members | Multi-select employees | Optional |
| Priority | Dropdown: Low / Medium / High / Urgent | ✅ |
| Status | Auto-set to: **New** | Auto |

#### Project Status Pipeline

```
New → In Progress → Under Review → Completed → Delivered
```

- Admin can move status to any stage
- Employee can only move status of their own assigned projects
- Status change is logged in the activity feed with timestamp and who changed it
- If project reaches "Delivered" status → deadline reminders stop automatically

#### Project List View (Admin)

**Table Columns:** Project Name | Client | Category | Assigned To | Status | Deadline | Priority | Budget

- Filter by: Status, Category, Assigned Employee, Priority, Date Range
- Search by project name or client name
- Sort by: Deadline (default), Budget, Priority
- Color-coded status badges

#### Project Detail Page

**Sections:**
1. **Project Header** — name, client (name + company only for employees), status badge, priority badge
2. **Project Info** — all form fields (admin can edit all; employee read-only except status)
3. **Financial** — Budget, Actual Cost, Profit (auto = budget - cost). **Admin only.**
4. **Assigned Team** — primary employee + members (admin can reassign)
5. **Activity Timeline** — chronological log of all changes, notes, doubts
6. **Notes** — free-text note editor. Admin writes, assigned employee writes. Each note shows author + timestamp.
7. **Doubts Section** — see §4.4
8. **Follow-ups** — see §4.5
9. **Reminder Settings** — project-level reminder overrides (admin only)

---

### 4.4 Doubts & Internal Communication

**Location:** Tab/Section inside Project Detail page

**Who can use it:** Admin + Assigned Employee(s) of that specific project only

#### Doubt Flow

1. Employee clicks "Raise a Doubt" on their project page
2. Fills a form:
   - **Subject** (short title)
   - **Description** (detailed text, multiline)
   - **Priority** — Normal / Urgent
3. Doubt is submitted → status: **Open**
4. Admin gets an **in-app notification** + **email** that a doubt was raised
5. Admin can reply with a text response
6. Employee gets notified when admin replies
7. Admin or employee can mark the doubt as **Resolved**
8. Resolved doubts collapse (but remain visible via "Show Resolved" toggle)

#### Doubt Item Display (per doubt)

```
[Subject]                               [Open / Resolved] badge
Raised by: John (Employee) · 2 Nov 2026 · Priority: Urgent

[Description text]

─── Admin Reply ───────────────────────────────────
[Reply text]
Admin · 3 Nov 2026

[Mark as Resolved]  [Reply]
```

---

### 4.5 Follow-Up Scheduler

**Location:** Accessible from Project Detail page + standalone `/admin/followups` list

**Purpose:** When a client says "call me after 2 days" or admin decides to follow up on a date, this is logged and the right people are reminded.

#### Create Follow-Up Form

| Field | Type | Required |
|---|---|---|
| Follow-up Date | Date + Time picker | ✅ |
| Linked Project | Auto-filled if from project page | ✅ |
| Linked Client | Auto-filled from project | ✅ |
| Assigned To | Select employee (defaults to project's primary) | ✅ |
| Notes | What to follow up about | Optional |

#### How It Works

- On the **follow-up date**, at the set time (or 9:00 AM if no time set):
  - The assigned person gets an **in-app notification**: "📞 Follow-up due: [Client Name] — [Project Name]"
  - An **email** is sent to the assigned person with the same info + notes
- Admin gets notified too if they are not the assigned person
- Follow-up status: **Pending → Done → Missed**
- Follow-up shows in the Admin Dashboard widget "Follow-ups Today"

#### Follow-Up List (Admin View)

- All follow-ups across all clients/projects
- Filterable by: Status, Date Range, Assigned Employee, Client
- Table: Date | Client | Project | Assigned To | Notes | Status

---

### 4.6 Notification & Reminder System

**Two channels: In-app (bell icon) + Email**

#### 6.1 — Deadline Reminders (Auto)

Triggered automatically based on project delivery date.

**Default reminders:**
- 3 days before deadline
- 2 days before deadline (if not delivered)
- 1 day before deadline (if not delivered)
- On deadline day (if not delivered)

**Customizable:** Admin can change these at:
- **Global level** — Settings → Reminder Configuration (applies to all new projects)
- **Per-project level** — Project Detail → Reminder Settings (overrides global for that project)

Admin can add any number of reminder points (e.g., 7 days, 5 days, 3 days, 1 day).

**Who gets reminded:** Assigned employee (primary + members) + Admin

**Reminders auto-stop** when project status is set to "Delivered"

#### 6.2 — Overdue Alert (Auto)

If a project's delivery date has passed and status is NOT "Delivered" or "Completed":
- Day 1 overdue: notify employee + admin
- Every day after: notify admin (not employee again, to avoid spam)

#### 6.3 — Follow-Up Reminders (Auto)

- Triggered on the follow-up date/time
- Assigned person + admin get in-app + email

#### 6.4 — Doubt Notifications (Triggered by user action)

| Event | Who Gets Notified |
|---|---|
| Employee raises a doubt | Admin (in-app + email) |
| Admin replies to doubt | Assigned employee (in-app + email) |
| Doubt marked resolved | The other party (in-app) |

#### 6.5 — In-App Notification Panel

- Bell icon in topbar with unread count badge
- Clicking opens a slide-out panel (Drawer on mobile)
- Notifications list: icon + title + timestamp + "Mark Read" action
- "Mark All as Read" button
- Notifications persist (not ephemeral) until manually dismissed or marked read

**Notification types and icons:**

| Type | Icon | Color |
|---|---|---|
| Deadline reminder | 🕐 Clock | Amber |
| Overdue alert | ⚠️ Warning | Red |
| Doubt raised | 💬 Chat | Blue |
| Doubt replied | 💬 Chat | Blue |
| Follow-up due | 📞 Phone | Green |
| Status changed | 🔄 Refresh | Gray |

---

### 4.7 Employee Management

**Routes:** `/admin/employees` · `/admin/employees/new` · `/admin/employees/[id]`

#### Employee List View

Table: Name | Email | Role | Pay Type | Assigned Projects (count) | Status (Active/Inactive)

#### Add Employee Form

| Field | Type | Required |
|---|---|---|
| Full Name | Text | ✅ |
| Email | Email | ✅ |
| Phone | Text | ✅ |
| Role / Designation | Text (e.g., "SEO Specialist") | ✅ |
| Pay Type | Dropdown: Salary / Intern / Hourly | ✅ |
| Pay Rate | Number (₹/month or ₹/hour) | ✅ |
| Join Date | Date | ✅ |
| Initial Password | Text (set by admin) | ✅ |
| Notes | Text | Optional |

> Admin sets the initial password. Employee must change it on first login (prompt shown).

#### Employee Detail Page (Admin View)

1. **Personal Info** — all fields above, editable by admin
2. **Assigned Projects** — list of current projects assigned to this employee
3. **Performance Summary**
   - Total projects handled
   - On-time delivery rate (% of projects delivered before/on deadline)
   - Open doubts count
   - Projects by status breakdown
4. **Deactivate / Reactivate** toggle — deactivated employees cannot log in; their projects remain

#### Employee Self-View (after login)

Employees only see their own dashboard — they cannot access `/admin/employees` at all.

---

### 4.8 Analytics

**Route:** `/admin/analytics`

**Admin only.**

#### Analytics Sections

**1. Revenue & Profit Overview**
- Total revenue this month / last month / this year (from project budgets)
- Total costs this month / last month / this year
- Net profit
- Month-by-month bar chart (revenue vs cost vs profit)

**2. Project Performance**
- Total projects created vs delivered (by month)
- On-time delivery rate (%)
- Average project duration (start to delivery)
- Projects by service category (donut chart)
- Projects by status (bar chart)

**3. Client Retention**
- New clients this month / quarter
- Returning clients (clients with more than 1 project)
- Client retention rate = returning clients / total clients × 100
- Top clients by total project value (table: name, projects, total value)

**4. Employee Performance**
- Table: Employee | Projects Completed | On-time Rate | Open Doubts | Avg Project Duration
- Sortable by on-time rate (find top performers)

**5. Follow-Up Tracking**
- Total follow-ups this month
- Follow-ups completed (Done) vs missed
- Completion rate (%)

**Filters available on analytics page:** Date range (this month / last month / last 3 months / this year / custom)

---

### 4.9 Settings & Customization

**Route:** `/admin/settings`

**Admin only.**

#### Tabs

**1. Service Categories**
- List of all categories with edit/delete
- Add new category (name + optional color)
- Pre-loaded defaults: SEO · Social Media Marketing · PPC/Google Ads · Content Writing · Web Design · Email Marketing
- Cannot delete a category that is in use by an active project (show warning)

**2. Reminder Configuration (Global)**
- List of reminder timings (e.g., "3 days before", "2 days before", "1 day before", "On deadline day")
- Add custom timing: "X days before deadline"
- Remove any timing
- These apply globally to all new projects. Existing projects are not changed retroactively.

**3. Admin Profile**
- Name, email, phone (editable)
- Password change (via current password + new password, no token needed for admin)

**4. Notification Preferences**
- Toggle email notifications on/off per type (deadline reminders, doubt alerts, follow-up reminders, overdue alerts)

---

### 4.10 Employee Dashboard

**Route:** `/employee/dashboard`

**Purpose:** First screen an employee sees after login.

#### Widgets

| Widget | What It Shows |
|---|---|
| **My Projects** | Count of active assigned projects |
| **Overdue** | Projects past deadline not yet delivered |
| **Upcoming Deadlines** | Projects due in next 7 days |
| **Pending Follow-ups** | Follow-ups assigned to me today/this week |
| **Open Doubts** | My unresolved doubts waiting for admin reply |

#### Quick Actions
- View My Projects
- Raise a Doubt (links to their project list to select which project)
- Mark Follow-up Done

---

## 5. Data Models

> These become TypeScript interfaces in `lib/types.ts`

### Client
```ts
interface Client {
  id: string
  fullName: string
  companyName: string
  email: string            // admin only visible
  phone: string            // admin only visible
  address?: string         // admin only visible
  notes?: string
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}
```

### Project
```ts
interface Project {
  id: string
  name: string
  clientId: string
  serviceCategories: string[]      // array of category IDs
  description: string
  budget: number                   // in ₹
  actualCost?: number              // in ₹, optional
  startDate: Date
  deliveryDate: Date
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'new' | 'in_progress' | 'under_review' | 'completed' | 'delivered'
  primaryEmployeeId?: string
  additionalMemberIds: string[]
  reminderOverrides?: ReminderConfig[]  // null = use global setting
  createdAt: Date
  updatedAt: Date
}

interface ReminderConfig {
  daysBeforeDeadline: number
}
```

### Employee
```ts
interface Employee {
  id: string
  fullName: string
  email: string
  phone: string
  designation: string
  payType: 'salary' | 'intern' | 'hourly'
  payRate: number          // ₹/month or ₹/hour
  joinDate: Date
  status: 'active' | 'inactive'
  mustChangePassword: boolean
  notes?: string
  createdAt: Date
}
```

### Doubt
```ts
interface Doubt {
  id: string
  projectId: string
  raisedBy: string         // employee ID
  subject: string
  description: string
  priority: 'normal' | 'urgent'
  status: 'open' | 'resolved'
  adminReply?: string
  adminRepliedAt?: Date
  createdAt: Date
  resolvedAt?: Date
}
```

### FollowUp
```ts
interface FollowUp {
  id: string
  projectId: string
  clientId: string
  scheduledAt: Date        // date + time
  assignedTo: string       // employee ID or 'admin'
  notes?: string
  status: 'pending' | 'done' | 'missed'
  createdAt: Date
}
```

### Note
```ts
interface Note {
  id: string
  projectId: string
  authorId: string         // employee ID or 'admin'
  authorType: 'admin' | 'employee'
  content: string
  createdAt: Date
}
```

### Notification
```ts
interface AppNotification {
  id: string
  recipientId: string      // employee ID or 'admin'
  type: 'deadline_reminder' | 'overdue' | 'doubt_raised' | 'doubt_replied' | 'followup_due' | 'status_changed'
  title: string
  message: string
  relatedProjectId?: string
  read: boolean
  createdAt: Date
}
```

### ServiceCategory
```ts
interface ServiceCategory {
  id: string
  name: string
  color?: string           // hex color for badge
  isDefault: boolean       // pre-loaded defaults flagged
  createdAt: Date
}
```

---

## 6. Build Order (Phase Plan)

> Build strictly in this order. Do not start the next phase until current is complete and responsive.

```
Phase 0 — Foundation
  ├── Design tokens (globals.css @theme)
  ├── Primitive UI components (Button, Input, Badge, Card, Modal, Drawer, etc.)
  ├── Layout shell (Sidebar, Topbar, MobileNav, PageHeader)
  ├── lib/types.ts — all interfaces above
  ├── lib/utils.ts — cn(), formatDate(), formatCurrency(), formatRelativeTime()
  └── lib/mock-data/ — realistic mock data for all entities

Phase 1 — Auth
  ├── /login — shared login page (detects role after auth)
  └── /forgot-password — email token flow (UI only for now)

Phase 2 — Admin Dashboard
  └── /admin/dashboard — 6 widgets + recent activity feed

Phase 3 — Client Management
  ├── /admin/clients — list with search + filter
  ├── /admin/clients/new — add client form
  └── /admin/clients/[id] — client detail with projects + notes + follow-ups

Phase 4 — Project Management
  ├── /admin/projects — full project list + filters
  ├── /admin/projects/new — project creation form
  └── /admin/projects/[id] — full project detail

Phase 5 — Doubts System
  └── Doubts tab inside /admin/projects/[id] and /employee/projects/[id]

Phase 6 — Follow-Up Scheduler
  ├── Follow-up creation form (from project page)
  └── /admin/followups — full follow-up list

Phase 7 — Notification System (UI)
  └── Bell icon + notification drawer + notification list page

Phase 8 — Employee Management (Admin)
  ├── /admin/employees — employee list
  ├── /admin/employees/new — add employee form
  └── /admin/employees/[id] — employee detail + performance

Phase 9 — Employee Portal
  ├── /employee/dashboard
  ├── /employee/projects — my projects
  └── /employee/projects/[id] — project detail (restricted view)

Phase 10 — Analytics
  └── /admin/analytics — all 5 chart sections

Phase 11 — Settings
  └── /admin/settings — categories, reminders, profile, notifications
```

---

## 7. Design & UX Rules

### Visual Identity
- Dark sidebar (`#0f172a`) + light content area (`#f8fafc`)
- Brand accent: Blue (`#3b82f6`)
- Minimal, professional — no flashy animations
- Status colors: Blue=New, Amber=In Progress, Purple=Under Review, Green=Completed/Delivered, Red=Overdue

### Mobile-First Rules
- Every page designed for 375px first
- Mobile: bottom navigation bar (5 key routes)
- Mobile: tables become card lists
- Mobile: modals become bottom-sheet drawers
- Tap targets minimum 44×44px

### UX Principles
- Every list has an **Empty State** (friendly message + CTA)
- Every async action has a **Loading State** (spinner or skeleton)
- Every destructive action has a **Confirm Dialog** ("Are you sure you want to delete?")
- Status changes are logged automatically — no manual activity log entries
- Forms have inline validation — no waiting until submit to show errors
- Search is debounced (300ms) — no search button needed
- After creating/saving — redirect to detail page, not back to list

### Employee UX (Restricted but Clear)
- When an employee logs in, they should immediately see their workload
- No dead ends — if no projects are assigned, show a clear empty state
- "You don't have permission" pages should be friendly, not technical

---

*This document is the source of truth for all frontend implementation decisions.*
*Any feature not listed here needs to be discussed and added here before implementation.*
