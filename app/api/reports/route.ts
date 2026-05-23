import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const clientId = searchParams.get("clientId")

  const reports = await prisma.report.findMany({
    where: clientId ? { clientId } : undefined,
    include: {
      client: { select: { id: true, name: true } },
      generatedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  })

  return NextResponse.json(reports)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { clientId, month, year, reportTitle, reportDataJson } = body

  if (!clientId || !month || !year) {
    return NextResponse.json({ error: "clientId, month, year are required" }, { status: 400 })
  }

  const report = await prisma.report.create({
    data: {
      clientId,
      month: parseInt(month),
      year: parseInt(year),
      reportTitle: reportTitle || `Monthly Report`,
      generatedById: session.user.id!,
      reportDataJson: reportDataJson ? JSON.stringify(reportDataJson) : null,
    },
    include: {
      client: { select: { id: true, name: true } },
      generatedBy: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(report, { status: 201 })
}
