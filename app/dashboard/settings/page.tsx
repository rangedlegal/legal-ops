"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Settings, Mail, MessageSquare, Video } from "lucide-react"

interface FirmSettings {
  id: string
  firmName: string
  blendedCostPerUnit: number
  adminUpliftPercentage: number
  overheadPercentage: number
  defaultCurrency: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<FirmSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    firmName: "",
    blendedCostPerUnit: "",
    adminUpliftPercentage: "",
    overheadPercentage: "",
    defaultCurrency: "AUD",
  })

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) {
          setSettings(data)
          setForm({
            firmName: data.firmName ?? "",
            blendedCostPerUnit: String(data.blendedCostPerUnit ?? 50),
            adminUpliftPercentage: String(data.adminUpliftPercentage ?? 10),
            overheadPercentage: String(data.overheadPercentage ?? 8),
            defaultCurrency: data.defaultCurrency ?? "AUD",
          })
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSaved(false)

    const payload = {
      firmName: form.firmName,
      blendedCostPerUnit: parseFloat(form.blendedCostPerUnit),
      adminUpliftPercentage: parseFloat(form.adminUpliftPercentage),
      overheadPercentage: parseFloat(form.overheadPercentage),
      defaultCurrency: form.defaultCurrency,
    }

    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const updated = await res.json()
      setSettings(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const data = await res.json()
      setError(data?.error?.formErrors?.join(", ") || "Failed to save settings.")
    }
    setSubmitting(false)
  }

  if (loading) {
    return <div className="text-center py-16 text-slate-500">Loading...</div>
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-slate-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Firm configuration and pricing</p>
        </div>
      </div>

      {/* Firm Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Firm Settings</CardTitle>
          <CardDescription>
            These values are used to calculate cost-to-serve and margin for all clients.
          </CardDescription>
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
                Settings saved successfully.
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="firmName">Firm Name</Label>
              <Input
                id="firmName"
                value={form.firmName}
                onChange={(e) => handleChange("firmName", e.target.value)}
                placeholder="Your Legal Firm"
                required
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="blendedCostPerUnit">
                  Blended Cost per Unit ($)
                </Label>
                <Input
                  id="blendedCostPerUnit"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.blendedCostPerUnit}
                  onChange={(e) => handleChange("blendedCostPerUnit", e.target.value)}
                  required
                />
                <p className="text-xs text-slate-400">
                  Base cost applied to each weighted effort unit. Used in labour cost calculation.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="defaultCurrency">Default Currency</Label>
                <Input
                  id="defaultCurrency"
                  value={form.defaultCurrency}
                  onChange={(e) => handleChange("defaultCurrency", e.target.value)}
                  placeholder="AUD"
                  maxLength={3}
                  required
                />
                <p className="text-xs text-slate-400">
                  ISO 4217 currency code (e.g. AUD, USD, GBP)
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="adminUpliftPercentage">
                  Admin Uplift (%)
                </Label>
                <Input
                  id="adminUpliftPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.adminUpliftPercentage}
                  onChange={(e) => handleChange("adminUpliftPercentage", e.target.value)}
                  required
                />
                <p className="text-xs text-slate-400">
                  Added to labour cost as a percentage uplift for admin overhead.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="overheadPercentage">
                  Overhead Percentage (%)
                </Label>
                <Input
                  id="overheadPercentage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.overheadPercentage}
                  onChange={(e) => handleChange("overheadPercentage", e.target.value)}
                  required
                />
                <p className="text-xs text-slate-400">
                  Applied to monthly fee to account for firm-level overheads.
                </p>
              </div>
            </div>

            {/* Cost formula hint */}
            <div className="rounded-md bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500 space-y-1">
              <p className="font-medium text-slate-700">How cost-to-serve is calculated:</p>
              <p>Labour Cost = Weighted Units × Blended Cost per Unit</p>
              <p>Admin Uplift = Labour Cost × Admin Uplift %</p>
              <p>Overhead = Monthly Fee × Overhead %</p>
              <p className="font-medium text-slate-700">Total = Labour + Admin Uplift + Overhead</p>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Integration Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Settings</CardTitle>
          <CardDescription>
            Connect external tools to automatically capture task intake.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Outlook */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Microsoft Outlook</p>
                <p className="text-sm text-slate-500">
                  Automatically create tasks from flagged emails
                </p>
              </div>
            </div>
            <Badge variant="warning">Coming Soon</Badge>
          </div>

          {/* Slack */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                <MessageSquare className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Slack</p>
                <p className="text-sm text-slate-500">
                  Capture tasks from Slack messages and reactions
                </p>
              </div>
            </div>
            <Badge variant="warning">Coming Soon</Badge>
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                <Video className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-slate-900">Microsoft Teams</p>
                <p className="text-sm text-slate-500">
                  Create tasks from Teams messages and meeting notes
                </p>
              </div>
            </div>
            <Badge variant="warning">Coming Soon</Badge>
          </div>

          <p className="text-xs text-slate-400 pt-1">
            Integration features are planned for a future release. Tasks can be manually created
            or imported in the meantime.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
