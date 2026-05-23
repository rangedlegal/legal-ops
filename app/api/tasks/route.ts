import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { taskSchema } from "@/lib/validations"
import { calculateWeightedEffort, URGENCY_MULTIPLIERS } from "@/lib/calculations"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("clientId")
  const assignedToId = searchParams.get("assignedToId")
  const status = searchParams.get("status")
  const priority = searchParams.get("priority")
  const category = searchParams.get("category")
  const month = searchParams.get("month")
  const year = searchParams.get("year")

  const where: Record<string, unknown> = {}
  if (clientId) where.clientId = clientId
  if (assignedToId) where.assignedToId = assignedToId
  if (status) where.status = status
  if (priority) where.priority = priority
  if (category) where.category = category

  if (month && year) {
    const start = new Date(parseInt(year), parseInt(month) - 1, 1)
    const end = new Date(parseInt(year), parseInt(month), 1)
    where.createdAt = { gte: start, lt: end }
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      client: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
      reviewer: { select: { id: true, name: true } },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  })

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const result = taskSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const data = result.data

  let seniorityMultiplier = 1.0
  if (data.assignedToId) {
    const user = await prisma.user.findUnique({ where: { id: data.assignedToId } })
    if (user) seniorityMultiplier = user.seniorityMultiplier
  }

  const urgencyMultiplier = URGENCY_MULTIPLIERS[data.priority] ?? 1.0
  const weightedEffortUnits = calculateWeightedEffort(data.effortScore, seniorityMultiplier, urgencyMultiplier)

  const status = data.assignedToId ? "ASSIGNED" : "NEW"

  const task = await prisma.task.create({
    data: {
      ...data,
      assignedToId: data.assignedToId ?? null,
      reviewerId: data.reviewerId ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      seniorityMultiplier,
      urgencyMultiplier,
      weightedEffortUnits,
      status: data.status === "NEW" && data.assignedToId ? status : data.status,
    },
    include: {
      client: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(task, { status: 201 })
}
