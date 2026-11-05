# AI Agent Instructions — CRM Frontend

> **READ THIS FILE BEFORE WRITING ANY CODE.**
> This file is the law. These rules exist because AI agents make specific, repeatable mistakes on this project. Follow them without exception.

---

## 🔴 BEFORE YOU START ANY TASK

1. Read `FRONTEND_DOCS.md` — it has the full folder structure, module order, and design system
2. Check `components/` — does the component you need ALREADY EXIST?
3. Check `lib/types.ts` — does the type/interface ALREADY EXIST?
4. Confirm you are building the NEXT module in the sequence (see Phase list in FRONTEND_DOCS.md)

---

## 🏗 ONE MODULE AT A TIME — STRICT ORDER

```
Phase 0 (Foundation) → Phase 1 (Auth) → Phase 2 (Dashboard) → Phase 3 (Leads) → ...
```

**Do not skip phases. Do not start Phase 3 if Phase 2 isn't done.**
Complete means: fully responsive (375px → 1440px), all states covered (empty, loading, error), all components reused properly.

---

## 📱 MOBILE FIRST — NON-NEGOTIABLE

Write styles for 375px FIRST. Then add `md:` overrides. Then `lg:`.

```tsx
// ✅ RIGHT
<div className="flex flex-col gap-4 md:flex-row md:gap-6">

// ❌ WRONG
<div className="flex flex-row gap-6 md:flex-col">
```

Every page you build, manually trace through these questions:
- What does this look like on a 375px phone?
- Is the sidebar replaced by a bottom nav?
- Do tables become card lists?
- Do modals become bottom drawers?

---

## ♻️ COMPONENT REUSE — ALWAYS CHECK FIRST

**Before creating any new component:**

```
Is there a Button in components/ui/? → Use it
Is there a Card in components/ui/? → Use it
Is there a Modal or Drawer? → Use it
Is there a PageHeader in components/layout/? → Use it on EVERY page
Is there an EmptyState? → Use it on EVERY empty list
Is there a Spinner? → Use it on EVERY loading state
```

**If you use the same JSX block twice → Extract it into a component immediately.**

---

## 🗂 WHERE FILES GO — NO EXCEPTIONS

| What | Where |
|---|---|
| Primitive UI (Button, Input, Badge…) | `components/ui/` |
| Page layout pieces (Sidebar, Topbar…) | `components/layout/` |
| Entity forms (LeadForm, DealForm…) | `components/forms/` |
| Entity cards (LeadCard, DealCard…) | `components/cards/` |
| Chart wrappers | `components/charts/` |
| Shared feature components | `components/common/` |
| All TypeScript types/interfaces | `lib/types.ts` |
| All mock/dummy data | `lib/mock-data/` |
| Helper functions | `lib/utils.ts` |
| Custom hooks | `hooks/` |
| Pages only | `app/(dashboard)/[module]/page.tsx` |

**NEVER create a `components/` folder inside `app/`. NEVER put types inside component files (unless it's a local props interface).**

---

## ⚙️ NEXT.JS 16 APP ROUTER — CRITICAL RULES

```ts
// ❌ NEVER — Pages Router imports
import { useRouter } from 'next/router'
import { getServerSideProps } from '...'

// ✅ ALWAYS — App Router
import { useRouter, usePathname, useParams } from 'next/navigation'
```

- Pages are **Server Components by default** — only add `"use client"` when you use hooks or browser events
- Fetch data with `async/await` in Server Components — not with `useEffect`
- Use route groups `(auth)` and `(dashboard)` for layout separation
- Dynamic routes use `[id]/page.tsx` pattern

---

## 🎨 TAILWIND CSS v4 — CRITICAL RULES

```
❌ NO tailwind.config.js — this project uses Tailwind v4
✅ All theme customization lives in app/globals.css inside @theme { }
```

```css
/* ✅ Correct v4 config */
@import "tailwindcss";

@theme {
  --color-brand-500: #3b82f6;
  --radius-md: 0.5rem;
}
```

- Use `cn()` from `lib/utils.ts` for conditional classes
- Never concatenate class strings with `+` or template literals for conditionals
- Never use `@apply` for component styles — write utilities directly

---

## 🔷 TYPESCRIPT RULES

- All shared types → `lib/types.ts`
- No `any` — use `unknown` and narrow
- Component props always have an explicit interface:
  ```ts
  interface CardProps { title: string; ... }
  export function Card({ title }: CardProps) { ... }
  ```
- Use `interface` for objects, `type` for unions

---

## ✋ TOP 15 MISTAKES TO AVOID

| # | Mistake | Correct |
|---|---|---|
| 1 | Creating Button when `components/ui/Button` exists | Reuse existing |
| 2 | `import { useRouter } from 'next/router'` | `next/navigation` |
| 3 | Using `useEffect` to load data on a page | Async Server Component |
| 4 | Writing desktop layout before mobile | Mobile first always |
| 5 | Hardcoding `#hex` in className | Use Tailwind token classes |
| 6 | 20+ Tailwind classes on one element | Extract to component |
| 7 | Skipping loading state | Add `Spinner` always |
| 8 | Skipping empty state | Add `EmptyState` always |
| 9 | Table without mobile fallback | Card list on mobile |
| 10 | Modal that's too small or broken on mobile | Use `Drawer` on mobile |
| 11 | Putting types inline in component files | Move to `lib/types.ts` |
| 12 | Creating `app/components/` folder | Use `/components` at root |
| 13 | Using `tailwind.config.js` | Configure in `globals.css` |
| 14 | Icon-only button without `aria-label` | Always add `aria-label` |
| 15 | Starting a new module before current is complete | Follow phase order |

---

## 📋 DEFINITION OF "DONE" FOR EACH MODULE

A module is complete only when ALL of these are true:

- [ ] Mobile layout works at 375px
- [ ] Tablet layout works at 768px
- [ ] Desktop layout works at 1280px
- [ ] Empty state shown when list is empty
- [ ] Loading state shown while data loads
- [ ] All reusable components used (no duplicate JSX)
- [ ] TypeScript has no errors
- [ ] No `any` types used
- [ ] All form fields validated
- [ ] Touch targets ≥ 44×44px
- [ ] No hardcoded colors
- [ ] `PageHeader` used on the page
- [ ] Mock data comes from `lib/mock-data/`

---

*This file is maintained alongside `FRONTEND_DOCS.md`. Both must be read before each coding session.*

