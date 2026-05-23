"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  TASK_CATEGORIES,
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_COMPLEXITIES,
  INTAKE_SOURCES,
} from "@/lib/constants"
import { calculateWeightedEffort, URGENCY_MULTIPLIERS } from "@/lib/calculations"
import { ArrowLeft } from "lucide-react"

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

export default function NewTaskPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/team-members").then((r) => r.json()),
    ]).then(([c, m]) => {
      setClients(Array.isArray(c) ? c : [])
      setTeamMembers(Array.isArray(m) ? m : [])
    })
  }, [])

  function handleChange(field: string, value: string | boolean) {
    setForm((prev) => {
      const updated = { ...prev, [field]: value }
      // Auto-set effortScore from complexity
      if (field === "complexity") {
        const complexityScores: Record<string, string> = {
          LOW: "1",
          MEDIUM: "3",
          HIGH: "6",
          STRATEGIC: "10",
        }
        updated.effortScore = complexityScores[value as string] ?? "3"
      }
      return updated
    })
  }

  // Compute preview of weighted effort units
  const assignee = teamMembers.find((m) => m.id === form.assignedToId)
  const seniorityMultiplier = assignee?.seniorityMultiplier ?? 1.0
  const urgencyMultiplier = URGENCY_MULTIPLIERS[form.priority] ?? 1.0
  const previewWeightedUnits = calculateWeightedEffort(
    parseFloat(form.effortScore) || 3,
    seniorityMultiplier,
    urgencyMultiplier,
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

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

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      router.push("/dashboard/tasks")
    } else {
      const data = await res.json()
      setError(data?.error?.formErrors?.join(", ") || "Failed to create task.")
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Task</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create a new legal task</p>
        </div>
      </div>

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
                  placeholder="Brief description of the task"
                  required
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Detailed description..."
                  rows={3}
                />
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
                      <SelectItem key={m.id} value={m.id}>
                        {m.name ?? m.email}
                      </SelectItem>
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
                      <SelectItem key={m.id} value={m.id}>
                        {m.name ?? m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  Preview weighted units:{" "}
                  <span className="font-semibold text-indigo-600">{previewWeightedUnits.toFixed(2)}</span>
                  {form.assignedToId && (
                    <span className="ml-1 text-slate-400">
                      (seniority ×{seniorityMultiplier}, urgency ×{urgencyMultiplier})
                    </span>
                  )}
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
                  <p className="text-xs text-slate-500">
                    Flag this task as outside the retainer scope
                  </p>
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="internalNotes">
                  Internal Notes{" "}
                  <span className="text-xs text-slate-400 font-normal">(not shown to client)</span>
                </Label>
                <Textarea
                  id="internalNotes"
                  value={form.internalNotes}
                  onChange={(e) => handleChange("internalNotes", e.target.value)}
                  placeholder="Internal notes only visible to the team..."
                  rows={3}
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="clientFacingSummary">
                  Client-Facing Summary{" "}
                  <span className="text-xs text-slate-400 font-normal">(shown in PDF reports)</span>
                </Label>
                <Textarea
                  id="clientFacingSummary"
                  value={form.clientFacingSummary}
                  onChange={(e) => handleChange("clientFacingSummary", e.target.value)}
                  placeholder="Summary that appears in the monthly client report..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Task"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/tasks")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
