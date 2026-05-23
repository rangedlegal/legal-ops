"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatDate } from "@/lib/utils"
import {
  TASK_CATEGORIES,
  TASK_STATUSES,
  TASK_PRIORITIES,
} from "@/lib/constants"
import { Plus, X } from "lucide-react"

interface Task {
  id: string
  title: string
  status: string
  priority: string
  complexity: string
  category: string
  weightedEffortUnits: number
  dueDate: string | null
  outOfScope: boolean
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

function PriorityBadge({ priority }: { priority: string }) {
  if (priority === "URGENT") return <Badge variant="destructive">Urgent</Badge>
  if (priority === "PRIORITY") return <Badge variant="warning">Priority</Badge>
  return <Badge variant="default">Normal</Badge>
}

export default function TasksPage() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState({
    clientId: "",
    assignedToId: "",
    status: "",
    priority: "",
    category: "",
  })

  const fetchTasks = useCallback(() => {
    const params = new URLSearchParams()
    if (filters.clientId) params.set("clientId", filters.clientId)
    if (filters.assignedToId) params.set("assignedToId", filters.assignedToId)
    if (filters.status) params.set("status", filters.status)
    if (filters.priority) params.set("priority", filters.priority)
    if (filters.category) params.set("category", filters.category)

    setLoading(true)
    fetch(`/api/tasks?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        setTasks(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [filters])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  useEffect(() => {
    Promise.all([
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/team-members").then((r) => r.json()),
    ]).then(([c, m]) => {
      setClients(Array.isArray(c) ? c : [])
      setTeamMembers(Array.isArray(m) ? m : [])
    })
  }, [])

  function setFilter(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function clearFilters() {
    setFilters({ clientId: "", assignedToId: "", status: "", priority: "", category: "" })
  }

  const hasFilters = Object.values(filters).some(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">{tasks.length} tasks</p>
        </div>
        <Button onClick={() => router.push("/dashboard/tasks/new")}>
          <Plus className="h-4 w-4" />
          Add Task
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filters.clientId || "__all__"} onValueChange={(v) => setFilter("clientId", v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Clients</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.assignedToId || "__all__"} onValueChange={(v) => setFilter("assignedToId", v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Assignees</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name ?? m.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.status || "__all__"} onValueChange={(v) => setFilter("status", v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                {TASK_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.priority || "__all__"} onValueChange={(v) => setFilter("priority", v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Priorities</SelectItem>
                {TASK_PRIORITIES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.category || "__all__"} onValueChange={(v) => setFilter("category", v === "__all__" ? "" : v)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Categories</SelectItem>
                {TASK_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No tasks found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="pb-3 font-medium text-slate-500">Title</th>
                    <th className="pb-3 font-medium text-slate-500">Client</th>
                    <th className="pb-3 font-medium text-slate-500">Assignee</th>
                    <th className="pb-3 font-medium text-slate-500">Status</th>
                    <th className="pb-3 font-medium text-slate-500">Priority</th>
                    <th className="pb-3 font-medium text-slate-500">Complexity</th>
                    <th className="pb-3 font-medium text-slate-500 text-right">Effort</th>
                    <th className="pb-3 font-medium text-slate-500 text-right">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/tasks/${task.id}`)}
                    >
                      <td className="py-2.5">
                        <span className="font-medium text-slate-900">{task.title}</span>
                        {task.outOfScope && (
                          <Badge variant="warning" className="ml-2 text-xs">OOS</Badge>
                        )}
                      </td>
                      <td className="py-2.5 text-slate-600">{task.client?.name ?? "—"}</td>
                      <td className="py-2.5 text-slate-600">{task.assignedTo?.name ?? "—"}</td>
                      <td className="py-2.5"><StatusBadge status={task.status} /></td>
                      <td className="py-2.5"><PriorityBadge priority={task.priority} /></td>
                      <td className="py-2.5 text-slate-600 capitalize">{task.complexity.toLowerCase()}</td>
                      <td className="py-2.5 text-right text-slate-600">
                        {task.weightedEffortUnits.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right text-slate-500">
                        {task.dueDate ? formatDate(task.dueDate) : "—"}
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
