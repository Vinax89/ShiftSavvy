
'use client'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

export default function DayDetails({ open, onOpenChange, day }:{ open:boolean, onOpenChange:(v:boolean)=>void, day: any }){
  const fmt = (c:number)=> (c/100).toLocaleString(undefined,{style:'currency',currency:'USD'})
  if (!day) return null
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[360px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>{new Date(day.date + "T00:00:00").toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</SheetTitle>
           <SheetDescription>
            Cashflow details for this day.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between p-3 rounded-md bg-muted">
            <span className="font-medium">End of Day Balance</span>
            <span className={`font-semibold ${day.balanceCents < 0 ? 'text-destructive' : 'text-foreground'}`}>{fmt(day.balanceCents)}</span>
          </div>
          {day.pay ? (
            <div className="flex items-center justify-between p-3 rounded-md border">
              <span>Pay Received</span>
              <span className="font-medium text-green-600">+{fmt(day.pay)}</span>
            </div>
          ) : null}
          {day.bills ? (
             <div className="flex items-center justify-between p-3 rounded-md border">
              <span>Bills Paid</span>
              <span className="font-medium text-red-600">{fmt(day.bills)}</span>
            </div>
          ) : null}
          
          {!day.pay && !day.bills && (
            <div className="text-center text-muted-foreground pt-8">
              <p>No transactions scheduled for this day.</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
