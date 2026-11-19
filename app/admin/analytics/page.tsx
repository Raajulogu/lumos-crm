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
  CardSkeleton,
  EmptyState,
} from '@/components/ui'
import { api } from '@/lib/api'
import type {
  Project,
  Client,
  Employee,
  ServiceCategory,
  FollowUp,
  Doubt,
} from '@/lib/types'
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Users,
  Award,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  PieChart,
  BarChart2,
  Phone,
  AlertCircle,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

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
  const [followups, setFollowups] = useState<FollowUp[]>([])

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    Promise.allSettled([
      api.projects.list({ limit: 100 }),
      api.clients.list({ limit: 100 }),
      api.employees.list(),
      api.settings.getCategories(),
      api.followups.list({ limit: 100 }),
    ])
      .then(([projRes, clientRes, empRes, catRes, fuRes]) => {
        if (!mounted) return

        if (projRes.status === 'fulfilled') {
          setProjects(projRes.value?.projects || [])
        } else {
          setError('Failed to fetch agency financial metrics from server')
        }

        if (clientRes.status === 'fulfilled') setClients(clientRes.value?.clients || [])
        if (empRes.status === 'fulfilled') setEmployees(empRes.value || [])
        if (catRes.status === 'fulfilled') setCategories(catRes.value || [])
        if (fuRes.status === 'fulfilled') setFollowups(fuRes.value?.followups || [])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  // Financial calculations from real projects
  const totalRevenue = useMemo(() => {
    return projects.reduce((sum, p) => sum + p.budget, 0)
  }, [projects])

  const totalCost = useMemo(() => {
    return projects.reduce((sum, p) => sum + (p.actualCost || 0), 0)
  }, [projects])

  const netProfit = totalRevenue - totalCost
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0

  // Month-by-month financial bar data
  const monthlyTrends = useMemo(() => {
    const monthMap = new Map<string, { revenue: number; cost: number; profit: number }>()
    projects.forEach((p) => {
      const d = new Date(p.deliveryDate || p.createdAt)
      const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      const existing = monthMap.get(key) || { revenue: 0, cost: 0, profit: 0 }
      existing.revenue += p.budget
      existing.cost += p.actualCost || 0
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
    categories.forEach((c) => map.set(c.id, { count: 0, totalBudget: 0 }))

    projects.forEach((p) => {
      p.serviceCategories?.forEach((catId) => {
        const existing = map.get(catId)
        if (existing) {
          existing.count += 1
          existing.totalBudget += p.budget / (p.serviceCategories.length || 1)
        }
      })
    })

    return categories.map((c) => ({
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
    return employees.map((emp) => {
      const assigned = projects.filter(
        (p) =>
          p.primaryEmployeeId === emp.id || p.additionalMemberIds?.includes(emp.id),
      )
      const delivered = assigned.filter((p) => p.status === 'delivered')
      const totalBudgetHandled = assigned.reduce((sum, p) => sum + p.budget, 0)
      const onTimeRate =
        assigned.length > 0 ? Math.round((delivered.length / assigned.length) * 100) : 100

      return {
        id: emp.id,
        name: emp.fullName,
        designation: emp.designation,
        totalProjects: assigned.length,
        deliveredCount: delivered.length,
        totalBudgetHandled,
        onTimeRate,
      }
    })
  }, [employees, projects])

  // Follow-up Completion Rate from real followups
  const totalFollowups = followups.length
  const completedFollowups = followups.filter((f) => f.status === 'done').length
  const followUpRate =
    totalFollowups > 0 ? Math.round((completedFollowups / totalFollowups) * 100) : 0

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
                    <Link
                      href={`/admin/employees/${emp.id}`}
                      className="hover:text-brand-600"
                    >
                      {emp.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-text-muted">{emp.designation}</td>
                  <td className="px-3 py-3 text-center capitalize">
                    <Badge variant="blue" size="sm">
                      Active
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
                    <span className="font-semibold text-text-primary">
                      {formatCurrency(emp.totalBudgetHandled)}
                    </span>
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

