"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCurrency } from "@/lib/utils"
import { Plus, Search } from "lucide-react"

interface Client {
  id: string
  name: string
  subscriptionTier: string
  monthlyFee: number
  status: string
  accountOwner: { id: string; name: string | null; email: string } | null
  _count: { tasks: number }
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ACTIVE":
      return <Badge variant="success">Active</Badge>
    case "PAUSED":
      return <Badge variant="warning">Paused</Badge>
    case "EXITED":
      return <Badge variant="destructive">Exited</Badge>
    default:
      return <Badge>{status}</Badge>
  }
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => {
        setClients(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-1">{clients.length} total clients</p>
        </div>
        <Button onClick={() => router.push("/dashboard/clients/new")}>
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search clients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {search ? "No clients match your search." : "No clients yet. Add your first client."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="pb-3 font-medium text-slate-500">Name</th>
                    <th className="pb-3 font-medium text-slate-500">Tier</th>
                    <th className="pb-3 font-medium text-slate-500 text-right">Monthly Fee</th>
                    <th className="pb-3 font-medium text-slate-500">Status</th>
                    <th className="pb-3 font-medium text-slate-500">Account Owner</th>
                    <th className="pb-3 font-medium text-slate-500 text-right">Tasks</th>
                    <th className="pb-3 font-medium text-slate-500 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((client) => (
                    <tr
                      key={client.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                    >
                      <td className="py-3 font-medium text-slate-900">{client.name}</td>
                      <td className="py-3 text-slate-600">{client.subscriptionTier}</td>
                      <td className="py-3 text-right text-slate-600">{formatCurrency(client.monthlyFee)}</td>
                      <td className="py-3">
                        <StatusBadge status={client.status} />
                      </td>
                      <td className="py-3 text-slate-600">
                        {client.accountOwner?.name ?? client.accountOwner?.email ?? "—"}
                      </td>
                      <td className="py-3 text-right text-slate-600">{client._count.tasks}</td>
                      <td className="py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push(`/dashboard/clients/${client.id}/edit`)
                          }}
                        >
                          Edit
                        </Button>
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
