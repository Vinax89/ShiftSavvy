
'use client'
import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { type Debt, type BNPL, type Plan } from '@/domain/debt-planner.schema'
import { simulatePayoff } from '@/domain/debt-planner'
import { simulateMinOnly, summarizeRun } from '@/domain/debt-planner.baseline'
import { findMonthlyMatches, findBnplMatch } from './reconcile'
import * as Sentry from '@sentry/nextjs'
import { SidebarProvider } from '@/components/ui/sidebar'
import AppSidebar from '@/components/app-sidebar'
import { SidebarInset } from '@/components/ui/sidebar'
import AppHeader from '@/components/app-header'
import { nanoid } from 'nanoid'
import { toast } from '@/components/ui/toast'
import BnplTimeline from './BnplTimeline'
import { BalanceChart } from './Chart'


const fmtUSD = (cents: number) => (cents/100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })

export default function PlannerClient() {
  const uid = 'demo-uid' // TODO: auth
  const [strategy, setStrategy] = useState<'avalanche'|'snowball'>('avalanche')
  const [startDate, setStartDate] = useState<string | null>(null)
  const [extra, setExtra] = useState<number>(40000)
  const [loading, setLoading] = useState(true)
  const [debts, setDebts] = useState<Debt[]>([])
  const [bnpl, setBnpl] = useState<BNPL[]>([])
  const [bnplObs, setBnplObs] = useState<any[]>([])
  const [bnplMatches, setBnplMatches] = useState<Record<string,string[]>>({})
  const [overrides, setOverrides] = useState<Record<string, number>>({})
  const [run, setRun] = useState<any[] | null>(null)
  const [baseline, setBaseline] = useState<any[] | null>(null)
  const [tab, setTab] = useState('schedule')

  useEffect(() => {
    setStartDate(new Date().toISOString().slice(0, 10));
  }, []);

  useEffect(() => { (async ()=>{
    const ds = (await getDocs(query(collection(db,'debts_accounts'), where('userId','==',uid)))).docs.map(d=>({ id:d.id, ...d.data() } as Debt))
    setDebts(ds)
    const obs = (await getDocs(query(collection(db,'obligations'), where('userId','==',uid)))).docs.map(d=>({ id:d.id, ...d.data() }))
    const bnplObsData = obs.filter(o=>o.kind ==='bnpl');
    setBnplObs(bnplObsData);
    // @ts-ignore
    setBnpl(bnplObsData.map(o=>({ id:o.id, name:o.name, installmentCents:o.installmentCents ?? o.amountCents, remainingInstallments:o.remainingInstallments ?? 0 })))
    const ov = (await getDocs(query(collection(db,'payoff_overrides'), where('userId','==',uid)))).docs.map(d => d.data())
    setOverrides(Object.fromEntries(ov.map(o => [o.ym, o.overrideExtraDebtBudgetCents])))

    const mm: Record<string,string[]> = {}
    for (const o of bnplObsData) {
      const seq = Array.from({ length: Math.min(6, o.remainingInstallments||0) }, (_,i)=>{
        const d = new Date(o.nextDueDate);
        const step = o.cadence === 'biweekly' ? 14 : 30;
        d.setDate(d.getDate() + i * step);
        return d.toISOString().slice(0,10)
      })
      for (const ymd of seq) {
        const ym = ymd.slice(0,7)
        const found = await findBnplMatch({ userId: uid, planId: o.id, ym })
        if (found.length) mm[`${o.id}|${ymd}`] = found.map(x=>x.id)
      }
    }
    setBnplMatches(mm)

  })() }, [uid])

  async function recompute() {
    if (!startDate) return;
    setLoading(true)
    Sentry.addBreadcrumb({ category:'planner', message:'recompute', level:'info', data:{ strategy, startDate, extra } })
    try {
      const plan: Plan = { strategy, startDate, extraDebtBudgetCents: extra, assumptions: { interestModel:'monthly', dayOfMonth: 15 } }
      // @ts-ignore
      const r = simulatePayoff({ debts, bnpl, plan, overrides })
      // @tsignore
      const b = simulateMinOnly({ debts, bnpl, plan, overrides })
      setRun(r); setBaseline(b)
    } finally { setLoading(false) }
  }

  // kick on first idle microtask
  useEffect(() => {
    if (startDate) {
        queueMicrotask(() => recompute().catch(() => {}));
    }
  }, [startDate]);

  // debounce subsequent recomputes
  useEffect(() => {
    const id = setTimeout(() => {
      recompute().catch(() => {});
    }, 120);
    return () => clearTimeout(id);
  }, [strategy, startDate, extra, debts.length, bnpl.length, overrides]);


  const summary = useMemo(() => run ? summarizeRun(run) : null, [run])
  const baseSummary = useMemo(() => baseline ? summarizeRun(baseline) : null, [baseline])
  const saved = useMemo(() => (summary && baseSummary) ? (baseSummary.totalInterestCents - summary.totalInterestCents) : 0, [summary, baseSummary])

  const mergedSeries = useMemo(() => {
    if (!run || !baseline) return []
    const planBalances = run.map(m => ({ ym: m.ym, plan: m.line.reduce((a: number, L: any)=> a + L.endBalanceCents, 0) }))
    const baselineBalances = baseline.map(m => ({ ym: m.ym, baseline: m.line.reduce((a: number, L: any)=> a + L.endBalanceCents, 0) }))
    
    const combined: Record<string, {ym: string, plan?: number, baseline?: number}> = {}
    planBalances.forEach(p => {
      combined[p.ym] = { ym: p.ym, plan: p.plan }
    });
    baselineBalances.forEach(b => {
      if (combined[b.ym]) {
        combined[b.ym].baseline = b.baseline
      } else {
        combined[b.ym] = { ym: b.ym, baseline: b.baseline }
      }
    })

    return Object.values(combined).sort((a,b) => a.ym.localeCompare(b.ym))
  }, [run, baseline])

  async function onSave() {
    if (!run || !summary || !startDate) return
    Sentry.addBreadcrumb({ category:'planner', message:'saveRun', level:'info' });
    const planRef = doc(collection(db,'payoff_plans'), nanoid())
    const runRef = doc(collection(db,'payoff_plans_runs'), nanoid())
    const batch = writeBatch(db)
    batch.set(planRef, { userId: uid, name:`${strategy} ${startDate}`, strategy, startDate, extraDebtBudgetCents: extra, assumptions:{ interestModel:'monthly', applyOrder:'mins->bnpl->strategy', dayOfMonth: 15 }, schemaVersion: 2, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    batch.set(runRef, { planId: planRef.id, userId: uid, planVersion: 1, inputsHash: 'TODO-hash', period: { from: run[0].ym+'-01', to: run[run.length-1].ym+'-01' }, summary: { months: summary.months, totalPaidCents: summary.totalPaidCents, totalInterestCents: summary.totalInterestCents, interestSavedVsMinOnlyCents: saved, accounts: Object.entries(summary.payoffDates).map(([accountId, payoffDate])=>({ accountId, payoffDate })) }, schemaVersion: 2, createdAt: serverTimestamp() })
    for (const m of run) {
      const schedRef = doc(collection(db,`payoff_plans_runs/${runRef.id}/schedule`), m.ym)
      batch.set(schedRef, { userId: uid, ym: m.ym, line: m.line, bnpl: m.bnpl, schemaVersion: 2 })
    }
    await batch.commit();
    toast.success('Plan saved', { description:`${summary.months} months, ${fmtUSD(summary.totalInterestCents)} interest` });
  }
  
  if (!startDate) return null; // or skeleton

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Card>
            <CardHeader>
              <CardTitle className="font-headline">Debt Payoff Planner</CardTitle>
              <CardDescription>Simulate and plan your debt-free journey.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Strategy</label>
                  <select className="w-full border rounded h-9 px-2 bg-background" value={strategy} onChange={e=>setStrategy(e.target.value as any)}>
                    <option value="avalanche">Avalanche (highest APR)</option>
                    <option value="snowball">Snowball (lowest balance)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Start date</label>
                  <Input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Extra budget ($/mo)</label>
                  <Input type="number" value={extra/100} onChange={e=>setExtra(parseInt(e.target.value||'0',10) * 100)} />
                </div>
                <Button onClick={recompute} disabled={loading}>{loading ? 'Running…' : 'Recompute'}</Button>
              </div>
            </CardContent>
          </Card>
      
      {summary && baseSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Forecast Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div><span className="text-muted-foreground">Payoff Months:</span> <span className="font-medium">{summary.months}</span></div>
            <div><span className="text-muted-foreground">Total Interest (Plan):</span> <span className="font-medium">{fmtUSD(summary.totalInterestCents)}</span></div>
            <div><span className="text-muted-foreground">Total Interest (Min-Only):</span> <span className="font-medium">{fmtUSD(baseSummary.totalInterestCents)}</span></div>
            <div><span className="text-muted-foreground">Interest Saved:</span> <span className="font-medium text-green-700 dark:text-green-400">{fmtUSD(saved)}</span></div>
          </div>
          {mergedSeries?.length ? <BalanceChart data={mergedSeries} fmtUSD={fmtUSD} /> : null}
          <div><Button onClick={onSave}>Save Run</Button></div>
          </CardContent>
        </Card>
      )}

      {run && (
        <Tabs value={tab} onValueChange={setTab} className="mt-4">
          <TabsList>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="bnpl">BNPL</TabsTrigger>
          </TabsList>
          <TabsContent value="schedule">
            <Card className="p-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr><th className="text-left p-2">Month</th><th className="text-left p-2">Account</th><th className="text-right p-2">Min</th><th className="text-right p-2">Extra</th><th className="text-right p-2">Interest</th><th className="text-right p-2">Principal</th><th className="text-right p-2">End Balance</th><th className="text-left p-2">Recon</th></tr></thead>
                <tbody>
                  {run.slice(0,12).flatMap((m: any, idx: number) => m.line.map((L: any, i: number) => (
                    <tr key={`${m.ym}-${L.accountId}`} className="border-t">
                      {i === 0 && <td className="p-2" rowSpan={m.line.length}>{m.ym}</td>}
                      <td className="p-2">{debts.find(d => d.id === L.accountId)?.name}</td>
                      <td className="p-2 text-right">{fmtUSD(L.minCents)}</td>
                      <td className="p-2 text-right">{fmtUSD(L.extraCents)}</td>
                      <td className="p-2 text-right text-destructive">{fmtUSD(L.interestCents)}</td>
                      <td className="p-2 text-right text-primary">{fmtUSD(L.principalCents)}</td>
                      <td className="p-2 text-right font-medium">{fmtUSD(L.endBalanceCents)}</td>
                      <td className="p-2">
                        <button className="underline text-xs" onClick={async ()=>{
                          const amount = L.minCents + L.extraCents
                          const matches = await findMonthlyMatches({ userId: uid, accountId: L.accountId, ym: m.ym, amountCents: amount })
                          if (matches.length) alert(`Matched ${matches[0].id}`); else alert('No match in transactions')
                        }}>match</button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
          <TabsContent value="accounts">
            <Card className="p-4">
              <table className="w-full text-sm">
                <thead><tr><th className="text-left p-2">Account</th><th className="text-left p-2">Payoff Date</th></tr></thead>
                <tbody>
                  {summary && Object.entries(summary.payoffDates).map(([id, date]) => (
                    <tr key={id} className="border-t"><td className="p-2">{debts.find(d => d.id === id)?.name}</td><td className="p-2">{date as string}</td></tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </TabsContent>
           <TabsContent value="bnpl">
              <BnplTimeline items={bnplObs} matches={bnplMatches} userId={uid} />
           </TabsContent>
        </Tabs>
      )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
