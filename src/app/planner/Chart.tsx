
'use client'
import dynamic from 'next/dynamic'

// Wrap Recharts in a dynamic client module
const LineChart = dynamic(() => import('recharts').then(m => m.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(m => m.Line), { ssr: false })
const XAxis = dynamic(() => import('recharts').then(m => m.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(m => m.YAxis), { ssr: false })
const CartesianGrid = dynamic(() => import('recharts').then(m => m.CartesianGrid), { ssr: false })
const Tooltip = dynamic(() => import('recharts').then(m => m.Tooltip), { ssr: false })
const Legend = dynamic(() => import('recharts').then(m => m.Legend), { ssr: false })
const ResponsiveContainer = dynamic(
  () => import('recharts').then(m => m.ResponsiveContainer),
  { ssr: false }
)

export function BalanceChart({ data, fmtUSD }: { data: any[]; fmtUSD: (n:number)=>string }) {
  if (!data?.length) return null
  return (
    <div className="h-64">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="ym" minTickGap={24} fontSize={12} />
          <YAxis tickFormatter={(v)=>fmtUSD(Number(v))} fontSize={12} />
          <Tooltip formatter={(v:any)=>fmtUSD(Number(v))} labelFormatter={(l)=>l} />
          <Legend />
          <Line type="monotone" dataKey="plan" name="Plan balance" dot={false} stroke="hsl(var(--primary))" />
          <Line type="monotone" dataKey="baseline" name="Min-only balance" dot={false} strokeDasharray="5 5" stroke="hsl(var(--muted-foreground))"/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

    