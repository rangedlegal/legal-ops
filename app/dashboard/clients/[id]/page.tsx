import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatPercent, formatDate } from "@/lib/utils"
import { TASK_CATEGORIES, OPEN_TASK_STATUSES } from "@/lib/constants"
import { prisma } from "@/lib/prisma"
import { calculateCostToServe } from "@/lib/calculations"
import { ClientTrendChart } from "@/components/dashboard/client-trend-chart"
import { ArrowLeft, Edit, FileText } from "lucide-react"

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "info" | "indigo" | "warning" | "destructive" | "success" }> = {
    NEW: { label: "New", variant: "default" },
    ASSIGNED: { label: "Assigned", variant: "info" },
    IN_PROGRESS: { label: "In Progress", variant: "indigo" },
    WAITING_ON_CLIENT: { label: "Waiting on Client", variant: "warning" },
    WAITING_ON_THIRD_PARTY: { label: "Waiting on 3rd Party", variant: "warning" },
    COMPLETED: { label: "Completed", variant: "success" },
    CANCELLED: { label: "Cancelled", variant: "default" },
  }
  const s = map[status] ?? { label: status, variant: "default" as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "URGENT") return <Badge variant="destructive">Urgent</Badge>
  if (priority === "PRIORITY") return <Badge variant="warning">Priority</Badge>
  return <Badge variant="default">Normal</Badge>
}

