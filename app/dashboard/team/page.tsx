"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface TeamMember {
  id: string
  name: string | null
  email: string
  role: string
  active: boolean
  jobTitle: string | null
  capacityUnits: number
  seniorityMultiplier: number
}

function RoleBadge({ role }: { role: string }) {
  if (role === "ADMIN") return <Badge variant="indigo">Admin</Badge>
  if (role === "VIEWER") return <Badge variant="default">Viewer</Badge>
  return <Badge variant="info">Team Member</Badge>
}

export default function TeamPage() {
  const router = useRouter()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/team-members")
      .then((r) => r.json())
      .then((data) => {
        setMembers(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-sm text-slate-500 mt-1">{members.length} members</p>
        </div>
        <Button onClick={() => router.push("/dashboard/team/new")}>
          <Plus className="h-4 w-4" />
          Add Member
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-slate-500">No team members yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="pb-3 font-medium text-slate-500">Name</th>
                    <th className="pb-3 font-medium text-slate-500">Email</th>
                    <th className="pb-3 font-medium text-slate-500">Role</th>
                    <th className="pb-3 font-medium text-slate-500">Job Title</th>
                    <th className="pb-3 font-medium text-slate-500 text-right">Seniority ×</th>
                    <th className="pb-3 font-medium text-slate-500 text-right">Capacity</th>
                    <th className="pb-3 font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/dashboard/team/${member.id}`)}
                    >
                      <td className="py-3 font-medium text-slate-900">
                        {member.name ?? "—"}
                      </td>
                      <td className="py-3 text-slate-600">{member.email}</td>
                      <td className="py-3">
                        <RoleBadge role={member.role} />
                      </td>
                      <td className="py-3 text-slate-600">{member.jobTitle ?? "—"}</td>
                      <td className="py-3 text-right text-slate-600">
                        {member.seniorityMultiplier.toFixed(1)}
                      </td>
                      <td className="py-3 text-right text-slate-600">
                        {member.capacityUnits} units
                      </td>
                      <td className="py-3">
                        {member.active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="default">Inactive</Badge>
                        )}
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
