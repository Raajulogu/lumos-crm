'use client'

// app/admin/analytics/page.tsx
// Agency Analytics & KPI Hub — Real API data integration with loading skeletons and 0-data screen.

import { useState, useMemo, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import {
  Card,
  CardHeader,
  Badge,
  Button,
  PageLoader,
  MetricCardSkeleton,
} from '@/components/ui'
import { api } from '@/lib/api'
import type {
  Project,
  Client,
  Employee,
  ServiceCategory,
  Doubt,
  EmployeePerformance,
} from '@/lib/types'
import {
  TrendingUp,
  Award,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminAnalyticsContent />
    </Suspense>
  )
}

function AdminAnalyticsContent() {
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year' | 'all'>('quarter')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [openDoubts, setOpenDoubts] = useState<Doubt[]>([])
  const [doubtsLoaded, setDoubtsLoaded] = useState(false)
  const [overviewLeaderboard, setOverviewLeaderboard] = useState<EmployeePerformance[]>([])

  useEffect(() => {
    let mounted = true

    Promise.allSettled([
      api.projects.list({ limit: 100 }),
      api.clients.list({ limit: 100 }),
      api.employees.list(),
      api.settings.getCategories(),
    ])
      .then(async ([projRes, clientRes, empRes, catRes]) => {
        if (!mounted) return

        const loadedProjects =
          projRes.status === 'fulfilled' ? projRes.value?.projects || [] : []

        if (projRes.status === 'fulfilled') {
          setProjects(loadedProjects)
        } else {
          setError('Failed to fetch agency financial metrics from server')
        }

        if (clientRes.status === 'fulfilled') setClients(clientRes.value?.clients || [])
        if (empRes.status === 'fulfilled') setEmployees(empRes.value || [])
        if (catRes.status === 'fulfilled') setCategories(catRes.value || [])

        if (loadedProjects.length > 0) {
          const doubtResults = await Promise.allSettled(
            loadedProjects.map((p) => api.doubts.listByProject(p.id, 'open')),
          )
          if (!mounted) return
          const allOpenDoubts = doubtResults.flatMap((res) =>
            res.status === 'fulfilled' ? res.value || [] : [],
          )
          setOpenDoubts(allOpenDoubts)
          setDoubtsLoaded(doubtResults.some((res) => res.status === 'fulfilled'))
        } else {
          setDoubtsLoaded(true)
        }
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    api.analytics
      .getOverview(timeRange)
      .then((overview) => {
        if (!mounted || !overview?.employeeLeaderboard) return
        setOverviewLeaderboard(overview.employeeLeaderboard)
      })
      .catch(() => {})

    return () => {
      mounted = false
    }
  }, [timeRange])

  // Financial calculations from real projects
  const totalRevenue = useMemo(() => {
    return (Array.isArray(projects) ? projects : []).reduce(
      (sum, p) => sum + (Number(p?.budget) || 0),
      0,
    )
  }, [projects])

  const totalCost = useMemo(() => {
    return (Array.isArray(projects) ? projects : []).reduce(
      (sum, p) => sum + (Number(p?.actualCost) || 0),
      0,
    )
  }, [projects])

  const netProfit = totalRevenue - totalCost
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0

  // Month-by-month financial bar data
  const monthlyTrends = useMemo(() => {
    const monthMap = new Map<string, { revenue: number; cost: number; profit: number }>()
    ;(Array.isArray(projects) ? projects : []).forEach((p) => {
      if (!p) return
      const dateStr = p.deliveryDate || p.createdAt
      const d = dateStr ? new Date(dateStr) : null
      const key = d && !isNaN(d.getTime())
        ? d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : 'Current Period'
      const existing = monthMap.get(key) || { revenue: 0, cost: 0, profit: 0 }
      existing.revenue += Number(p.budget) || 0
      existing.cost += Number(p.actualCost) || 0
      existing.profit = existing.revenue - existing.cost
      monthMap.set(key, existing)
    })

    if (monthMap.size === 0) {
      return [
        { month: 'Current Period', revenue: totalRevenue, cost: totalCost, profit: netProfit },
      ]
    }

    return Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      cost: data.cost,
      profit: data.profit,
    }))
  }, [projects, totalRevenue, totalCost, netProfit])

  const maxRevenueTrend = useMemo(
    () => Math.max(1, ...monthlyTrends.map((t) => t.revenue)),
    [monthlyTrends],
  )

  // Service Category Breakdown
  const categoryStats = useMemo(() => {
    const map = new Map<string, { count: number; totalBudget: number }>()
    ;(Array.isArray(categories) ? categories : []).forEach((c) => {
      const catKey = c.id || (c as ServiceCategory & { _id?: string })._id
      if (catKey) {
        map.set(catKey, { count: 0, totalBudget: 0 })
      }
    })

    ;(Array.isArray(projects) ? projects : []).forEach((p) => {
      if (!p || !Array.isArray(p.serviceCategories)) return
      p.serviceCategories.forEach(
        (catItem: string | { id?: string; _id?: string }) => {
          const catId =
            typeof catItem === 'object' && catItem !== null
              ? catItem.id || catItem._id
              : catItem
          const existing = catId ? map.get(catId) : undefined
          if (existing) {
            existing.count += 1
            existing.totalBudget += (Number(p.budget) || 0) / (p.serviceCategories.length || 1)
          }
        },
      )
    })

    return (Array.isArray(categories) ? categories : []).map((c) => ({
      name: c.name,
      color: c.color,
      count: map.get(c.id)?.count || 0,
      totalBudget: map.get(c.id)?.totalBudget || 0,
    }))
  }, [categories, projects])

  // Client Retention Stats
  const clientRetention = useMemo(() => {
    const clientProjectsCount = new Map<string, number>()
    projects.forEach((p) => {
      clientProjectsCount.set(
        p.clientId,
        (clientProjectsCount.get(p.clientId) || 0) + 1,
      )
    })

    let returning = 0
    clientProjectsCount.forEach((count) => {
      if (count > 1) returning += 1
    })

    const totalClientsCount = clients.length
    const retentionRate =
      totalClientsCount > 0 ? Math.round((returning / totalClientsCount) * 100) : 0

    const topClients = clients
      .map((c) => {
        const cProjects = projects.filter((p) => p.clientId === c.id)
        const totalVal = cProjects.reduce((sum, p) => sum + p.budget, 0)
        return {
          id: c.id,
          name: c.fullName,
          company: c.companyName,
          projectsCount: cProjects.length,
          totalValue: totalVal,
        }
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)

    return { returning, retentionRate, topClients }
  }, [clients, projects])

  // Employee Performance Leaderboard
  const employeePerformance = useMemo(() => {
    const openDoubtsByEmployee = new Map<string, number>()
    openDoubts.forEach((d) => {
      if (d.status && d.status !== 'open') return
      const doubtWithAlias = d as unknown as {
        raisedById?: string | { id?: string; _id?: string }
        raisedBy?: string | { id?: string; _id?: string }
      }
      const rawRaised = doubtWithAlias.raisedById ?? doubtWithAlias.raisedBy
      const raisedId =
        typeof rawRaised === 'object' && rawRaised !== null
          ? String(rawRaised.id || rawRaised._id || '')
          : String(rawRaised || '')
      if (raisedId) {
        openDoubtsByEmployee.set(raisedId, (openDoubtsByEmployee.get(raisedId) || 0) + 1)
      }
    })

    return employees.map((emp) => {
      const assigned = projects.filter(
        (p) =>
          p.primaryEmployeeId === emp.id || p.additionalMemberIds?.includes(emp.id),
      )
      const delivered = assigned.filter(
        (p) => p.status === 'delivered' || p.status === 'completed',
      )
      const onTimeRate =
        assigned.length > 0 ? Math.round((delivered.length / assigned.length) * 100) : 0
      const overviewEntry = overviewLeaderboard.find((o) => o.employeeId === emp.id)
      const openDoubtsCount = doubtsLoaded
        ? openDoubtsByEmployee.get(emp.id) || 0
        : overviewEntry?.openDoubts ?? 0

      return {
        id: emp.id,
        name: emp.fullName,
        designation: emp.designation,
        status: emp.status,
        totalProjects: assigned.length,
        deliveredCount: delivered.length,
        onTimeRate,
        openDoubtsCount,
      }
    })
  }, [employees, projects, openDoubts, doubtsLoaded, overviewLeaderboard])

  return (
    <ContentWrapper>
      <PageHeader
        title="Agency Analytics & Performance"
        description="Comprehensive operational audit of agency revenue, profits, client retention, and team productivity."
        action={
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-border">
            {(['month', 'quarter', 'year', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {range === 'month'
                  ? '30 Days'
                  : range === 'quarter'
                  ? 'Q4 2026'
                  : range === 'year'
                  ? 'This Year'
                  : 'All Time'}
              </button>
            ))}
          </div>
        }
      />

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-danger-light border border-danger/30 text-danger-dark flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Top Level Financial Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <MetricCardSkeleton key={i} />)
        ) : (
          <>
            <Card padding="md">
              <p className="text-xs text-text-muted">Total Gross Billings</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {formatCurrency(totalRevenue)}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-success mt-0.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>Across all deliverables</span>
              </div>
            </Card>

            <Card padding="md">
              <p className="text-xs text-text-muted">Direct Operational Costs</p>
              <p className="text-2xl font-bold text-text-secondary mt-1">
                {formatCurrency(totalCost)}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                Ad spend, tools & contractor fees
              </p>
            </Card>

            <Card padding="md">
              <p className="text-xs text-text-muted">Net Operating Profit</p>
              <p className="text-2xl font-bold text-success-dark mt-1">
                {formatCurrency(netProfit)}
              </p>
              <div className="flex items-center gap-1 text-[11px] text-success-dark mt-0.5">
                <Award className="h-3.5 w-3.5" />
                <span>{profitMargin}% Profit Margin</span>
              </div>
            </Card>

            <Card padding="md">
              <p className="text-xs text-text-muted">Client Retention Index</p>
              <p className="text-2xl font-bold text-brand-700 mt-1">
                {clientRetention.retentionRate}%
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {clientRetention.returning} recurring accounts
              </p>
            </Card>
          </>
        )}
      </div>

      {/* Month-by-Month Revenue vs Profit Growth Chart */}
      <Card padding="lg" className="mb-6">
        <CardHeader
          title="Revenue & Net Profit Trajectory"
          description="Monthly agency billing versus realized net profit margin"
        />

        <div className="space-y-4 pt-2">
          {monthlyTrends.map((t) => {
            const revPercent = Math.round((t.revenue / maxRevenueTrend) * 100)
            const profitPercent = Math.round((t.profit / maxRevenueTrend) * 100)

            return (
              <div key={t.month} className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-text-primary font-semibold w-24">{t.month}</span>
                  <div className="flex items-center gap-4 text-right">
                    <span>
                      Revenue: <strong className="text-text-primary">{formatCurrency(t.revenue)}</strong>
                    </span>
                    <span>
                      Profit: <strong className="text-success-dark">{formatCurrency(t.profit)}</strong>
                    </span>
                  </div>
                </div>

                {/* Dual Progress Bars */}
                <div className="h-3.5 w-full bg-surface rounded-full overflow-hidden flex relative border border-border/80">
                  <div
                    className="h-full bg-brand-500 rounded-l-full"
                    style={{ width: `${revPercent}%` }}
                    title={`Revenue: ${formatCurrency(t.revenue)}`}
                  />
                  <div
                    className="h-full bg-success-dark absolute left-0 opacity-80 rounded-l-full"
                    style={{ width: `${profitPercent}%` }}
                    title={`Profit: ${formatCurrency(t.profit)}`}
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-end gap-5 pt-4 border-t border-border mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-brand-500" />
            <span className="text-text-secondary">Gross Revenue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-success-dark opacity-80" />
            <span className="text-text-secondary">Net Agency Profit</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Service Categories Breakdown */}
        <Card padding="md">
          <CardHeader
            title="Service Line Distribution"
            description="Active agency projects broken down by marketing specialization"
          />

          <div className="space-y-3 pt-1">
            {categoryStats.map((cat) => (
              <div key={cat.name} className="space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text-primary">{cat.name}</span>
                  <span className="text-text-muted">
                    {cat.count} campaigns ({formatCurrency(cat.totalBudget)})
                  </span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-border/60">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      backgroundColor: cat.color,
                      width: `${Math.min(100, cat.count * 25)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Top Clients by Value */}
        <Card padding="md">
          <CardHeader
            title="Highest Value Client Accounts"
            description="Client lifetime value and recurring engagement volume"
          />

          <div className="divide-y divide-border text-xs">
            {clientRetention.topClients.map((c, i) => (
              <div
                key={c.id}
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="h-6 w-6 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-text-muted text-[11px] flex-shrink-0">
                    #{i + 1}
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/clients/${c.id}`}
                      className="font-semibold text-text-primary hover:text-brand-600 truncate block"
                    >
                      {c.company}
                    </Link>
                    <p className="text-[11px] text-text-muted truncate">
                      {c.name} • {c.projectsCount} projects
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-sm text-brand-700">
                    {formatCurrency(c.totalValue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Staff Performance & Productivity Index */}
      <Card padding="md">
        <CardHeader
          title="Team Productivity & Deliverable Capacity"
          description="Employee workload balance, completion rates, and active questions"
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface border-b border-border text-xs font-semibold uppercase text-text-secondary">
              <tr>
                <th scope="col" className="px-4 py-3">Team Member</th>
                <th scope="col" className="px-3 py-3">Role</th>
                <th scope="col" className="px-3 py-3 text-center">Employment</th>
                <th scope="col" className="px-3 py-3 text-center">Assigned Projects</th>
                <th scope="col" className="px-3 py-3 text-center">Completed</th>
                <th scope="col" className="px-3 py-3 text-center">On-Time Rate</th>
                <th scope="col" className="px-4 py-3 text-right">Open Doubts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-xs">
              {employeePerformance.map((emp) => (
                <tr key={emp.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3 font-semibold text-text-primary">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        href={`/admin/employees/${emp.id}`}
                        className="hover:text-brand-600"
                      >
                        {emp.name}
                      </Link>
                      <Link
                        href={`/admin/employees/${emp.id}?tab=worksheet`}
                        className="text-[11px] font-medium text-brand-600 hover:underline whitespace-nowrap"
                      >
                        Worksheet →
                      </Link>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-text-muted">{emp.designation}</td>
                  <td className="px-3 py-3 text-center capitalize">
                    <Badge variant={emp.status === 'active' ? 'blue' : 'gray'} size="sm">
                      {emp.status === 'active' ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-text-primary">
                    {emp.totalProjects}
                  </td>
                  <td className="px-3 py-3 text-center text-success-dark font-medium">
                    {emp.deliveredCount}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-semibold text-text-primary">
                      {emp.onTimeRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {emp.openDoubtsCount > 0 ? (
                      <Badge variant="amber" size="sm">
                        {emp.openDoubtsCount}
                      </Badge>
                    ) : (
                      <span className="font-semibold text-text-muted">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </ContentWrapper>
  )
}

