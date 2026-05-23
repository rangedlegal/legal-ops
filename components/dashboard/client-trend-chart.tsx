"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface TrendPoint {
  month: string
  weightedUnits: number
  costToServe: number
  margin: number
}

interface Props {
  trendData: TrendPoint[]
}

export function ClientTrendChart({ trendData }: Props) {
  if (!trendData || trendData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-400">
        No trend data available.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorUnits" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: "#64748b" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
        <Area
          type="monotone"
          dataKey="weightedUnits"
          name="Weighted Units"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#colorUnits)"
        />
        <Area
          type="monotone"
          dataKey="costToServe"
          name="Cost to Serve ($)"
          stroke="#f59e0b"
          strokeWidth={2}
          fill="url(#colorCost)"
        />
        <Area
          type="monotone"
          dataKey="margin"
          name="Margin ($)"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#colorMargin)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
