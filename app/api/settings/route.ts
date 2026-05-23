import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { firmSettingsSchema } from "@/lib/validations"

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let settings = await prisma.firmSettings.findFirst()
  if (!settings) {
    settings = await prisma.firmSettings.create({ data: {} })
  }

  return NextResponse.json(settings)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const result = firmSettingsSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  let settings = await prisma.firmSettings.findFirst()
  if (settings) {
    settings = await prisma.firmSettings.update({ where: { id: settings.id }, data: result.data })
  } else {
    settings = await prisma.firmSettings.create({ data: result.data })
  }

  return NextResponse.json(settings)
}
