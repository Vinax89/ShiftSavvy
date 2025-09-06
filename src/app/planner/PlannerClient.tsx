'use client'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'
import { SidebarProvider } from '@/components/ui/sidebar'
import AppSidebar from '@/components/app-sidebar'
import { SidebarInset } from '@/components/ui/sidebar'
import AppHeader from '@/components/app-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from '@/components/ui/table'
import { type Debt, type BNPL } from '@/domain/debt-planner.schema'
import { simulatePayoff, type MonthSchedule } from '@/domain/debt-planner'
import { fmtUSD } from '@/lib/money'
import { format } from 'date-fns'
import { nanoid } from 'nanoid'


export default function PlannerClient() {
  const [loading, setLoading] = useState(true)
  const [debts, setDebts] = useState<Debt[]>([])
  const [bnpl, setBnpl] = useState<BNPL[]>([])
  const [extraDebtBudgetCents, setExtraDebtBudgetCents] = useState(40000)
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche')
  const [schedule, setSchedule] = useState<MonthSchedule[] | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  const uid = 'demo-uid' // replace with real auth

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const debtQ = query(collection(db, 'debts_accounts'), where('userId', '==', uid));
        const debtSnap = await getDocs(debtQ);
        const debtData = debtSnap.docs.map(d => ({...d.data(), id: d.id } as Debt));
        setDebts(debtData);

        // Assuming no BNPL for now
        setBnpl([]);
        
      } catch (error) {
        console.error("Error fetching debt data:", error);
      }
      setLoading(false);
    })();
  }, [uid]);

  function handleRunSimulation() {
    if (!debts.length) return
    const plan = {
      strategy,
      startDate: format(new Date(), 'yyyy-MM-dd'),
      extraDebtBudgetCents,
      assumptions: { dayOfMonth: 15 }
    }
    const result = simulatePayoff({ debts, bnpl, plan });
    setSchedule(result);
  }
  
  async function handleSaveRun() {
    if (!schedule) return;
    setIsSaving(true);
    try {
        const batch = writeBatch(db);

        const planId = nanoid();
        const planRef = doc(db, "payoff_plans", planId);
        batch.set(planRef, {
            userId: uid,
            name: `${strategy.charAt(0).toUpperCase() + strategy.slice(1)} ${format(new Date(), 'MMM yyyy')}`,
            strategy,
            startDate: format(new Date(), 'yyyy-MM-dd'),
            extraDebtBudgetCents,
            assumptions: { interestModel: 'monthly', applyOrder: 'mins->bnpl->strategy', dayOfMonth: 15 },
            schemaVersion: 2,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const runId = nanoid();
        const runRef = doc(db, "payoff_plans_runs", runId);
        const totalInterestCents = schedule.reduce((sum, month) => sum + month.totals.interestCents, 0);
        const totalPaidCents = schedule.reduce((sum, month) => sum + month.totals.paidCents, 0);
        
        batch.set(runRef, {
            planId,
            userId: uid,
            planVersion: 1,
            inputsHash: "dummy-hash", // TODO: Implement hashing
            period: { from: schedule[0].ym, to: schedule[schedule.length - 1].ym },
            summary: {
                months: schedule.length,
                totalPaidCents,
                totalInterestCents,
                interestSavedVsMinOnlyCents: 0, // TODO
                accounts: debts.map(d => ({ accountId: d.id, payoffDate: "..." })) // TODO
            },
            schemaVersion: 2,
            createdAt: new Date(),
        });
        
        for (const month of schedule) {
            const scheduleRef = doc(db, `payoff_plans_runs/${runId}/schedule`, month.ym);
            batch.set(scheduleRef, {
                userId: uid,
                ym: month.ym,
                line: month.line,
                bnpl: month.bnpl,
                schemaVersion: 2,
            });
        }

        await batch.commit();
        alert('Plan saved!');

    } catch (error) {
        console.error("Error saving plan:", error);
        alert('Failed to save plan.');
    } finally {
        setIsSaving(false);
    }
  }


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
              {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-8 w-1/4" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-10 w-1/3 mt-2" />
                </div>
              ) : (
                <div className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="extra-budget">Extra Monthly Payment</Label>
                        <Input id="extra-budget" type="number" value={extraDebtBudgetCents/100} onChange={e => setExtraDebtBudgetCents(Number(e.target.value) * 100)} placeholder="400" />
                        <p className="text-sm text-muted-foreground">Amount you can pay towards debt beyond minimum payments.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Payoff Strategy</Label>
                         <RadioGroup defaultValue="avalanche" onValueChange={(v: 'avalanche' | 'snowball') => setStrategy(v)} className="flex gap-4">
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="avalanche" id="avalanche" />
                                <Label htmlFor="avalanche">Avalanche (highest interest first)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="snowball" id="snowball" />
                                <Label htmlFor="snowball">Snowball (smallest balance first)</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    
                    <Button onClick={handleRunSimulation} disabled={!debts.length}>Run Simulation</Button>

                    {schedule && (
                        <div className="space-y-4 pt-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-semibold font-headline">Payoff Schedule</h3>
                                <Button onClick={handleSaveRun} disabled={isSaving}>
                                    {isSaving ? 'Saving...' : 'Save Plan'}
                                </Button>
                            </div>
                            <Card className="max-h-[500px] overflow-auto">
                                <Table>
                                  <TableCaption>A month-by-month projection of your debt payoff.</TableCaption>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[100px]">Month</TableHead>
                                      {debts.map(d => <TableHead key={d.id}>{d.name}</TableHead>)}
                                       <TableHead className="text-right">Total Paid</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {schedule.map((month) => (
                                      <TableRow key={month.ym}>
                                        <TableCell className="font-medium">{month.ym}</TableCell>
                                        {debts.map(debt => {
                                            const line = month.line.find(l => l.accountId === debt.id);
                                            return <TableCell key={debt.id}>{line ? fmtUSD(line.endBalanceCents) : 'Paid off'}</TableCell>
                                        })}
                                        <TableCell className="text-right">{fmtUSD(month.totals.paidCents)}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                            </Card>
                        </div>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
