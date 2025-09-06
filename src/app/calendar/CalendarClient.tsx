'use client'
import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { buildForecast, type CFEvent } from '@/domain/cashflow'
import { toDailySeries } from '@/domain/cashflow.series'
import { AppHeader } from '@/components/app-header'
import { SidebarProvider } from '@/components/ui/sidebar'
import AppSidebar from '@/components/app-sidebar'
import { SidebarInset } from '@/components/ui/sidebar'
import { getNetForPayday } from '@/lib/netpay'
import CalendarGrid from './CalendarGrid'
import { exportForecastCSV } from './export'


const fmtUSD = (c:number)=> (c/100).toLocaleString(undefined,{ style:'currency', currency:'USD' })

export default function CalendarClient(){
  const uid = 'demo-uid'
  const [buffer, setBuffer] = useState(50000)
  const [from, setFrom] = useState(new Date().toISOString().slice(0,10))
  const [to, setTo] = useState(()=>{ const d = new Date(); d.setMonth(d.getMonth()+3); return d.toISOString().slice(0,10) })
  const [schedule, setSchedule] = useState<any>({ kind:'biweekly', anchor: from, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })
  const [obligations, setObligations] = useState<any[]>([])
  const [res, setRes] = useState<{events: CFEvent[], summary: any} | null>(null)

  useEffect(()=>{ (async ()=>{
    const obs = (await getDocs(query(collection(db,'obligations'), where('userId','==',uid)))).docs.map(d=>({ id:d.id, ...d.data() }))
    setObligations(obs)
  })() },[])

  async function recompute() {
    const paycheckProvider = {
      getNetForDate: async (d: string) => {
        return getNetForPayday({ userId: uid, paydayYMD: d, schedule });
      },
    };
    
    setRes(await buildForecast({ schedule, obligations, paycheckProvider, from, to, bufferCents: buffer }));
  }

  useEffect(()=>{ recompute() }, [buffer, from, to, schedule, obligations.length])

  const warning = res && res.summary.minBalanceCents < 0
  const daily = useMemo(() => res ? toDailySeries(res.events, from, to, buffer) : [], [res, from, to, buffer])

  async function applyPlannerOverride(ym: string, neededDeltaCents: number) {
    const id = `${uid}_${ym}`
    await setDoc(doc(db, 'payoff_overrides', id), { userId: uid, ym, overrideExtraDebtBudgetCents: -Math.abs(neededDeltaCents), reason: 'shortfall', schemaVersion: 2 })
    alert(`Planner override saved for ${ym}`)
  }


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
                  <div className='flex justify-between items-center'>
                    <CardDescription>
                        Min balance: <span className={warning?'text-destructive font-medium':'font-medium'}>{fmtUSD(res.summary.minBalanceCents)}</span> • Shortfall days: <span className={warning?'text-destructive font-medium':'font-medium'}>{res.summary.shortfallDays}</span>
                    </CardDescription>
                    <Button variant="secondary" onClick={()=> res && exportForecastCSV(res.events)} disabled={!res}>Export CSV</Button>
                  </div>
              </CardHeader>
              <CardContent>
                {warning && (
                  <div className="p-3 rounded bg-red-50/50 dark:bg-red-900/20 border border-destructive/20 text-sm mb-4">
                    <p className='font-medium text-destructive'>Forecast dips below zero.</p>
                    <p className='text-muted-foreground mt-1'>Consider reducing extra debt budget for the affected months to ensure you can cover your bills.</p>
                    <div className="pt-2 flex gap-2 flex-wrap">
                      {[...new Set(res.events.filter(e=>e.balanceCents < 0).map(e=>e.date.slice(0,7)))].map(ym => (
                        <Button key={ym} size="sm" variant="destructive" onClick={()=> applyPlannerOverride(ym, Math.abs(res.summary.minBalanceCents))}>
                          Apply Override for {ym}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <CalendarGrid days={daily} bufferCents={buffer} />
              </CardContent>
          </Card>
        )}
      </main>
    </SidebarInset>
    </SidebarProvider>
  )
}

    