import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { renderToBuffer } from "@react-pdf/renderer"
import { createElement } from "react"
import { ReportDocument } from "@/components/reports/pdf-document"
import type { ReportData } from "@/components/reports/pdf-document"
import { OPEN_TASK_STATUSES } from "@/lib/constants"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { clientId, month, year } = await req.json()
  if (!clientId || !month || !year) {
    return NextResponse.json({ error: "clientId, month, year required" }, { status: 400 })
  }

  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)

  const [client, settings, completedTasks, openTasks] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.firmSettings.findFirst(),
    prisma.task.findMany({
      where: { clientId, completedAt: { gte: start, lt: end } },
      include: { assignedTo: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: { clientId, status: { in: OPEN_TASK_STATUSES } },
      include: { assignedTo: { select: { name: true } } },
    }),
  ])

  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 })

  const categoryBreakdown: Record<string, number> = {}
  for (const t of [...completedTasks, ...openTasks]) {
    categoryBreakdown[t.category] = (categoryBreakdown[t.category] || 0) + 1
  }

  const reportData: ReportData = {
    firmName: settings?.firmName ?? "Legal Firm",
    clientName: client.name,
    month,
    year,
    completedTaskCount: completedTasks.length,
    openTaskCount: openTasks.length,
    completedTasks: completedTasks.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      status: t.status,
      clientFacingSummary: t.clientFacingSummary,
      completedAt: t.completedAt?.toISOString() ?? null,
      dueDate: null,
      assignedTo: t.assignedTo,
    })),
    openTasks: openTasks.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      status: t.status,
      clientFacingSummary: t.clientFacingSummary,
      completedAt: null,
      dueDate: t.dueDate?.toISOString() ?? null,
      assignedTo: t.assignedTo,
    })),
    categoryBreakdown,
  }

  const element = createElement(ReportDocument, { data: reportData })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await renderToBuffer(element as any)

  const monthName = new Date(year, month - 1, 1).toLocaleDateString("en-AU", { month: "long", year: "numeric" })
  const filename = `${client.name.replace(/\s+/g, "-")}-${monthName.replace(/\s+/g, "-")}-report.pdf`

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
