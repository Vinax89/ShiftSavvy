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

export default function PaycheckClient() {
  const [res, setRes] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const uid = 'demo-uid' // replace with real auth
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const q = query(collection(db, 'shifts'), where('userId', '==', uid))
        const snap = await getDocs(q)
        const shifts = snap.docs.map(d => d.data())
        const taxSnap = await getDocs(query(collection(db, 'tax_profiles'), where('userId','==',uid)))
        
        if (taxSnap.empty) {
          console.error("No tax profile found for user. Make sure to seed the database first by running 'npm run seed:demo'.");
          setLoading(false);
          return;
        }

        const tax = taxSnap.docs[0]?.data()
        const policy = { baseRate: 45, diffs: { nightPct: 0.2, weekendPct: 0.15, holidayPct: 1, chargeAddlPerHour: 2, bonusPerShift: 0 }, ot: { weeklyHours: 40, otMultiplier: 1.5 } }
        const ytd = { gross: 0 }
        setRes(evaluatePaycheck({ shifts, policy, tax, ytd }))
      } catch (error) {
        console.error("Error calculating paycheck:", error)
      }
      setLoading(false)
    })()
  }, [])

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
                  <div className="flex justify-between"><span>Gross Pay:</span> <strong>${res.gross.toFixed(2)}</strong></div>
                  <div className="flex justify-between text-base text-muted-foreground pl-4"><span>Base:</span> <span>${res.base.toFixed(2)}</span></div>
                  <div className="flex justify-between text-base text-muted-foreground pl-4"><span>Differentials:</span> <span>${res.diff.toFixed(2)}</span></div>
                  <div className="flex justify-between text-base text-muted-foreground pl-4"><span>Overtime:</span> <span>${res.ot.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Taxes:</span> <strong className='text-destructive'>-${res.taxes.total.toFixed(2)}</strong></div>
                  <div className="flex justify-between text-base text-muted-foreground pl-4"><span>Federal:</span> <span>${res.taxes.federal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-base text-muted-foreground pl-4"><span>State:</span> <span>${res.taxes.state.toFixed(2)}</span></div>
                  <div className="flex justify-between text-base text-muted-foreground pl-4"><span>FICA:</span> <span>${res.taxes.fica.toFixed(2)}</span></div>
                  <div className="font-bold text-2xl text-primary pt-4 flex justify-between"><span>Net Pay:</span> <span>${res.net.toFixed(2)}</span></div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                    <p>Could not calculate paycheck.</p>
                    <p className="text-sm">Have you run the database seeder? Try <code className="bg-muted px-1 py-0.5 rounded-sm">npm run seed:demo</code></p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
