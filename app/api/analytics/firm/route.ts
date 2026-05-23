import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { calculateCostToServe } from "@/lib/calculations"
import { OPEN_TASK_STATUSES } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))

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

  const clientMetrics = activeClients.map((client) => {
    const totalUnits = client.tasks.reduce((sum, t) => sum + t.weightedEffortUnits, 0)
    const costs = calculateCostToServe(totalUnits, client.monthlyFee, blendedCostPerUnit, adminUpliftPct, overheadPct)
    return {
      id: client.id,
      name: client.name,
      monthlyFee: client.monthlyFee,
      ...costs,
    }
  })

  const totalCostToServe = clientMetrics.reduce((sum, c) => sum + c.totalCostToServe, 0)
  const avgMarginPct =
    clientMetrics.length > 0
      ? clientMetrics.reduce((sum, c) => sum + c.fullyLoadedMarginPct, 0) / clientMetrics.length
      : 0

  const openTasks = await prisma.task.count({ where: { status: { in: OPEN_TASK_STATUSES } } })
  const completedThisMonth = await prisma.task.count({ where: { completedAt: { gte: start, lt: end } } })
  const urgentTasks = await prisma.task.count({ where: { priority: "URGENT", status: { in: OPEN_TASK_STATUSES } } })
  const outOfScopeTasks = await prisma.task.count({ where: { outOfScope: true, status: { in: OPEN_TASK_STATUSES } } })

  const sorted = [...clientMetrics].sort((a, b) => b.fullyLoadedMarginPct - a.fullyLoadedMarginPct)
  const mostProfitable = sorted.slice(0, 3)
  const leastProfitable = sorted.slice(-3).reverse()
  const highestWorkload = [...clientMetrics]
    .sort((a, b) => b.labourCost - a.labourCost)
    .slice(0, 3)

  return NextResponse.json({
    month,
    year,
    totalRevenue,
    totalCostToServe,
    averageMarginPct: parseFloat(avgMarginPct.toFixed(1)),
    activeClientCount: activeClients.length,
    openTasks,
    completedThisMonth,
    urgentTasks,
    outOfScopeTasks,
    mostProfitable,
    leastProfitable,
    highestWorkload,
    clientMetrics,
  })
}
