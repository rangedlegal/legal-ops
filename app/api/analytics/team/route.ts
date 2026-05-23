import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { calculateUtilisation } from "@/lib/calculations"
import { OPEN_TASK_STATUSES } from "@/lib/constants"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  const members = await prisma.user.findMany({
    where: { active: true },
    include: {
      capacities: { where: { month, year } },
      assignedTasks: {
        where: { status: { in: OPEN_TASK_STATUSES } },
        select: {
          id: true, title: true, status: true, priority: true,
          weightedEffortUnits: true, clientId: true,
          client: { select: { name: true } },
        },
      },
    },
  })

  const completedByUser = await prisma.task.groupBy({
    by: ["assignedToId"],
    where: { completedAt: { gte: start, lt: end } },
    _count: { id: true },
    _sum: { weightedEffortUnits: true },
  })
  const completedMap = new Map(
    completedByUser.map((r) => [r.assignedToId, { count: r._count.id, units: r._sum.weightedEffortUnits ?? 0 }]),
  )

  const result = members.map((member) => {
    const capacityOverride = member.capacities[0]
    const capacityUnits = capacityOverride?.capacityUnits ?? member.capacityUnits

    const assignedWeightedUnits = member.assignedTasks.reduce((s, t) => s + t.weightedEffortUnits, 0)
    const completed = completedMap.get(member.id) ?? { count: 0, units: 0 }

    const utilisation = calculateUtilisation(assignedWeightedUnits, completed.units, capacityUnits)
    const overCapacity = assignedWeightedUnits > capacityUnits
    const hasAtRiskTasks = member.assignedTasks.some((t) => t.priority === "URGENT")

    const clientNames = [...new Set(member.assignedTasks.map((t) => t.client?.name).filter(Boolean))]

    return {
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      jobTitle: member.jobTitle,
      capacityUnits,
      seniorityMultiplier: member.seniorityMultiplier,
      assignedTaskCount: member.assignedTasks.length,
      assignedWeightedUnits: parseFloat(assignedWeightedUnits.toFixed(2)),
      completedTaskCount: completed.count,
      completedWeightedUnits: parseFloat(completed.units.toFixed(2)),
      utilisation,
      overCapacity,
      hasAtRiskTasks,
      clients: clientNames,
      tasks: member.assignedTasks,
    }
  })

  return NextResponse.json({ month, year, members: result })
}
