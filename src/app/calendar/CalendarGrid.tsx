'use client'
import { CalendarDays, Wallet, Receipt } from 'lucide-react'
import { cn } from '@/lib/utils'

const fmtUSD = (c: number) => (c/100).toLocaleString(undefined,{style:'currency',currency:'USD'});

export default function CalendarGrid({ days, bufferCents }: { days: { date:string, balanceCents:number, pay?:number, bills?:number }[], bufferCents:number }){
  const monthKey = (d:string)=> d.slice(0,7)
  const groups = days.reduce((acc:any, x)=>{ (acc[monthKey(x.date)] ||= []).push(x); return acc }, {})
  
  // Add empty divs for weekday offset
  if (days.length > 0) {
    const firstDay = new Date(days[0].date + 'T00:00:00').getUTCDay();
    if (groups[monthKey(days[0].date)]) {
       const offset = Array.from({length: firstDay}, (_, i) => <div key={`offset-${i}`} />);
       groups[monthKey(days[0].date)] = [...offset, ...groups[monthKey(days[0].date)]]
    }
  }


  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([ym, rows]: any) => (
        <div key={ym} className="border rounded-lg bg-card">
          <div className="px-4 py-2 text-base font-semibold tracking-tight flex items-center gap-2 border-b"><CalendarDays className="w-5 h-5 text-muted-foreground" /> {new Date(ym + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
          <div className="grid grid-cols-7">
             <div className="text-center py-2 text-xs text-muted-foreground font-semibold border-b">Sun</div>
             <div className="text-center py-2 text-xs text-muted-foreground font-semibold border-b border-l">Mon</div>
             <div className="text-center py-2 text-xs text-muted-foreground font-semibold border-b border-l">Tue</div>
             <div className="text-center py-2 text-xs text-muted-foreground font-semibold border-b border-l">Wed</div>
             <div className="text-center py-2 text-xs text-muted-foreground font-semibold border-b border-l">Thu</div>
             <div className="text-center py-2 text-xs text-muted-foreground font-semibold border-b border-l">Fri</div>
             <div className="text-center py-2 text-xs text-muted-foreground font-semibold border-b border-l">Sat</div>
          </div>
          <div className="grid grid-cols-7">
            {rows.map((d:any, i: number) => d.date ? (
              <div key={d.date} className={cn("border-t border-l p-2 min-h-[90px] text-xs space-y-1 relative", 
                i % 7 === 0 && "border-l-0",
                d.balanceCents < 0 ? 'bg-destructive/10' : ''
              )}>
                <div className="flex items-start justify-between">
                    <span className='font-semibold text-muted-foreground'>{d.date.slice(8).replace(/^0/, '')}</span>
                    <span className={cn("font-semibold", d.balanceCents < 0 ? 'text-destructive' : 'text-primary')}>{fmtUSD(d.balanceCents)}</span>
                </div>
                <div className="space-y-0.5 pt-1">
                  {d.pay ? <div className="flex items-center gap-1.5 text-primary"><Wallet className="w-3.5 h-3.5" /> +{fmtUSD(d.pay)}</div> : null}
                  {d.bills ? <div className="flex items-center gap-1.5 text-destructive"><Receipt className="w-3.5 h-3.5" /> {fmtUSD(d.bills)}</div> : null}
                </div>
              </div>
            ) : <div key={`empty-${i}`} className={cn("border-t border-l", i % 7 === 0 && "border-l-0")}></div>
           )}
          </div>
        </div>
      ))}
    </div>
  )
}
    