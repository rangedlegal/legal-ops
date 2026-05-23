"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { ArrowLeft } from "lucide-react"

export default function NewTeamMemberPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "TEAM_MEMBER",
    jobTitle: "",
    costRate: "",
    capacityUnits: "120",
    seniorityMultiplier: "1.0",
    active: true,
    password: "",
  })

  function handleChange(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload = {
      name: form.name,
      email: form.email,
      role: form.role,
      jobTitle: form.jobTitle || undefined,
      costRate: form.costRate ? parseFloat(form.costRate) : undefined,
      capacityUnits: parseInt(form.capacityUnits),
      seniorityMultiplier: parseFloat(form.seniorityMultiplier),
      active: form.active,
      password: form.password || undefined,
    }

    const res = await fetch("/api/team-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      router.push("/dashboard/team")
    } else {
      const data = await res.json()
      setError(
        typeof data?.error === "string"
          ? data.error
          : data?.error?.formErrors?.join(", ") || "Failed to create team member.",
      )
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
          <h1 className="text-2xl font-bold text-slate-900">New Team Member</h1>
          <p className="text-sm text-slate-500 mt-0.5">Add someone to your legal team</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Member Details</CardTitle>
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
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Jane Smith"
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
                  placeholder="jane@firm.com"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => handleChange("role", v)}
                >
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
                  placeholder="Senior Associate"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="costRate">Cost Rate ($/hr, optional)</Label>
                <Input
                  id="costRate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costRate}
                  onChange={(e) => handleChange("costRate", e.target.value)}
                  placeholder="150.00"
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
                    Custom value:
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

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  placeholder="Min 6 characters (leave blank for default)"
                />
                <p className="text-xs text-slate-400">
                  Leave blank to use default password &quot;changeme123&quot;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Member"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/team")}
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
