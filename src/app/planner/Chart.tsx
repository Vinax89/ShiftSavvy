'use client'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export function BalanceChart({ data, fmtUSD }: { data: any[]; fmtUSD: (n:number)=>string }) {
  if (!data?.length) return null
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="ym" minTickGap={24} />
          <YAxis tickFormatter={(v)=>fmtUSD(Number(v))} />
          <Tooltip formatter={(v:any)=>fmtUSD(Number(v))} labelFormatter={(l)=>l} />
          <Legend />
          <Line type="monotone" dataKey="plan" name="Plan balance" stroke="hsl(var(--primary))" dot={false} />
          <Line type="monotone" dataKey="baseline" name="Min-only balance" dot={false} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
