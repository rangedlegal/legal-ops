"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { USER_ROLES, SENIORITY_PRESETS } from "@/lib/constants"
import { formatDate } from "@/lib/utils"
import { ArrowLeft } from "lucide-react"


interface TeamMember {
  id: string
  name: string | null
  email: string
  role: string
  active: boolean
  jobTitle: string | null
  costRate: number | null
  capacityUnits: number
  seniorityMultiplier: number
  createdAt: string
  assignedTasks?: Array<{
    id: string
    title: string
    status: string
    priority: string
    weightedEffortUnits: number
    dueDate?: string | null
  }>
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "info" | "indigo" | "warning" | "destructive" | "success" }> = {
    NEW: { label: "New", variant: "default" },
    ASSIGNED: { label: "Assigned", variant: "info" },
    IN_PROGRESS: { label: "In Progress", variant: "indigo" },
    WAITING_ON_CLIENT: { label: "Waiting on Client", variant: "warning" },
    WAITING_ON_THIRD_PARTY: { label: "Waiting on 3rd Party", variant: "warning" },
    COMPLETED: { label: "Completed", variant: "success" },
    CANCELLED: { label: "Cancelled", variant: "default" },
  }
  const s = map[status] ?? { label: status, variant: "default" as const }
  return <Badge variant={s.variant}>{s.label}</Badge>
}

export default function TeamMemberDetailPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const id = params.id

  const [member, setMember] = useState<TeamMember | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "TEAM_MEMBER",
    jobTitle: "",
    costRate: "",
    capacityUnits: "120",
    seniorityMultiplier: "1.0",
    active: true,
  })

  useEffect(() => {
    fetch(`/api/team-members/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setMember(data)
          setForm({
            name: data.name ?? "",
            email: data.email ?? "",
            role: data.role ?? "TEAM_MEMBER",
            jobTitle: data.jobTitle ?? "",
            costRate: data.costRate != null ? String(data.costRate) : "",
            capacityUnits: String(data.capacityUnits ?? 120),
            seniorityMultiplier: String(data.seniorityMultiplier ?? 1.0),
            active: data.active ?? true,
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  function handleChange(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSaved(false)

    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      jobTitle: form.jobTitle || undefined,
      costRate: form.costRate ? parseFloat(form.costRate) : undefined,
      capacityUnits: parseInt(form.capacityUnits),
      seniorityMultiplier: parseFloat(form.seniorityMultiplier),
      active: form.active,
    }

    const res = await fetch(`/api/team-members/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      setSaved(true)
      const updated = await res.json()
      setMember(updated)
      setTimeout(() => setSaved(false), 2000)
    } else {
      const data = await res.json()
      setError(
        typeof data?.error === "string"
          ? data.error
          : data?.error?.formErrors?.join(", ") || "Failed to update.",
      )
    }
    setSubmitting(false)
  }

  if (loading) {
    return <div className="text-center py-16 text-slate-500">Loading...</div>
  }

  if (!member) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500">Team member not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{member.name ?? member.email}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {member.jobTitle ?? "Team Member"} &middot; Member since {formatDate(member.createdAt)}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Details</CardTitle>
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
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Select value={form.role} onValueChange={(v) => handleChange("role", v)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  value={form.jobTitle}
                  onChange={(e) => handleChange("jobTitle", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="costRate">Cost Rate ($/hr)</Label>
                <Input
                  id="costRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costRate}
                  onChange={(e) => handleChange("costRate", e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="capacityUnits">Capacity Units / Month</Label>
                <Input
                  id="capacityUnits"
                  type="number"
                  min="0"
                  value={form.capacityUnits}
                  onChange={(e) => handleChange("capacityUnits", e.target.value)}
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label>Seniority Multiplier</Label>
                <div className="flex flex-wrap gap-2">
                  {SENIORITY_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => handleChange("seniorityMultiplier", String(preset.value))}
                      className={`rounded-md px-3 py-1.5 text-sm border transition-colors ${
                        parseFloat(form.seniorityMultiplier) === preset.value
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 font-medium"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {preset.label} <span className="text-xs opacity-70">×{preset.value}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Label htmlFor="seniorityMultiplier" className="text-xs text-slate-500">
                    Custom:
                  </Label>
                  <Input
                    id="seniorityMultiplier"
                    type="number"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={form.seniorityMultiplier}
                    onChange={(e) => handleChange("seniorityMultiplier", e.target.value)}
                    className="w-24"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 flex items-center gap-3 rounded-md border border-slate-200 px-4 py-3">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => handleChange("active", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                />
                <Label htmlFor="active" className="cursor-pointer">Active — can be assigned tasks</Label>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Assigned Tasks */}
      {member.assignedTasks && member.assignedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assigned Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="pb-2 font-medium text-slate-500">Title</th>
                    <th className="pb-2 font-medium text-slate-500">Status</th>
                    <th className="pb-2 font-medium text-slate-500 text-right">Effort Units</th>
                  </tr>
                </thead>
                <tbody>
                  {member.assignedTasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                    >
                      <td className="py-2 font-medium text-slate-900">{task.title}</td>
                      <td className="py-2"><StatusBadge status={task.status} /></td>
                      <td className="py-2 text-right text-slate-600">
                        {task.weightedEffortUnits.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
