import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { calculateCostToServe } from "@/lib/calculations"
import { OPEN_TASK_STATUSES } from "@/lib/constants"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  const client = await prisma.client.findUnique({ where: { id } })
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const settings = await prisma.firmSettings.findFirst()
  const blendedCostPerUnit = settings?.blendedCostPerUnit ?? 50
  const adminUpliftPct = settings?.adminUpliftPercentage ?? 10
  const overheadPct = settings?.overheadPercentage ?? 8

  const [completedTasks, openTasks, allTasks] = await Promise.all([
    prisma.task.findMany({
      where: { clientId: id, completedAt: { gte: start, lt: end } },
      include: { assignedTo: { select: { id: true, name: true } } },
    }),
    prisma.task.findMany({
      where: { clientId: id, status: { in: OPEN_TASK_STATUSES } },
      include: { assignedTo: { select: { id: true, name: true } } },
    }),
    prisma.task.findMany({
      where: { clientId: id, createdAt: { gte: start, lt: end } },
      select: { category: true, complexity: true, weightedEffortUnits: true, outOfScope: true, priority: true },
    }),
  ])

  const completedWeightedUnits = completedTasks.reduce((s, t) => s + t.weightedEffortUnits, 0)
  const openWeightedUnits = openTasks.reduce((s, t) => s + t.weightedEffortUnits, 0)
  const totalWeightedUnits = completedWeightedUnits

  const costs = calculateCostToServe(totalWeightedUnits, client.monthlyFee, blendedCostPerUnit, adminUpliftPct, overheadPct)

  const categoryBreakdown: Record<string, number> = {}
  const complexityBreakdown: Record<string, number> = {}
  for (const t of allTasks) {
    categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + 1
    complexityBreakdown[t.complexity] = (complexityBreakdown[t.complexity] || 0) + 1
  }

  const outOfScopeCount = openTasks.filter((t) => t.outOfScope).length
  const urgentCount = openTasks.filter((t) => t.priority === "URGENT").length

  const assignedMembers = [
    ...new Set([
      ...completedTasks.map((t) => t.assignedTo?.name).filter(Boolean),
      ...openTasks.map((t) => t.assignedTo?.name).filter(Boolean),
    ]),
  ]

  // Build trend: last 6 months
  const trendData = []
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

  return NextResponse.json({
    client,
    month,
    year,
    completedTaskCount: completedTasks.length,
    openTaskCount: openTasks.length,
    completedWeightedUnits: parseFloat(completedWeightedUnits.toFixed(2)),
    openWeightedUnits: parseFloat(openWeightedUnits.toFixed(2)),
    ...costs,
    categoryBreakdown,
    complexityBreakdown,
    outOfScopeCount,
    urgentCount,
    assignedMembers,
    completedTasks,
    openTasks,
    trendData,
  })
}
