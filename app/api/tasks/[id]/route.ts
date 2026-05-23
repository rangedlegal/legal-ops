import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { taskSchema } from "@/lib/validations"
import { calculateWeightedEffort, URGENCY_MULTIPLIERS } from "@/lib/calculations"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      reviewer: { select: { id: true, name: true } },
    },
  })

  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(task)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
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

  const completedAt =
    data.status === "COMPLETED" ? new Date() : null

  const task = await prisma.task.update({
    where: { id },
    data: {
      ...data,
      assignedToId: data.assignedToId ?? null,
      reviewerId: data.reviewerId ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      seniorityMultiplier,
      urgencyMultiplier,
      weightedEffortUnits,
      completedAt,
    },
    include: {
      client: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(task)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  await prisma.task.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
