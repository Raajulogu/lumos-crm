# CRM Frontend — Digital Marketing Company
## Project Documentation & Development Bible

> **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4  
> **Approach:** Mobile-first → Tablet → Desktop | Component reuse enforced | One module at a time

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Versions](#2-tech-stack--versions)
3. [Folder Structure](#3-folder-structure)
4. [Component Reuse Rules](#4-component-reuse-rules)
5. [Mobile-First Responsiveness Rules](#5-mobile-first-responsiveness-rules)
6. [Module Build Order](#6-module-build-order)
7. [Module List & Feature Scope](#7-module-list--feature-scope)
8. [Design System Tokens](#8-design-system-tokens)
9. [AI Agent Coding Guidelines](#9-ai-agent-coding-guidelines)
10. [File & Naming Conventions](#10-file--naming-conventions)
11. [Do's and Don'ts](#11-dos-and-donts)

---

## 1. Project Overview

A **CRM (Customer Relationship Management)** system built for a **digital marketing agency**. It helps the team:

- Track leads, clients, and deals through a sales pipeline
- Manage campaigns and deliverables for clients
- Log tasks, calls, and follow-ups
- Monitor team performance and KPIs
- Send proposals and invoices

**This document covers the FRONTEND ONLY.** Backend API integration will be done in a separate phase after all frontend modules are complete. All data will be mocked (static JSON / dummy data) during frontend development.

---

## 2. Tech Stack & Versions

| Tool | Version | Notes |
|---|---|---|
| Next.js | 16.4.5 | App Router ONLY — no Pages Router |
| React | 19.3.0 | Server Components by default |
| TypeScript | 5.x | Strict mode on |
| Tailwind CSS | 4.x | v4 syntax — no `tailwind.config.js`, use CSS vars |
| Turbopack | Built-in | Dev bundler via `next dev` |

> **⚠️ Important:** Tailwind CSS v4 uses a different config model. All theme customizations go in `app/globals.css` using `@theme` block — NOT in a `tailwind.config.js` file.

---

## 3. Folder Structure

```
crm-frontend/
├── app/                          # Next.js App Router root
│   ├── layout.tsx                # Root layout (fonts, global providers)
│   ├── page.tsx                  # Landing / redirect to /dashboard
│   ├── globals.css               # Global styles + Tailwind v4 @theme
│   │
│   ├── (auth)/                   # Auth route group (no sidebar)
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── forgot-password/
│   │       └── page.tsx
│   │
│   └── (dashboard)/              # Main app route group (with sidebar)
│       ├── layout.tsx            # Dashboard shell: sidebar + topbar
│       ├── dashboard/
│       │   └── page.tsx
│       ├── leads/
│       │   ├── page.tsx          # Leads list
│       │   └── [id]/
│       │       └── page.tsx      # Lead detail
│       ├── contacts/
│       │   ├── page.tsx
│       │   └── [id]/
│       │       └── page.tsx
│       ├── deals/
│       │   ├── page.tsx          # Kanban pipeline view
│       │   └── [id]/
│       │       └── page.tsx
│       ├── campaigns/
│       │   ├── page.tsx
│       │   └── [id]/
│       │       └── page.tsx
│       ├── tasks/
│       │   └── page.tsx
│       ├── reports/
│       │   └── page.tsx
│       ├── clients/
│       │   ├── page.tsx
│       │   └── [id]/
│       │       └── page.tsx
│       ├── invoices/
│       │   ├── page.tsx
│       │   └── [id]/
│       │       └── page.tsx
│       └── settings/
│           └── page.tsx
│
├── components/                   # ALL reusable UI components
│   ├── ui/                       # Primitive / atomic components
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Badge.tsx
│   │   ├── Card.tsx
│   │   ├── Modal.tsx
│   │   ├── Drawer.tsx            # Mobile slide-in panel
│   │   ├── Dropdown.tsx
│   │   ├── Avatar.tsx
│   │   ├── Spinner.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Tabs.tsx
│   │   ├── Table.tsx
│   │   ├── Select.tsx
│   │   ├── Textarea.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Toggle.tsx
│   │   ├── DatePicker.tsx
│   │   ├── EmptyState.tsx
│   │   └── index.ts              # Barrel export
│   │
│   ├── layout/                   # Layout-level components
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   ├── MobileNav.tsx         # Bottom nav for mobile
│   │   ├── PageHeader.tsx        # Page title + breadcrumb + action button
│   │   └── ContentWrapper.tsx    # Padding/max-width wrapper
│   │
│   ├── forms/                    # Form compositions
│   │   ├── LeadForm.tsx
│   │   ├── ContactForm.tsx
│   │   ├── DealForm.tsx
│   │   ├── TaskForm.tsx
│   │   ├── CampaignForm.tsx
│   │   └── InvoiceForm.tsx
│   │
│   ├── cards/                    # Domain-specific card components
│   │   ├── LeadCard.tsx
│   │   ├── DealCard.tsx
│   │   ├── ContactCard.tsx
│   │   ├── CampaignCard.tsx
│   │   └── TaskCard.tsx
│   │
│   ├── charts/                   # Data visualization wrappers
│   │   ├── BarChart.tsx
│   │   ├── LineChart.tsx
│   │   ├── DonutChart.tsx
│   │   └── StatCard.tsx
│   │
│   └── common/                   # Shared feature components
│       ├── SearchBar.tsx
│       ├── FilterBar.tsx
│       ├── SortMenu.tsx
│       ├── Pagination.tsx
│       ├── ConfirmDialog.tsx
│       ├── ActivityFeed.tsx
│       ├── NotesSection.tsx
│       └── TagInput.tsx
│
├── lib/                          # Utilities, helpers, constants
│   ├── mock-data/                # All dummy data lives here
│   │   ├── leads.ts
│   │   ├── contacts.ts
│   │   ├── deals.ts
│   │   ├── campaigns.ts
│   │   ├── tasks.ts
│   │   └── index.ts
│   ├── utils.ts                  # formatDate, truncate, cn(), etc.
│   ├── constants.ts              # App-wide constants
│   └── types.ts                  # All shared TypeScript interfaces
│
├── hooks/                        # Custom React hooks
│   ├── useMediaQuery.ts
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   └── useSidebar.ts
│
├── public/
│   ├── icons/
│   └── images/
│
├── FRONTEND_DOCS.md              # This file
├── AGENTS.md                     # Next.js agent rules (auto-generated)
└── package.json
```

---

## 4. Component Reuse Rules

> **Golden Rule: If you're writing the same JSX twice, extract it into a component.**

### 4.1 — Check Before You Create

Before building any new component, check in this order:
1. Does `components/ui/` already have it?
2. Does `components/common/` have something close?
3. Can an existing component be extended via props?

If yes → **reuse/extend**. If no → create a new one in the right folder.

### 4.2 — Component Categories

| Folder | What goes here | Example |
|---|---|---|
| `components/ui/` | Zero business logic, pure display/interaction | `Button`, `Badge`, `Modal` |
| `components/layout/` | App shell, navigation, page wrappers | `Sidebar`, `PageHeader` |
| `components/forms/` | Form components for specific entities | `LeadForm` |
| `components/cards/` | Entity cards used in lists/kanban | `DealCard` |
| `components/charts/` | Chart wrappers (wrapping a chart lib) | `BarChart` |
| `components/common/` | Shared feature-level components | `FilterBar`, `ActivityFeed` |

### 4.3 — Reuse Checklist (run this mentally before every new component)

```
[ ] Could this be a variant of an existing component via a `variant` or `size` prop?
[ ] Could PageHeader be used instead of a custom page title?
[ ] Could EmptyState be used for all empty list states?
[ ] Could Modal / Drawer be reused instead of a new overlay?
[ ] Could Card from ui/ wrap this content instead of a custom div?
[ ] Is this form just LeadForm with different fields → use a generic FormField pattern
```

### 4.4 — Barrel Exports

Every component folder must have an `index.ts` that re-exports everything:
```ts
// components/ui/index.ts
export { Button } from './Button'
export { Input } from './Input'
// ...
```
Import like: `import { Button, Badge } from '@/components/ui'`

---

## 5. Mobile-First Responsiveness Rules

### 5.1 — Breakpoint Strategy

Always write **mobile styles first**, then add tablet/desktop overrides:

```tsx
// ✅ CORRECT — mobile first
<div className="flex flex-col gap-3 md:flex-row md:gap-6 lg:gap-8">

// ❌ WRONG — desktop first
<div className="flex flex-row gap-8 max-md:flex-col">
```

### 5.2 — Breakpoint Reference (Tailwind v4 defaults)

| Prefix | Min-width | Target |
|---|---|---|
| *(none)* | 0px | Mobile (default) |
| `sm:` | 640px | Large mobile / small tablet |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Small laptop |
| `xl:` | 1280px | Desktop |
| `2xl:` | 1536px | Large desktop |

### 5.3 — Layout Patterns Per Screen

**Mobile (default):**
- Single column layouts
- Sidebar hidden → replaced by `MobileNav` (bottom navigation bar)
- Tables → transform to card-list view
- Modals → full-screen drawers on mobile
- Kanban board → horizontal scroll or stacked columns

**Tablet (md:):**
- Sidebar collapses to icon-only
- Two-column grids allowed
- Tables show (but limited columns)

**Desktop (lg:+):**
- Full sidebar visible
- Multi-column grids
- Full table with all columns

### 5.4 — Touch-Friendly Rules

- All interactive elements minimum `44×44px` tap target
- Buttons: minimum `h-10` (40px), use `h-11` or `h-12` for primary CTAs
- Use `active:scale-95` on buttons for touch feedback
- Avoid hover-only interactions — always have a tap equivalent

### 5.5 — Mobile Nav Pattern

```
Mobile: [Dashboard] [Leads] [Deals] [Tasks] [More]  ← fixed bottom bar
Tablet: Collapsed sidebar (icons only)
Desktop: Full sidebar with labels
```

---

## 6. Module Build Order

> **Build strictly in this order. Complete one before starting the next.**
> Each module must be fully responsive and use reusable components before moving on.

```
Phase 0 — Foundation (Do this first, everything depends on it)
  ├── 0.1  Design tokens in globals.css (@theme)
  ├── 0.2  All ui/ primitive components
  ├── 0.3  Layout components (Sidebar, Topbar, MobileNav, PageHeader)
  ├── 0.4  lib/types.ts — all shared interfaces
  ├── 0.5  lib/utils.ts — cn(), formatDate(), formatCurrency()
  └── 0.6  Mock data files

Phase 1 — Auth
  └── Login page, Forgot Password page

Phase 2 — Dashboard (Home)
  └── Stats cards, recent activity, quick actions

Phase 3 — Leads
  ├── Leads list page (table + card view toggle)
  └── Lead detail page

Phase 4 — Contacts
  ├── Contacts list page
  └── Contact detail page

Phase 5 — Deals / Pipeline
  ├── Kanban board view
  └── Deal detail page

Phase 6 — Clients
  ├── Clients list
  └── Client detail (with linked campaigns, invoices)

Phase 7 — Campaigns
  ├── Campaigns list
  └── Campaign detail

Phase 8 — Tasks
  └── Task list (grouped by status/due date)

Phase 9 — Invoices
  ├── Invoice list
  └── Invoice detail / preview

Phase 10 — Reports
  └── Charts, KPIs, downloadable summary

Phase 11 — Settings
  └── Profile, Team, Notifications, Integrations (UI only)
```

---

## 7. Module List & Feature Scope

### Module 1: Dashboard
- Stat cards: Total Leads, Open Deals, Revenue This Month, Active Campaigns
- Recent activity feed
- Upcoming tasks (next 3)
- Pipeline summary (mini Kanban or funnel)

### Module 2: Leads
- List view with search, filter (status, source, assigned to), sort
- Status badges: New, Contacted, Qualified, Lost
- Lead source: Organic, Paid, Referral, Social
- Quick actions: Convert to Contact, Mark Lost
- Detail: lead info, notes, activity timeline, tasks

### Module 3: Contacts
- Full contact info: name, email, phone, company, role
- Linked leads, deals
- Activity timeline
- Notes section
- Tags

### Module 4: Deals / Pipeline
- Kanban board: stages = Prospecting → Proposal → Negotiation → Won → Lost
- Deal card: name, value, contact, days in stage
- Drag-and-drop between stages (use a lightweight lib or CSS approach)
- Deal detail: deal info, linked contact, notes, files, activity

### Module 5: Clients
- Client = converted contact with active engagement
- Client profile: company info, subscription/retainer, assigned account manager
- Linked campaigns, invoices, contacts

### Module 6: Campaigns
- Campaign for a specific client
- Fields: name, type (SEO/PPC/Social/Email), status, budget, start/end date, assigned team
- Deliverables checklist
- Performance metrics (mocked numbers)

### Module 7: Tasks
- My Tasks / All Tasks views
- Priority: Low / Medium / High / Urgent
- Status: Todo / In Progress / Done
- Due date, assigned to, linked to (Lead/Deal/Campaign)
- Quick create from any detail page

### Module 8: Invoices
- Invoice list with status: Draft, Sent, Paid, Overdue
- Invoice detail: line items, totals, client info, due date
- Preview mode (print-friendly layout)

### Module 9: Reports
- Lead conversion rate (over time)
- Revenue by month
- Deals by stage
- Campaign performance comparison
- Team activity summary

### Module 10: Settings
- Profile settings (name, email, avatar, password)
- Team members management (UI only)
- Notification preferences
- Integrations list (mocked toggles: Gmail, Slack, Zapier)

---

## 8. Design System Tokens

Define all tokens in `app/globals.css` using Tailwind v4's `@theme` block:

```css
@import "tailwindcss";

@theme {
  /* Brand Colors */
  --color-brand-50: #eff6ff;
  --color-brand-100: #dbeafe;
  --color-brand-500: #3b82f6;
  --color-brand-600: #2563eb;
  --color-brand-700: #1d4ed8;
  --color-brand-900: #1e3a8a;

  /* Semantic Colors */
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-info: #06b6d4;

  /* Neutrals */
  --color-surface: #f8fafc;
  --color-border: #e2e8f0;
  --color-text-primary: #0f172a;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;

  /* Sidebar */
  --color-sidebar-bg: #0f172a;
  --color-sidebar-text: #cbd5e1;
  --color-sidebar-active: #3b82f6;

  /* Typography */
  --font-sans: "Inter", system-ui, sans-serif;

  /* Spacing / Radius */
  --radius-sm: 0.375rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
  --radius-xl: 1rem;
}
```

### Status Badge Colors

| Status | Color |
|---|---|
| New / Draft | Blue |
| Active / Won / Paid | Green |
| In Progress / Sent | Amber |
| Lost / Overdue | Red |
| Closed / Archived | Gray |

---

## 9. AI Agent Coding Guidelines

> These are hard rules to prevent the most common AI coding mistakes in this project.

### 9.1 — Next.js App Router Rules

- **NEVER use `useRouter` from `next/router`** → use `next/navigation`
- **NEVER use `getServerSideProps` or `getStaticProps`** → these are Pages Router patterns
- Pages are Server Components by default → only add `"use client"` when you use hooks or browser APIs
- **Data fetching:** Use `async` Server Components with `await` directly — no `useEffect` for data loading on pages
- **Client components:** Keep them small. Push interactivity down the tree.
- Route groups use `(folder)` syntax — they don't appear in the URL

### 9.2 — Tailwind CSS v4 Rules

- **NO `tailwind.config.js`** — all config lives in `globals.css`
- Use `@theme` for custom tokens, not `extend` config
- Do NOT use `@apply` for complex component styles — write utility classes directly
- v4 uses CSS variables natively — access with `var(--color-brand-500)` or the `brand-500` class name

### 9.3 — Component Rules

- **Always check if a component already exists before creating a new one**
- Use `cn()` utility (class-names merger) for conditional classes — never string concatenation
- All form inputs must use the shared `Input`, `Select`, `Textarea` components from `ui/`
- Never hardcode colors — always use design token classes or variables
- Never hardcode pixel widths — use Tailwind's spacing scale

### 9.4 — TypeScript Rules

- All entity types must be in `lib/types.ts` — no inline `type` or `interface` inside component files unless it's a local props type
- Use `interface` for objects, `type` for unions/intersections
- No `any` — use `unknown` and narrow it
- All component props must have an explicit interface: `interface ButtonProps { ... }`

### 9.5 — Responsive Rules

- **Write mobile styles first, always**
- Never use `hidden md:block` without a corresponding mobile alternative (use `Drawer` or `MobileNav`)
- Test every component at 375px width mentally before writing desktop styles
- Tables on mobile must degrade to card/list view — never horizontal scroll tables without `overflow-x-auto` wrapper

### 9.6 — Common AI Mistakes to Avoid

| Mistake | Correct Approach |
|---|---|
| Creating a new Button component when one exists | Reuse `components/ui/Button` with new props |
| Using `useEffect` to fetch data in a page | Use async Server Component or fetch in layout |
| Importing from `next/router` | Always `next/navigation` |
| Putting all code in one file | Split into page + components immediately |
| Using hardcoded hex colors in className | Use Tailwind token class names |
| Forgetting mobile layout entirely | Write mobile first, desktop overrides after |
| Making modal that doesn't work on mobile | Use Drawer for mobile, Modal for desktop |
| Not extracting repeated JSX | Extract after second use |
| Using `tailwind.config.js` with v4 | Configure in `globals.css` only |
| Writing `className="..."` with 20+ classes | Extract to a component or use `cva` pattern |
| Forgetting loading and empty states | Every list needs both `EmptyState` and `Spinner` |
| Not wrapping forms in `<form>` with `onSubmit` | Always use proper form submission |
| Using `px-` on mobile that breaks layout | Use `px-4 md:px-6 lg:px-8` pattern |

### 9.7 — Naming Conventions for AI Clarity

- Pages are always named `page.tsx` (required by Next.js)
- Layouts are always named `layout.tsx`
- Components use **PascalCase** filenames: `LeadCard.tsx`
- Hooks use **camelCase** with `use` prefix: `useMediaQuery.ts`
- Utils and types use **camelCase**: `utils.ts`, `types.ts`
- Mock data uses camelCase: `leads.ts`

---

## 10. File & Naming Conventions

### Component File Structure (every component follows this template)

```tsx
// components/ui/Button.tsx

interface ButtonProps {
  label: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  children?: React.ReactNode
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  onClick,
  className,
  children,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        // base styles
        'inline-flex items-center justify-center font-medium rounded-md transition-all active:scale-95',
        // variant styles
        variant === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700',
        variant === 'secondary' && 'bg-white border border-border text-text-primary hover:bg-surface',
        variant === 'ghost' && 'text-text-secondary hover:bg-surface',
        variant === 'danger' && 'bg-danger text-white hover:opacity-90',
        // size styles
        size === 'sm' && 'h-8 px-3 text-sm',
        size === 'md' && 'h-10 px-4 text-sm',
        size === 'lg' && 'h-12 px-6 text-base',
        className
      )}
    >
      {isLoading ? <Spinner size="sm" /> : (children ?? label)}
    </button>
  )
}
```

### Page File Structure

```tsx
// app/(dashboard)/leads/page.tsx
// Server Component (no "use client" unless needed)

import { PageHeader } from '@/components/layout'
import { LeadListClient } from './LeadListClient'  // Client island
import { mockLeads } from '@/lib/mock-data'

export default function LeadsPage() {
  const leads = mockLeads  // Will be replaced by API call later

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Manage and track your sales leads"
        action={{ label: 'Add Lead', href: '/leads/new' }}
      />
      <LeadListClient initialLeads={leads} />
    </div>
  )
}
```

---

## 11. Do's and Don'ts

### ✅ DO

- Read this document before writing any code for a new module
- Check `components/` before creating anything new
- Write mobile layout first, then `md:` and `lg:` overrides
- Use `PageHeader` component for every page title section
- Use `EmptyState` for all empty lists
- Use `Spinner` for all loading states
- Keep pages thin — move logic into components, hooks, or utils
- Use TypeScript interfaces from `lib/types.ts`
- Use mock data from `lib/mock-data/` — keep it realistic (names, values)
- Add `aria-label` to all icon-only buttons
- Use `Drawer` (bottom sheet) for mobile overlays instead of centered Modal

### ❌ DON'T

- Don't create a new component if one exists
- Don't start a new module before the current one is fully done and responsive
- Don't hardcode colors (`#2563eb`) — use Tailwind classes
- Don't hardcode user data or IDs in components — always pass via props
- Don't put business logic in `page.tsx` — keep it in hooks or utils
- Don't use `useEffect` for derived state — use `useMemo`
- Don't use `any` in TypeScript
- Don't skip loading and empty states to "save time"
- Don't make layout decisions for desktop without checking mobile first
- Don't install a heavy library for something Tailwind + React can do natively
- Don't create a "components" folder inside `app/` — all components live in `/components`
- Don't use inline styles (`style={{}}`) — use Tailwind classes

---

## Appendix: Library Candidates (Evaluate Before Installing)

These are lightweight options to consider when functionality is needed. **Do not install without discussion.**

| Need | Option | Alternative |
|---|---|---|
| Drag and drop (Kanban) | `@dnd-kit/core` | CSS scroll |
| Charts | `recharts` | `chart.js` |
| Date picker | `react-day-picker` | Native `<input type="date">` |
| Form validation | `react-hook-form` + `zod` | Native HTML5 |
| Icons | `lucide-react` | SVG sprites |
| Notifications/Toast | `sonner` | Custom component |
| Class names | `clsx` + `tailwind-merge` = `cn()` | Built-in |

---

*Last updated: November 2026 — Frontend only scope. Backend integration phase to follow after all modules are complete and reviewed.*

