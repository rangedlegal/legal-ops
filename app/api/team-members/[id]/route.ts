import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { teamMemberSchema } from "@/lib/validations"
import bcrypt from "bcryptjs"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const member = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, role: true, active: true,
      jobTitle: true, costRate: true, capacityUnits: true, seniorityMultiplier: true,
      createdAt: true,
      assignedTasks: {
        where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
        select: { id: true, title: true, status: true, priority: true, weightedEffortUnits: true },
      },
    },
  })

  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json(member)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const body = await req.json()
  const result = teamMemberSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { password, ...rest } = result.data
  const updateData: Record<string, unknown> = { ...rest, costRate: rest.costRate ?? null }

  if (password) {
    updateData.password = await bcrypt.hash(password, 12)
  }

  const member = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true, name: true, email: true, role: true, active: true,
      jobTitle: true, costRate: true, capacityUnits: true, seniorityMultiplier: true,
    },
  })

  return NextResponse.json(member)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  if (id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  await prisma.user.update({ where: { id }, data: { active: false } })

  return NextResponse.json({ success: true })
}
