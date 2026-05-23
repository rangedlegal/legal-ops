import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatPercent, getCurrentMonth } from "@/lib/utils"
import { prisma } from "@/lib/prisma"
import { calculateCostToServe } from "@/lib/calculations"
import { OPEN_TASK_STATUSES } from "@/lib/constants"
import Link from "next/link"

interface ClientMetric {
  id: string
  name: string
  monthlyFee: number
  totalCostToServe: number
  fullyLoadedMarginPct: number
  fullyLoadedMargin: number
}

function MarginBadge({ pct }: { pct: number }) {
  if (pct < 0) return <Badge variant="destructive">{formatPercent(pct)}</Badge>
  if (pct < 30) return <Badge variant="warning">{formatPercent(pct)}</Badge>
  if (pct < 50) return <Badge variant="info">{formatPercent(pct)}</Badge>
  return <Badge variant="success">{formatPercent(pct)}</Badge>
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const { month, year } = getCurrentMonth()
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  const settings = await prisma.firmSettings.findFirst()
  const blendedCostPerUnit = settings?.blendedCostPerUnit ?? 50
  const adminUpliftPct = settings?.adminUpliftPercentage ?? 10
  const overheadPct = settings?.overheadPercentage ?? 8

  const activeClients = await prisma.client.findMany({
    where: { status: "ACTIVE" },
    include: {
      tasks: {
        where: { completedAt: { gte: start, lt: end } },
        select: { weightedEffortUnits: true },
      },
    },
  })

  const totalRevenue = activeClients.reduce((sum, c) => sum + c.monthlyFee, 0)

  const clientMetrics: ClientMetric[] = activeClients.map((client) => {
    const totalUnits = client.tasks.reduce((sum, t) => sum + t.weightedEffortUnits, 0)
    const costs = calculateCostToServe(
      totalUnits,
      client.monthlyFee,
      blendedCostPerUnit,
      adminUpliftPct,
      overheadPct,
    )
    return {
      id: client.id,
      name: client.name,
      monthlyFee: client.monthlyFee,
      totalCostToServe: costs.totalCostToServe,
      fullyLoadedMarginPct: costs.fullyLoadedMarginPct,
      fullyLoadedMargin: costs.fullyLoadedMargin,
    }
  })

  const totalCostToServe = clientMetrics.reduce((sum, c) => sum + c.totalCostToServe, 0)
  const avgMarginPct =
    clientMetrics.length > 0
      ? clientMetrics.reduce((sum, c) => sum + c.fullyLoadedMarginPct, 0) / clientMetrics.length
      : 0

  const [openTasks, completedThisMonth, urgentTasks, outOfScopeTasks] = await Promise.all([
    prisma.task.count({ where: { status: { in: OPEN_TASK_STATUSES } } }),
    prisma.task.count({ where: { completedAt: { gte: start, lt: end } } }),
    prisma.task.count({ where: { priority: "URGENT", status: { in: OPEN_TASK_STATUSES } } }),
    prisma.task.count({ where: { outOfScope: true, status: { in: OPEN_TASK_STATUSES } } }),
  ])

  const sorted = [...clientMetrics].sort((a, b) => b.fullyLoadedMarginPct - a.fullyLoadedMarginPct)
  const mostProfitable = sorted.slice(0, 3)
  const leastProfitable = sorted.slice(-3).reverse()
  const belowThirtyPct = clientMetrics.filter((c) => c.fullyLoadedMarginPct < 30)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Overview for{" "}
          {new Date(year, month - 1, 1).toLocaleDateString("en-AU", {
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Active Clients
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{activeClients.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Open Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{openTasks}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Completed This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{completedThisMonth}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalRevenue)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Total Cost-to-Serve
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{formatCurrency(totalCostToServe)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Avg Margin %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-slate-900">{formatPercent(avgMarginPct)}</p>
              <MarginBadge pct={avgMarginPct} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Urgent Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-slate-900">{urgentTasks}</p>
              {urgentTasks > 0 && <Badge variant="destructive">Action needed</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Out-of-Scope Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-slate-900">{outOfScopeTasks}</p>
              {outOfScopeTasks > 0 && <Badge variant="warning">Review</Badge>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning: Clients Below 30% Margin */}
      {belowThirtyPct.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <span>Clients Below 30% Margin</span>
              <Badge variant="warning">{belowThirtyPct.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-amber-700 border-b border-amber-200">
                    <th className="pb-2 font-medium">Client</th>
                    <th className="pb-2 font-medium text-right">Monthly Fee</th>
                    <th className="pb-2 font-medium text-right">Cost-to-Serve</th>
                    <th className="pb-2 font-medium text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {belowThirtyPct.map((c) => (
                    <tr key={c.id} className="border-b border-amber-100 last:border-0">
                      <td className="py-2">
                        <Link
                          href={`/dashboard/clients/${c.id}`}
                          className="font-medium text-amber-900 hover:underline"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-2 text-right text-amber-800">{formatCurrency(c.monthlyFee)}</td>
                      <td className="py-2 text-right text-amber-800">
                        {formatCurrency(c.totalCostToServe)}
                      </td>
                      <td className="py-2 text-right">
                        <MarginBadge pct={c.fullyLoadedMarginPct} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Most Profitable */}
        <Card>
          <CardHeader>
            <CardTitle>Most Profitable Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {mostProfitable.length === 0 ? (
              <p className="text-sm text-slate-500">No data yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Client</th>
                    <th className="pb-2 font-medium text-right">Fee</th>
                    <th className="pb-2 font-medium text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {mostProfitable.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2">
                        <Link
                          href={`/dashboard/clients/${c.id}`}
                          className="font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-2 text-right text-slate-600">{formatCurrency(c.monthlyFee)}</td>
                      <td className="py-2 text-right">
                        <MarginBadge pct={c.fullyLoadedMarginPct} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        {/* Least Profitable */}
        <Card>
          <CardHeader>
            <CardTitle>Least Profitable Clients</CardTitle>
          </CardHeader>
          <CardContent>
            {leastProfitable.length === 0 ? (
              <p className="text-sm text-slate-500">No data yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Client</th>
                    <th className="pb-2 font-medium text-right">Fee</th>
                    <th className="pb-2 font-medium text-right">Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {leastProfitable.map((c) => (
                    <tr key={c.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-2">
                        <Link
                          href={`/dashboard/clients/${c.id}`}
                          className="font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {c.name}
                        </Link>
                      </td>
                      <td className="py-2 text-right text-slate-600">{formatCurrency(c.monthlyFee)}</td>
                      <td className="py-2 text-right">
                        <MarginBadge pct={c.fullyLoadedMarginPct} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