function getCategoryLabel(value: string) {
  return TASK_CATEGORIES.find((c) => c.value === value)?.label ?? value
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { id } = await params

  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) notFound()

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  const settings = await prisma.firmSettings.findFirst()
  const blendedCostPerUnit = settings?.blendedCostPerUnit ?? 50
  const adminUpliftPct = settings?.adminUpliftPercentage ?? 10
  const overheadPct = settings?.overheadPercentage ?? 8

  const [completedTasks, openTasks] = await Promise.all([
    prisma.task.findMany({
      where: { clientId: id, completedAt: { gte: start, lt: end } },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { completedAt: "desc" },
    }),
    prisma.task.findMany({
      where: { clientId: id, status: { in: OPEN_TASK_STATUSES } },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
  ])

  const completedWeightedUnits = completedTasks.reduce((s, t) => s + t.weightedEffortUnits, 0)
  const costs = calculateCostToServe(
    completedWeightedUnits,
    client.monthlyFee,
    blendedCostPerUnit,
    adminUpliftPct,
    overheadPct,
  )

  // Category breakdown from all tasks this month
  const allThisMonth = await prisma.task.findMany({
    where: { clientId: id, createdAt: { gte: start, lt: end } },
    select: { category: true, outOfScope: true, priority: true },
  })
  const categoryBreakdown: Record<string, number> = {}
  for (const t of allThisMonth) {
    categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + 1
  }

  const outOfScopeCount = openTasks.filter((t) => t.outOfScope).length
  const urgentCount = openTasks.filter((t) => t.priority === "URGENT").length
  const assignedMembers = [
    ...new Set([
      ...completedTasks.map((t) => t.assignedTo?.name).filter((n): n is string => Boolean(n)),
      ...openTasks.map((t) => t.assignedTo?.name).filter((n): n is string => Boolean(n)),
    ]),
  ]

  // Build 6-month trend
  const trendData: Array<{ month: string; weightedUnits: number; costToServe: number; margin: number }> = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1)
    const tStart = new Date(d.getFullYear(), d.getMonth(), 1)
    const tEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const mTasks = await prisma.task.findMany({
      where: { clientId: id, completedAt: { gte: tStart, lt: tEnd } },
      select: { weightedEffortUnits: true },
    })
    const mUnits = mTasks.reduce((s, t) => s + t.weightedEffortUnits, 0)
    const mCosts = calculateCostToServe(mUnits, client.monthlyFee, blendedCostPerUnit, adminUpliftPct, overheadPct)
    trendData.push({
      month: tStart.toLocaleDateString("en-AU", { month: "short", year: "2-digit" }),
      weightedUnits: parseFloat(mUnits.toFixed(2)),
      costToServe: mCosts.totalCostToServe,
      margin: mCosts.fullyLoadedMargin,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{client.name}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {client.subscriptionTier} &middot;{" "}
              {new Date(year, month - 1, 1).toLocaleDateString("en-AU", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/clients/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Link href={`/dashboard/reports?clientId=${id}`}>
            <Button size="sm">
              <FileText className="h-4 w-4" />
              Generate Report
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-slate-500 uppercase tracking-wide">Monthly Fee</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(client.monthlyFee)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-slate-500 uppercase tracking-wide">Open Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-slate-900">{openTasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-slate-500 uppercase tracking-wide">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-slate-900">{completedTasks.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-slate-500 uppercase tracking-wide">Weighted Units</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-slate-900">{completedWeightedUnits.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-slate-500 uppercase tracking-wide">Cost-to-Serve</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(costs.totalCostToServe)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs text-slate-500 uppercase tracking-wide">Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-slate-900">{formatPercent(costs.fullyLoadedMarginPct)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Category Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Task Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(categoryBreakdown).length === 0 ? (
              <p className="text-sm text-slate-500">No tasks this month.</p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(categoryBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, count]) => (
                    <li key={cat} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">{getCategoryLabel(cat)}</span>
                      <Badge variant="indigo">{count}</Badge>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Flags */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Flags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Out-of-Scope Tasks (open)</span>
              <Badge variant={outOfScopeCount > 0 ? "warning" : "default"}>
                {outOfScopeCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Urgent Open Tasks</span>
              <Badge variant={urgentCount > 0 ? "destructive" : "default"}>
                {urgentCount}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Team Members Assigned</span>
              <span className="text-slate-900 font-medium">
                {assignedMembers.length > 0 ? assignedMembers.join(", ") : "None"}
              </span>
            </div>
            {client.monthlyEffortAllowance && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Effort Allowance</span>
                <span className="text-slate-900 font-medium">
                  {completedWeightedUnits.toFixed(1)} / {client.monthlyEffortAllowance} units
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 6-Month Trend */}
      <Card>
        <CardHeader>
          <CardTitle>6-Month Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientTrendChart trendData={trendData} />
        </CardContent>
      </Card>

      {/* Open Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Open Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {openTasks.length === 0 ? (
            <p className="text-sm text-slate-500">No open tasks.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="pb-2 font-medium text-slate-500">Title</th>
                    <th className="pb-2 font-medium text-slate-500">Category</th>
                    <th className="pb-2 font-medium text-slate-500">Assignee</th>
                    <th className="pb-2 font-medium text-slate-500">Status</th>
                    <th className="pb-2 font-medium text-slate-500">Priority</th>
                    <th className="pb-2 font-medium text-slate-500 text-right">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {openTasks.map((task) => (
                    <tr key={task.id} className="border-b border-slate-100">
                      <td className="py-2">
                        <Link
                          href={`/dashboard/tasks/${task.id}`}
                          className="font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {task.title}
                          {task.outOfScope && (
                            <Badge variant="warning" className="ml-2 text-xs">OOS</Badge>
                          )}
                        </Link>
                      </td>
                      <td className="py-2 text-slate-600">{getCategoryLabel(task.category)}</td>
                      <td className="py-2 text-slate-600">{task.assignedTo?.name ?? "—"}</td>
                      <td className="py-2"><StatusBadge status={task.status} /></td>
                      <td className="py-2"><PriorityBadge priority={task.priority} /></td>
                      <td className="py-2 text-right text-slate-500">
                        {task.dueDate ? formatDate(task.dueDate) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Completed This Month</CardTitle>
        </CardHeader>
        <CardContent>
          {completedTasks.length === 0 ? (
            <p className="text-sm text-slate-500">No completed tasks this month.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="pb-2 font-medium text-slate-500">Title</th>
                    <th className="pb-2 font-medium text-slate-500">Category</th>
                    <th className="pb-2 font-medium text-slate-500">Assignee</th>
                    <th className="pb-2 font-medium text-slate-500 text-right">Weighted Units</th>
                    <th className="pb-2 font-medium text-slate-500 text-right">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTasks.map((task) => (
                    <tr key={task.id} className="border-b border-slate-100">
                      <td className="py-2">
                        <Link
                          href={`/dashboard/tasks/${task.id}`}
                          className="font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {task.title}
                        </Link>
                        {task.clientFacingSummary && (
                          <p className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">
                            {task.clientFacingSummary}
                          </p>
                        )}
                      </td>
                      <td className="py-2 text-slate-600">{getCategoryLabel(task.category)}</td>
                      <td className="py-2 text-slate-600">{task.assignedTo?.name ?? "—"}</td>
                      <td className="py-2 text-right text-slate-600">
                        {task.weightedEffortUnits.toFixed(2)}
                      </td>
                      <td className="py-2 text-right text-slate-500">
                        {task.completedAt ? formatDate(task.completedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
