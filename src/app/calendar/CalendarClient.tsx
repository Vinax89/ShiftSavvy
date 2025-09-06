
'use client'
import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'
import { buildForecast, enumeratePaydays, type CFEvent } from '@/domain/cashflow'
import { toDailySeries } from '@/domain/cashflow.series'
import AppSidebar from '@/components/app-sidebar'
import { getNetForPayday } from '@/lib/netpay'
import CalendarGrid from './CalendarGrid'
import { exportForecastCSV } from './export'
import { toast } from '@/components/ui/toast'
import CalendarHeader from './CalendarHeader'
import DayDetails from './DayDetails'
import SettingsDrawer from './SettingsDrawer'
import { useAlerts } from '@/hooks/useAlerts'

const fmtUSD = (c:number)=> (c/100).toLocaleString(undefined,{ style:'currency', currency:'USD' })

export default function CalendarClient(){
  const uid = 'demo-uid'
  
  const [buffer, setBuffer] = useState(50000)
  const [range, setRange] = useState(90)
  const [from, setFrom] = useState<string | null>(null)
  const [to, setTo] = useState<string | null>(null)

  const [schedule, setSchedule] = useState<any>({ kind:'biweekly', anchor: '2025-01-03', timezone: 'UTC' })
  const [obligations, setObligations] = useState<any[]>([])
  const [res, setRes] = useState<{events: CFEvent[], summary: any} | null>(null)
  
  const [filters,setFilters] = useState({ showPay:true, showBills:true })
  const [drawerOpen,setDrawerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [activeDay,setActiveDay] = useState<any>(null)
  
  const alerts = useAlerts(uid);

  const alertDates = useMemo(() => {
    if (!alerts) return new Set<string>();
    const dates = new Set<string>();
    alerts.forEach(alert => {
      if (alert.dueDate) {
        dates.add(alert.dueDate);
      }
      if (alert.type === 'buffer-risk') {
        // Highlight next 7 days from today
        const today = new Date();
        for (let i=0; i<7; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            dates.add(d.toISOString().slice(0,10));
        }
      }
    });
    return dates;
  }, [alerts]);

  useEffect(() => {
    // Set timezone and initial dates on client-side to avoid hydration mismatch
    setSchedule((prev: any) => ({ ...prev, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }));
    const today = new Date().toISOString().slice(0,10);
    setFrom(today);
  }, []);

  useEffect(() => {
    if (from) {
      const newTo = new Date(from);
      newTo.setDate(newTo.getDate() + range);
      setTo(newTo.toISOString().slice(0, 10));
    }
  }, [range, from]);

  useEffect(()=>{ (async ()=>{
    const obs = (await getDocs(query(collection(db,'obligations'), where('userId','==',uid)))).docs.map(d=>({ id:d.id, ...d.data() }))
    setObligations(obs)
  })() },[])

  async function recompute() {
    if (!from || !to) return;
    try {
      const paydays = enumeratePaydays(schedule, from, to) 
      const nets: Record<string, number> = {}
      for (const d of paydays) {
        nets[d] = await getNetForPayday({ userId: uid, paydayYMD: d, schedule })
      }
      const paycheckProvider = { netForDate: (d:string)=> nets[d] ?? 0 }
      
      const forecastResult = buildForecast({ schedule, obligations, paycheckProvider, from, to, bufferCents: buffer });
      setRes(forecastResult);
      toast.success('Forecast updated', { description: `${forecastResult.events.length} events across ${range} days` });
    } catch (err) {
       toast.error('Something went wrong', { description: String(err) });
    }
  }

  useEffect(()=>{ recompute() }, [buffer, from, to, schedule, obligations.length])

  const warning = res && res.summary.minBalanceCents < 0
  const daily = useMemo(() => (res && from && to) ? toDailySeries(res.events, from, to, buffer) : [], [res, from, to, buffer])

  async function applyPlannerOverride(ym: string, neededDeltaCents: number) {
    const id = `${uid}_${ym}`
    await setDoc(doc(db, 'payoff_overrides', id), { userId: uid, ym, overrideExtraDebtBudgetCents: -Math.abs(neededDeltaCents), reason: 'shortfall', schemaVersion: 2 })
    toast.success('Override saved', { description: `Applied for ${ym}` })
  }

  function onDayClick(d:any){ setActiveDay(d); setDrawerOpen(true) }
  
  function handleExport() {
    if (res) {
      exportForecastCSV(res.events)
      toast.info('CSV exported', { description: 'Your forecast CSV has been downloaded.' })
    }
  }
  
  if (!from || !to) {
    return null; // Or a loading skeleton
  }

  return (
    <>
      <AppSidebar />
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <header className="h-12 flex items-center px-4 border-b mb-4">
            <h1 className="text-lg font-semibold">Cashflow</h1>
        </header>
        <CalendarHeader
          minBalanceCents={res?.summary.minBalanceCents ?? 0}
          shortfallDays={res?.summary.shortfallDays ?? 0}
          range={range} setRange={setRange}
          filters={filters} setFilters={setFilters}
          onExport={handleExport}
          onSettings={() => setSettingsOpen(true)}
        />

        {res && (
          <>
            {warning && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
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
            <CalendarGrid 
              days={daily.filter(d=> (filters.showPay || !d.pay) && (filters.showBills || !d.bills))} 
              bufferCents={buffer} 
              onDayClick={onDayClick}
              alertDates={alertDates} 
            />
          </>
        )}
        <DayDetails open={drawerOpen} onOpenChange={setDrawerOpen} day={activeDay} />
        <SettingsDrawer 
          open={settingsOpen} 
          onOpenChange={setSettingsOpen} 
          schedule={schedule} 
          setSchedule={setSchedule} 
          buffer={buffer} 
          setBuffer={setBuffer}
        />
      </main>
    </>
  )
}
