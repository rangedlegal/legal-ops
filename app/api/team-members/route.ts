import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { teamMemberSchema } from "@/lib/validations"
import bcrypt from "bcryptjs"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const members = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      jobTitle: true,
      costRate: true,
      capacityUnits: true,
      seniorityMultiplier: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  })

  return NextResponse.json(members)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const result = teamMemberSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { password, ...rest } = result.data

  const existing = await prisma.user.findUnique({ where: { email: rest.email } })
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 })

  const hashedPassword = password ? await bcrypt.hash(password, 12) : await bcrypt.hash("changeme123", 12)

  const member = await prisma.user.create({
    data: {
      ...rest,
      password: hashedPassword,
      costRate: rest.costRate ?? null,
    },
    select: {
      id: true, name: true, email: true, role: true, active: true,
      jobTitle: true, costRate: true, capacityUnits: true, seniorityMultiplier: true,
    },
  })

  return NextResponse.json(member, { status: 201 })
}
