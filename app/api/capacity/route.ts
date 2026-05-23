import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { capacitySchema } from "@/lib/validations"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1))
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()))

  const capacities = await prisma.teamMemberCapacity.findMany({
    where: { month, year },
    include: { user: { select: { id: true, name: true } } },
  })

  return NextResponse.json(capacities)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const result = capacitySchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { userId, month, year, capacityUnits, costPerUnit } = result.data

  const capacity = await prisma.teamMemberCapacity.upsert({
    where: { userId_month_year: { userId, month, year } },
    update: { capacityUnits, costPerUnit: costPerUnit ?? null },
    create: { userId, month, year, capacityUnits, costPerUnit: costPerUnit ?? null },
  })

  return NextResponse.json(capacity)
}
