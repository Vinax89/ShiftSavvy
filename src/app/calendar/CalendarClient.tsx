'use client'
import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { buildForecast } from '@/domain/cashflow'
import { AppHeader } from '@/components/app-header'
import { SidebarProvider } from '@/components/ui/sidebar'
import AppSidebar from '@/components/app-sidebar'
import { SidebarInset } from '@/components/ui/sidebar'

const fmtUSD = (c:number)=> (c/100).toLocaleString(undefined,{ style:'currency', currency:'USD' })

export default function CalendarClient(){
  const uid = 'demo-uid'
  const [buffer, setBuffer] = useState(50000)
  const [from, setFrom] = useState(new Date().toISOString().slice(0,10))
  const [to, setTo] = useState(()=>{ const d = new Date(); d.setMonth(d.getMonth()+3); return d.toISOString().slice(0,10) })
  const [schedule, setSchedule] = useState<any>({ kind:'biweekly', anchor: from, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
  const [obligations, setObligations] = useState<any[]>([])
  const [res, setRes] = useState<any|null>(null)

  useEffect(()=>{ (async ()=>{
    const obs = (await getDocs(query(collection(db,'obligations'), where('userId','==',uid)))).docs.map(d=>({ id:d.id, ...d.data() }))
    setObligations(obs)
  })() },[])

  async function recompute(){
    const paycheck = { netForDate: (_d:string)=> 180000 } // $1,800 stub; later wire to estimator
    setRes(buildForecast({ schedule, obligations, paycheck, from, to, bufferCents: buffer }))
  }

  useEffect(()=>{ recompute() }, [buffer, from, to, schedule, obligations.length])

  const warning = res && res.summary.minBalanceCents < 0

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Cash Flow Forecast</CardTitle>
                <CardDescription>Project your cash balance based on paydays and bills.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
            <label className="block text-xs text-muted-foreground mb-1">Buffer (cents)</label>
            <Input type="number" value={buffer} onChange={e=>setBuffer(parseInt(e.target.value||'0',10))} />
            </div>
            <div>
            <label className="block text-xs text-muted-foreground mb-1">From</label>
            <Input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
            </div>
            <div>
            <label className="block text-xs text-muted-foreground mb-1">To</label>
            <Input type="date" value={to} onChange={e=>setTo(e.target.value)} />
            </div>
        </CardContent>
        </Card>

      {res && (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Forecast Details</CardTitle>
                <CardDescription>
                    Min balance: <span className={warning?'text-destructive font-medium':'font-medium'}>{fmtUSD(res.summary.minBalanceCents)}</span> • Shortfall days: <span className={warning?'text-destructive font-medium':'font-medium'}>{res.summary.shortfallDays}</span>
                </CardDescription>
            </CardHeader>
            <CardContent>
            <div className="space-y-1 text-sm">
                {res.events.map((e:any,i:number)=> (
                <div key={i} className="flex items-center justify-between border-b py-2">
                    <div>
                        <div className="font-medium">{e.date} • {e.kind==='pay'?'Payday':'Bill'}: {e.label}</div>
                        <div className="text-xs text-muted-foreground">Running balance: {fmtUSD(e.balanceCents)}</div>
                    </div>
                    <div className={`font-semibold ${e.amountCents<0?'text-destructive':'text-primary'}`}>{fmtUSD(e.amountCents)}</div>
                </div>
                ))}
            </div>
            </CardContent>
        </Card>
      )}
      </main>
    </SidebarInset>
    </SidebarProvider>
  )
}
