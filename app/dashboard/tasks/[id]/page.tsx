"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  TASK_CATEGORIES,
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_COMPLEXITIES,
  INTAKE_SOURCES,
} from "@/lib/constants"
import { calculateWeightedEffort, URGENCY_MULTIPLIERS } from "@/lib/calculations"
import { formatDate } from "@/lib/utils"
import { ArrowLeft, Trash2 } from "lucide-react"

interface Task {
  id: string
  clientId: string
  title: string
  description: string | null
  category: string
  assignedToId: string | null
  reviewerId: string | null
  status: string
  priority: string
  complexity: string
  effortScore: number
  seniorityMultiplier: number
  urgencyMultiplier: number
  weightedEffortUnits: number
  dueDate: string | null
  completedAt: string | null
  intakeSource: string
  outOfScope: boolean
  internalNotes: string | null
  clientFacingSummary: string | null
  createdAt: string
  client: { id: string; name: string } | null
  assignedTo: { id: string; name: string | null } | null
}

interface Client {
  id: string
  name: string
}

interface TeamMember {
  id: string
  name: string | null
  email: string
  seniorityMultiplier: number
}

export default function TaskDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [task, setTask] = useState<Task | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    clientId: "",
    title: "",
    description: "",
    category: "CONTRACT_REVIEW",
    assignedToId: "",
    reviewerId: "",
    status: "NEW",
    priority: "NORMAL",
    complexity: "MEDIUM",
    effortScore: "3",
    dueDate: "",
    intakeSource: "MANUAL",
    outOfScope: false,
    internalNotes: "",
    clientFacingSummary: "",
  })

  useEffect(() => {
    Promise.all([
      fetch(`/api/tasks/${id}`).then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/team-members").then((r) => r.json()),
    ]).then(([t, c, m]) => {
      setClients(Array.isArray(c) ? c : [])
      setTeamMembers(Array.isArray(m) ? m : [])
      if (t && !t.error) {
        setTask(t)
        setForm({
          clientId: t.clientId ?? "",
          title: t.title ?? "",
          description: t.description ?? "",
          category: t.category ?? "CONTRACT_REVIEW",
          assignedToId: t.assignedToId ?? "",
          reviewerId: t.reviewerId ?? "",
          status: t.status ?? "NEW",
          priority: t.priority ?? "NORMAL",
          complexity: t.complexity ?? "MEDIUM",
          effortScore: String(t.effortScore ?? 3),
          dueDate: t.dueDate ? new Date(t.dueDate).toISOString().split("T")[0] : "",
          intakeSource: t.intakeSource ?? "MANUAL",
          outOfScope: t.outOfScope ?? false,
          internalNotes: t.internalNotes ?? "",
          clientFacingSummary: t.clientFacingSummary ?? "",
        })
      }
      setLoading(false)
    })
  }, [id])

  function handleChange(field: string, value: string | boolean) {
    setForm((prev) => {
      const updated = { ...prev, [field]: value }
      if (field === "complexity") {
        const scores: Record<string, string> = { LOW: "1", MEDIUM: "3", HIGH: "6", STRATEGIC: "10" }
        updated.effortScore = scores[value as string] ?? "3"
      }
      return updated
    })
  }

  const assignee = teamMembers.find((m) => m.id === form.assignedToId)
  const seniorityMultiplier = assignee?.seniorityMultiplier ?? task?.seniorityMultiplier ?? 1.0
  const urgencyMultiplier = URGENCY_MULTIPLIERS[form.priority] ?? 1.0
  const previewWeightedUnits = calculateWeightedEffort(
    parseFloat(form.effortScore) || 3,
    seniorityMultiplier,
    urgencyMultiplier,
  )

  async function handleSubmit(e?: React.FormEvent | React.MouseEvent) {
    e?.preventDefault()
    setSubmitting(true)
    setError(null)
    setSaved(false)

    const payload = {
      clientId: form.clientId,
      title: form.title,
      description: form.description || undefined,
      category: form.category,
      assignedToId: form.assignedToId || null,
      reviewerId: form.reviewerId || null,
      status: form.status,
      priority: form.priority,
      complexity: form.complexity,
      effortScore: parseFloat(form.effortScore),
      dueDate: form.dueDate || null,
      intakeSource: form.intakeSource,
      outOfScope: form.outOfScope,
      internalNotes: form.internalNotes || undefined,
      clientFacingSummary: form.clientFacingSummary || undefined,
    }

    const res = await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setSaved(true)
      const updated = await res.json()
      setTask(updated)
      setTimeout(() => setSaved(false), 2000)
    } else {
      const data = await res.json()
      setError(data?.error?.formErrors?.join(", ") || "Failed to save task.")
    }
    setSubmitting(false)
  }

  async function handleDelete() {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    if (res.ok) {
      router.push("/dashboard/tasks")
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-slate-500">Loading...</div>
  }

  if (!task) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Task not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{task.title}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {task.client?.name} &middot; Created {formatDate(task.createdAt)}
            </p>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{task.title}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {task.completedAt && (
        <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Completed on {formatDate(task.completedAt)}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Task Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {saved && (
              <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                Changes saved successfully.
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="clientId">Client *</Label>
                <Select
                  value={form.clientId}
                  onValueChange={(v) => handleChange("clientId", v)}
                >
                  <SelectTrigger id="clientId">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => handleChange("category", v)}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => handleChange("title", e.target.value)}
                  required
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => handleChange("status", v)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => handleChange("priority", v)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assignedToId">Assigned To</Label>
                <Select
                  value={form.assignedToId}
                  onValueChange={(v) => handleChange("assignedToId", v)}
                >
                  <SelectTrigger id="assignedToId">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name ?? m.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reviewerId">Reviewer</Label>
                <Select
                  value={form.reviewerId}
                  onValueChange={(v) => handleChange("reviewerId", v)}
                >
                  <SelectTrigger id="reviewerId">
                    <SelectValue placeholder="No reviewer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No reviewer</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name ?? m.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="complexity">Complexity</Label>
                <Select
                  value={form.complexity}
                  onValueChange={(v) => handleChange("complexity", v)}
                >
                  <SelectTrigger id="complexity">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_COMPLEXITIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label} (score: {c.effortScore})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="effortScore">Effort Score</Label>
                <Input
                  id="effortScore"
                  type="number"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={form.effortScore}
                  onChange={(e) => handleChange("effortScore", e.target.value)}
                />
                <p className="text-xs text-slate-500">
                  Weighted units preview:{" "}
                  <span className="font-semibold text-indigo-600">{previewWeightedUnits.toFixed(2)}</span>
                  {" "}(current saved: {task.weightedEffortUnits.toFixed(2)})
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => handleChange("dueDate", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="intakeSource">Intake Source</Label>
                <Select
                  value={form.intakeSource}
                  onValueChange={(v) => handleChange("intakeSource", v)}
                >
                  <SelectTrigger id="intakeSource">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTAKE_SOURCES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 flex items-center gap-3 rounded-md border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  id="outOfScope"
                  checked={form.outOfScope}
                  onChange={(e) => handleChange("outOfScope", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <div>
                  <Label htmlFor="outOfScope" className="cursor-pointer">Out of Scope</Label>
                  <p className="text-xs text-slate-500">Flag as outside retainer scope</p>
                </div>
                {form.outOfScope && <Badge variant="warning" className="ml-auto">Out of Scope</Badge>}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Internal Notes - not shown in PDF */}
      <Card className="border-amber-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800">
            Internal Notes
            <Badge variant="warning" className="text-xs">Not shown to client</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.internalNotes}
            onChange={(e) => handleChange("internalNotes", e.target.value)}
            placeholder="Internal notes for the team only. These will NOT appear in any client-facing PDF report."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* Client-Facing Summary - shown in PDF */}
      <Card className="border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-800">
            Client-Facing Summary
            <Badge variant="indigo" className="text-xs">Shown in PDF report</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.clientFacingSummary}
            onChange={(e) => handleChange("clientFacingSummary", e.target.value)}
            placeholder="This summary will appear in the monthly PDF report sent to the client. Keep it professional and client-appropriate."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </Button>
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
