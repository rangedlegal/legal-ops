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
import { CLIENT_STATUSES } from "@/lib/constants"
import { ArrowLeft } from "lucide-react"

interface TeamMember {
  id: string
  name: string | null
  email: string
}

export default function NewClientPage() {
  const router = useRouter()
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: "",
    subscriptionTier: "",
    monthlyFee: "",
    billingStartDate: "",
    accountOwnerId: "",
    status: "ACTIVE",
    includedScope: "",
    excludedScope: "",
    monthlyEffortAllowance: "",
    notes: "",
  })

  useEffect(() => {
    fetch("/api/team-members")
      .then((r) => r.json())
      .then((data) => setTeamMembers(Array.isArray(data) ? data : []))
  }, [])

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const payload = {
      name: form.name,
      subscriptionTier: form.subscriptionTier,
      monthlyFee: parseFloat(form.monthlyFee),
      billingStartDate: form.billingStartDate,
      accountOwnerId: form.accountOwnerId,
      status: form.status,
      includedScope: form.includedScope || undefined,
      excludedScope: form.excludedScope || undefined,
      monthlyEffortAllowance: form.monthlyEffortAllowance
        ? parseInt(form.monthlyEffortAllowance)
        : undefined,
      notes: form.notes || undefined,
    }

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      router.push("/dashboard/clients")
    } else {
      const data = await res.json()
      setError(data?.error?.formErrors?.join(", ") || "Failed to create client.")
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
          <h1 className="text-2xl font-bold text-slate-900">New Client</h1>
          <p className="text-sm text-slate-500 mt-0.5">Add a new retainer client</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="name">Client Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Acme Corp"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="subscriptionTier">Subscription Tier *</Label>
                <Input
                  id="subscriptionTier"
                  value={form.subscriptionTier}
                  onChange={(e) => handleChange("subscriptionTier", e.target.value)}
                  placeholder="e.g. Standard, Premium, Enterprise"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="monthlyFee">Monthly Fee (AUD) *</Label>
                <Input
                  id="monthlyFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.monthlyFee}
                  onChange={(e) => handleChange("monthlyFee", e.target.value)}
                  placeholder="5000"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="billingStartDate">Billing Start Date *</Label>
                <Input
                  id="billingStartDate"
                  type="date"
                  value={form.billingStartDate}
                  onChange={(e) => handleChange("billingStartDate", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="accountOwnerId">Account Owner *</Label>
                <Select
                  value={form.accountOwnerId}
                  onValueChange={(v) => handleChange("accountOwnerId", v)}
                >
                  <SelectTrigger id="accountOwnerId">
                    <SelectValue placeholder="Select account owner" />
                  </SelectTrigger>
                  <SelectContent>
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
                    {CLIENT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="monthlyEffortAllowance">Monthly Effort Allowance (units)</Label>
                <Input
                  id="monthlyEffortAllowance"
                  type="number"
                  min="0"
                  value={form.monthlyEffortAllowance}
                  onChange={(e) => handleChange("monthlyEffortAllowance", e.target.value)}
                  placeholder="Optional cap"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="includedScope">Included Scope</Label>
                <Textarea
                  id="includedScope"
                  value={form.includedScope}
                  onChange={(e) => handleChange("includedScope", e.target.value)}
                  placeholder="Describe what is included in this retainer..."
                  rows={3}
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="excludedScope">Excluded Scope</Label>
                <Textarea
                  id="excludedScope"
                  value={form.excludedScope}
                  onChange={(e) => handleChange("excludedScope", e.target.value)}
                  placeholder="Describe what is excluded..."
                  rows={3}
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Internal notes (not shown to client)..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create Client"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/clients")}
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
