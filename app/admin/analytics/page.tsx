'use client'

// app/admin/analytics/page.tsx
// Agency Analytics & KPI Hub — Revenue, Net Profits, Client Retention, Staff Performance, and Service Distribution.

import { useState, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { ContentWrapper } from '@/components/layout/ContentWrapper'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardHeader, Badge, Button, PageLoader } from '@/components/ui'
import {
  mockProjects,
  mockClients,
  mockEmployees,
  mockCategories,
  mockFollowUps,
  mockDoubts,
} from '@/lib/mock-data'
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

  // Financial calculations
  const totalRevenue = useMemo(() => {
    return mockProjects.reduce((sum, p) => sum + p.budget, 0)
  }, [])

  const totalCost = useMemo(() => {
    return mockProjects.reduce((sum, p) => sum + (p.actualCost || 0), 0)
  }, [])

  const netProfit = totalRevenue - totalCost
  const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0

  // Month-by-month financial bar data (simulated agency trend)
  const monthlyTrends = [
    { month: 'Aug 2026', revenue: 180000, cost: 95000, profit: 85000 },
    { month: 'Sep 2026', revenue: 240000, cost: 110000, profit: 130000 },
    { month: 'Oct 2026', revenue: 310000, cost: 140000, profit: 170000 },
    { month: 'Nov 2026', revenue: 330000, cost: 132000, profit: 198000 },
  ]
  const maxRevenueTrend = Math.max(...monthlyTrends.map((t) => t.revenue))

  // Service Category Breakdown
  const categoryStats = useMemo(() => {
    const map = new Map<string, { count: number; totalBudget: number }>()
    mockCategories.forEach((c) => map.set(c.id, { count: 0, totalBudget: 0 }))

    mockProjects.forEach((p) => {
      p.serviceCategories.forEach((catId) => {
        const existing = map.get(catId)
        if (existing) {
          existing.count += 1
          existing.totalBudget += p.budget / p.serviceCategories.length
        }
      })
    })

    return mockCategories.map((c) => ({
      name: c.name,
      color: c.color,
      count: map.get(c.id)?.count || 0,
      totalBudget: map.get(c.id)?.totalBudget || 0,
    }))
  }, [])

  // Client Retention Stats
  const clientRetention = useMemo(() => {
    const clientProjectsCount = new Map<string, number>()
    mockProjects.forEach((p) => {
      clientProjectsCount.set(
        p.clientId,
        (clientProjectsCount.get(p.clientId) || 0) + 1,
      )
    })

    let returning = 0
    let single = 0
    clientProjectsCount.forEach((count) => {
      if (count > 1) returning += 1
      else single += 1
    })

    const totalClientsWithProjects = clientProjectsCount.size
    const retentionRate =
      totalClientsWithProjects > 0
        ? Math.round((returning / totalClientsWithProjects) * 100)
        : 0

    // Top Clients by Value
    const topClients = mockClients
      .map((c) => {
        const clientProjects = mockProjects.filter((p) => p.clientId === c.id)
        const totalValue = clientProjects.reduce((sum, p) => sum + p.budget, 0)
        return {
          id: c.id,
          company: c.companyName,
          contact: c.fullName,
          projectCount: clientProjects.length,
          totalValue,
        }
      })
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 4)

    return { returning, single, retentionRate, topClients }
  }, [])

  // Staff Performance Index
  const staffPerformance = useMemo(() => {
    return mockEmployees.map((emp) => {
      const assigned = mockProjects.filter(
        (p) =>
          p.primaryEmployeeId === emp.id || p.additionalMemberIds.includes(emp.id),
      )
      const completed = assigned.filter(
        (p) => p.status === 'completed' || p.status === 'delivered',
      ).length
      const openDoubts = mockDoubts.filter(
        (d) => d.raisedById === emp.id && d.status === 'open',
      ).length

      // Simulated on-time delivery rate
      const onTimeRate = assigned.length > 0 ? 92 : 100

      return {
        id: emp.id,
        name: emp.fullName,
        role: emp.designation,
        payType: emp.payType,
        total: assigned.length,
        completed,
        openDoubts,
        onTimeRate,
      }
    })
  }, [])

  // Follow-up Completion Rate
  const totalFollowups = mockFollowUps.length
  const completedFollowups = mockFollowUps.filter((f) => f.status === 'done').length
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

      {/* Top Level Financial Scorecards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card padding="md">
          <p className="text-xs text-text-muted">Total Gross Billings</p>
          <p className="text-2xl font-bold text-text-primary mt-1">
            {formatCurrency(totalRevenue)}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-success mt-0.5">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>+18.4% vs last period</span>
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
                      {c.contact} • {c.projectCount} projects
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
              {staffPerformance.map((emp) => (
                <tr key={emp.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3 font-semibold text-text-primary">
                    <Link
                      href={`/admin/employees/${emp.id}`}
                      className="hover:text-brand-600"
                    >
                      {emp.name}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-text-muted">{emp.role}</td>
                  <td className="px-3 py-3 text-center capitalize">
                    <Badge
                      variant={
                        emp.payType === 'salary'
                          ? 'blue'
                          : emp.payType === 'intern'
                          ? 'purple'
                          : 'amber'
                      }
                      size="sm"
                    >
                      {emp.payType}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-center font-semibold text-text-primary">
                    {emp.total}
                  </td>
                  <td className="px-3 py-3 text-center text-success-dark font-medium">
                    {emp.completed}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-semibold text-text-primary">
                      {emp.onTimeRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {emp.openDoubts > 0 ? (
                      <Badge variant="amber" size="sm">
                        {emp.openDoubts} open
                      </Badge>
                    ) : (
                      <span className="text-text-muted">0</span>
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

