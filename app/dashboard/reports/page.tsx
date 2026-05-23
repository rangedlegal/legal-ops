"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate, getMonthOptions } from "@/lib/utils"
import { TASK_CATEGORIES } from "@/lib/constants"
import { FileText, Download, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Client {
  id: string
  name: string
}

interface PastReport {
  id: string
  clientId: string
  month: number
  year: number
  reportTitle: string
  createdAt: string
  client: { id: string; name: string } | null
  generatedBy: { id: string; name: string | null } | null
}

interface ClientAnalytics {
  client: { name: string }
  month: number
  year: number
  completedTaskCount: number
  openTaskCount: number
  categoryBreakdown: Record<string, number>
  completedTasks: Array<{
    id: string
    title: string
    category: string
    status: string
    clientFacingSummary: string | null
    completedAt: string | null
  }>
  openTasks: Array<{
    id: string
    title: string
    category: string
    status: string
    clientFacingSummary: string | null
    dueDate: string | null
  }>
}

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  TASK_CATEGORIES.map((c) => [c.value, c.label]),
)

export default function ReportsPage() {
  const monthOptions = getMonthOptions(12)
  const [selectedMonth, setSelectedMonth] = useState(String(monthOptions[0].month))
  const [selectedYear, setSelectedYear] = useState(String(monthOptions[0].year))
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState("")
  const [preview, setPreview] = useState<ClientAnalytics | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [pastReports, setPastReports] = useState<PastReport[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/reports").then((r) => r.json()),
    ]).then(([c, r]) => {
      setClients(Array.isArray(c) ? c : [])
      setPastReports(Array.isArray(r) ? r : [])
    })
  }, [])

  function handleMonthChange(value: string) {
    const [m, y] = value.split("-")
    setSelectedMonth(m)
    setSelectedYear(y)
    setPreview(null)
  }

  const loadPreview = useCallback(() => {
    if (!selectedClientId) return
    setPreviewLoading(true)
    fetch(`/api/analytics/client/${selectedClientId}?month=${selectedMonth}&year=${selectedYear}`)
      .then((r) => r.json())
      .then((d) => {
        setPreview(d)
        setPreviewLoading(false)
      })
      .catch(() => setPreviewLoading(false))
  }, [selectedClientId, selectedMonth, selectedYear])

  async function handleGeneratePDF() {
    if (!selectedClientId) return
    setGenerating(true)
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear),
        }),
      })
      if (!res.ok) throw new Error("PDF generation failed")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const client = clients.find((c) => c.id === selectedClientId)
      const monthLabel = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1)
        .toLocaleDateString("en-AU", { month: "long", year: "numeric" })
        .replace(/\s+/g, "-")
      a.href = url
      a.download = `${(client?.name ?? "report").replace(/\s+/g, "-")}-${monthLabel}.pdf`
      a.click()
      URL.revokeObjectURL(url)

      // Save report record
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          month: parseInt(selectedMonth),
          year: parseInt(selectedYear),
          reportTitle: `${client?.name ?? "Client"} — ${new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1, 1).toLocaleDateString("en-AU", { month: "long", year: "numeric" })} Report`,
        }),
      })
      const updated = await fetch("/api/reports").then((r) => r.json())
      setPastReports(Array.isArray(updated) ? updated : [])
      toast.success("PDF report generated and saved")
    } catch {
      toast.error("Failed to generate PDF")
    } finally {
      setGenerating(false)
    }
  }

  const monthLabel = new Date(
    parseInt(selectedYear),
    parseInt(selectedMonth) - 1,
    1,
  ).toLocaleDateString("en-AU", { month: "long", year: "numeric" })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="text-sm text-slate-500 mt-1">Generate and download monthly client reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-slate-700">Period</p>
              <Select
                value={`${selectedMonth}-${selectedYear}`}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((opt) => (
                    <SelectItem key={`${opt.month}-${opt.year}`} value={`${opt.month}-${opt.year}`}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium text-slate-700">Client</p>
              <Select
                value={selectedClientId}
                onValueChange={(v) => {
                  setSelectedClientId(v)
                  setPreview(null)
                }}
              >
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={loadPreview}
              disabled={!selectedClientId || previewLoading}
              variant="outline"
            >
              {previewLoading ? "Loading..." : "Preview Report"}
            </Button>

            {preview && (
              <Button
                onClick={handleGeneratePDF}
                disabled={generating}
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Download className="h-4 w-4" /> Download PDF</>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle>
                  {preview.client.name} — {monthLabel}
                </CardTitle>
                <p className="text-sm text-slate-500 mt-1">Report preview</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{preview.completedTaskCount}</p>
                <p className="text-xs text-slate-500 mt-1">Completed Matters</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{preview.openTaskCount}</p>
                <p className="text-xs text-slate-500 mt-1">In Progress</p>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">
                  {Object.keys(preview.categoryBreakdown).length}
                </p>
                <p className="text-xs text-slate-500 mt-1">Practice Areas</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                Completed Matters (included in PDF)
              </h3>
              {preview.completedTasks.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No completed tasks this period.</p>
              ) : (
                <div className="space-y-2">
                  {preview.completedTasks.map((task) => (
                    <div key={task.id} className="rounded-md border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">{task.title}</p>
                          {task.clientFacingSummary ? (
                            <p className="text-xs text-slate-600 mt-1">{task.clientFacingSummary}</p>
                          ) : (
                            <p className="text-xs text-amber-600 mt-1 italic">
                              No client-facing summary — edit task to add one
                            </p>
                          )}
                        </div>
                        <Badge variant="indigo" className="shrink-0 text-xs">
                          {CATEGORY_LABELS[task.category] ?? task.category}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                In-Progress Matters (included in PDF)
              </h3>
              {preview.openTasks.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No open tasks.</p>
              ) : (
                <div className="space-y-1">
                  {preview.openTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
                    >
                      <p className="text-sm text-slate-700">{task.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_LABELS[task.category] ?? task.category}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {Object.keys(preview.categoryBreakdown).length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Activity by Practice Area</h3>
                <div className="rounded-md border border-slate-200 overflow-hidden">
                  {Object.entries(preview.categoryBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count], i) => (
                      <div
                        key={cat}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm ${
                          i % 2 === 0 ? "bg-white" : "bg-slate-50"
                        }`}
                      >
                        <span className="text-slate-700">{CATEGORY_LABELS[cat] ?? cat}</span>
                        <Badge variant="default">{count}</Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="rounded-md bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500">
              <strong className="text-slate-700">Note:</strong> The PDF will NOT include internal
              notes, cost-to-serve figures, margins, profitability data, or seniority multipliers.
              It includes client-facing summaries only.
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Past Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {pastReports.length === 0 ? (
            <p className="text-sm text-slate-500">No reports generated yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="pb-3 font-medium text-slate-500">Report</th>
                    <th className="pb-3 font-medium text-slate-500">Client</th>
                    <th className="pb-3 font-medium text-slate-500">Period</th>
                    <th className="pb-3 font-medium text-slate-500">Generated By</th>
                    <th className="pb-3 font-medium text-slate-500 text-right">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pastReports.map((report) => (
                    <tr key={report.id} className="border-b border-slate-100">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-900">{report.reportTitle}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-600">{report.client?.name ?? "—"}</td>
                      <td className="py-2.5 text-slate-600">
                        {new Date(report.year, report.month - 1, 1).toLocaleDateString("en-AU", {
                          month: "long",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-2.5 text-slate-600">{report.generatedBy?.name ?? "—"}</td>
                      <td className="py-2.5 text-right text-slate-500">
                        {formatDate(report.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
