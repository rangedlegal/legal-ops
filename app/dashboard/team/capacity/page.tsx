"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatPercent, getMonthOptions } from "@/lib/utils"

interface MemberCapacity {
  id: string
  name: string | null
  email: string
  role: string
  jobTitle: string | null
  capacityUnits: number
  seniorityMultiplier: number
  assignedTaskCount: number
  assignedWeightedUnits: number
  completedTaskCount: number
  completedWeightedUnits: number
  utilisation: number
  overCapacity: boolean
  hasAtRiskTasks: boolean
  clients: string[]
}

interface TeamAnalytics {
  month: number
  year: number
  members: MemberCapacity[]
}

export default function CapacityPage() {
  const monthOptions = getMonthOptions(12)
  const [selectedMonth, setSelectedMonth] = useState(String(monthOptions[0].month))
  const [selectedYear, setSelectedYear] = useState(String(monthOptions[0].year))
  const [data, setData] = useState<TeamAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(() => {
    setLoading(true)
    fetch(`/api/analytics/team?month=${selectedMonth}&year=${selectedYear}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedMonth, selectedYear])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function handleMonthChange(value: string) {
    const [m, y] = value.split("-")
    setSelectedMonth(m)
    setSelectedYear(y)
  }

  const members = data?.members ?? []
  const overCapacityCount = members.filter((m) => m.overCapacity).length
  const avgUtilisation =
    members.length > 0
      ? members.reduce((s, m) => s + m.utilisation, 0) / members.length
      : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team Capacity</h1>
          <p className="text-sm text-slate-500 mt-1">Workload and utilisation by team member</p>
        </div>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 uppercase tracking-wide">Team Members</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{members.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 uppercase tracking-wide">Over Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold text-slate-900">{overCapacityCount}</p>
              {overCapacityCount > 0 && <Badge variant="destructive">Alert</Badge>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 uppercase tracking-wide">Avg Utilisation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{formatPercent(avgUtilisation)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-slate-500 uppercase tracking-wide">At-Risk Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {members.filter((m) => m.hasAtRiskTasks).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Member Cards */}
      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-slate-500">No active team members.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <Card
              key={member.id}
              className={member.overCapacity ? "border-red-200" : ""}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{member.name ?? member.email}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {member.jobTitle ?? member.role}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {member.overCapacity && (
                      <Badge variant="destructive" className="text-xs">Over Capacity</Badge>
                    )}
                    {member.hasAtRiskTasks && !member.overCapacity && (
                      <Badge variant="warning" className="text-xs">At Risk</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Utilisation Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500">Utilisation</span>
                    <span
                      className={`font-semibold ${
                        member.overCapacity
                          ? "text-red-600"
                          : member.utilisation > 80
                          ? "text-amber-600"
                          : "text-slate-700"
                      }`}
                    >
                      {formatPercent(member.utilisation)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(member.utilisation, 100)}
                    indicatorClassName={
                      member.overCapacity
                        ? "bg-red-500"
                        : member.utilisation > 80
                        ? "bg-amber-500"
                        : "bg-indigo-600"
                    }
                  />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-slate-500">Capacity</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {member.capacityUnits} units
                    </p>
                  </div>
                  <div className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-slate-500">Assigned</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {member.assignedWeightedUnits.toFixed(1)} units
                    </p>
                  </div>
                  <div className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-slate-500">Open Tasks</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {member.assignedTaskCount}
                    </p>
                  </div>
                  <div className="rounded-md bg-slate-50 px-3 py-2">
                    <p className="text-slate-500">Completed</p>
                    <p className="font-semibold text-slate-900 mt-0.5">
                      {member.completedTaskCount} ({member.completedWeightedUnits.toFixed(1)} units)
                    </p>
                  </div>
                </div>

                {/* Clients */}
                {member.clients.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5">Working on</p>
                    <div className="flex flex-wrap gap-1">
                      {member.clients.map((client) => (
                        <Badge key={client} variant="outline" className="text-xs">
                          {client}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
