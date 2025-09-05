'use client'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'
import { evaluatePaycheck } from '@/domain'
import { SidebarProvider } from '@/components/ui/sidebar'
import AppSidebar from '@/components/app-sidebar'
import { SidebarInset } from '@/components/ui/sidebar'
import AppHeader from '@/components/app-header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { buildEstimateDoc, saveEstimate, listEstimates } from '@/data/paycheck-estimates'
import { fmtUSD } from '@/lib/money'

export default function PaycheckClient() {
  const [res, setRes] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [shifts, setShifts] = useState<any[]>([])
  const [tax, setTax] = useState<any>(null)
  const [policy, setPolicy] = useState<any>(null)
  const [ytd, setYtd] = useState<any>(null)
  const [recent, setRecent] = useState<any[]>([])

  const uid = 'demo-uid' // replace with real auth

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const q = query(collection(db, 'shifts'), where('userId', '==', uid))
        const snap = await getDocs(q)
        const shiftsData = snap.docs.map(d => d.data())
        setShifts(shiftsData)
        
        const taxSnap = await getDocs(query(collection(db, 'tax_profiles'), where('userId','==',uid)))
        if (taxSnap.empty) {
          console.error("No tax profile found for user. Make sure to seed the database first by running 'npm run seed:demo'.");
          setLoading(false);
          return;
        }
        const taxData = taxSnap.docs[0]?.data()
        setTax(taxData)

        const aPolicy = { baseRateCents: 4500, diffs: { nightBps: 2000, weekendBps: 1500, holidayBps: 10000, chargeAddlPerHourCents: 200, bonusPerShiftCents: 0 }, ot: { weeklyHours: 40, otMultiplierBps: 15000 } }
        setPolicy(aPolicy)
        
        const ytdData = { grossCents: 0 }
        setYtd(ytdData)

        setRes(evaluatePaycheck({ shifts: shiftsData, policy: aPolicy, tax: taxData, ytd: ytdData }))
        
        const recentEstimates = await listEstimates(uid);
        setRecent(recentEstimates);

      } catch (error) {
        console.error("Error calculating paycheck:", error)
      }
      setLoading(false)
    })()
  }, [])

  async function onSave() {
    if (!res) return;
    try {
      const doc = await buildEstimateDoc({ userId: uid, shifts, policy, tax, ytd, periodStart: '2025-09-01', periodEnd: '2025-09-14' })
      await saveEstimate(uid, doc)
      const newEstimates = await listEstimates(uid)
      setRecent(newEstimates)
    } catch(e) {
      console.error("Failed to save estimate", e)
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
              <CardTitle className="font-headline">Paycheck Estimate</CardTitle>
              <CardDescription>A projection of your net pay based on your shifts.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-1/3" />
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-8 w-1/4 mt-2" />
                </div>
              ) : res ? (
                <div className="space-y-2 text-lg">
                  <div className="flex justify-between"><span>Hours:</span> <strong>{res.hours.toFixed(2)}</strong> (OT: {res.otHours.toFixed(2)})</div>
                  <div className="flex justify-between"><span>Gross Pay:</span> <strong>{fmtUSD(res.grossCents)}</strong></div>
                  <div className="flex justify-between text-base text-muted-foreground pl-4"><span>Base:</span> <span>{fmtUSD(res.baseCents)}</span></div>
                  <div className="flex justify-between text-base text-muted-foreground pl-4"><span>Differentials:</span> <span>{fmtUSD(res.diffCents)}</span></div>
                  <div className="flex justify-between text-base text-muted-foreground pl-4"><span>Overtime:</span> <span>{fmtUSD(res.otPremiumCents)}</span></div>
                  <div className="flex justify-between"><span>Taxes:</span> <strong className='text-destructive'>-{fmtUSD(res.taxes.totalCents)}</strong></div>
                  <div className="flex justify-between text-base text-muted-foreground pl-4"><span>Federal:</span> <span>{fmtUSD(res.taxes.federalCents)}</span></div>
                  <div className="flex justify-between text-base text-muted-foreground pl-4"><span>State:</span> <span>{fmtUSD(res.taxes.stateCents)}</span></div>
                  <div className="flex justify-between text-base text-muted-foreground pl-4"><span>FICA:</span> <span>{fmtUSD(res.taxes.ficaCents)}</span></div>
                  <div className="font-bold text-2xl text-primary pt-4 flex justify-between"><span>Net Pay:</span> <span>{fmtUSD(res.netCents)}</span></div>
                  <div className="pt-4">
                    <Button onClick={onSave}>Save Estimate</Button>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                    <p>Could not calculate paycheck.</p>
                    <p className="text-sm">Have you run the database seeder? Try <code className="bg-muted px-1 py-0.5 rounded-sm">npm run seed:demo</code></p>
                </div>
              )}
            </CardContent>
          </Card>
          {recent.length > 0 && (
            <Card className="mt-4">
                <CardHeader>
                    <CardTitle className="font-headline">Recent Estimates</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm">
                        {recent.map(r => (
                          <li key={r.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted">
                            <span>Saved on {new Date(r.createdAt?.seconds*1000 ?? Date.now()).toLocaleString()}</span>
                            <span className="font-medium">{fmtUSD(r.result.netCents)}</span>
                          </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
