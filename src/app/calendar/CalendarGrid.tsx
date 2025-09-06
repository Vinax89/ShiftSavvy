
'use client'
import { CalendarDays, Wallet, Receipt, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const fmtUSD = (c: number) => (c/100).toLocaleString(undefined,{style:'currency',currency:'USD'});

export default function CalendarGrid({ 
    days, 
    bufferCents, 
    onDayClick,
    alertDates 
}:{ 
    days: { date:string, balanceCents:number, pay?:number, bills?:number }[], 
    bufferCents:number, 
    onDayClick: (d:any)=>void,
    alertDates: Set<string>
}){
  const [today, setToday] = useState('');

  useEffect(() => {
    setToday(new Date().toISOString().slice(0, 10));
  }, []);
  
  const monthKey = (d:string)=> d.slice(0,7)
  const groups = days.reduce((acc:any, x)=>{ (acc[monthKey(x.date)] ||= []).push(x); return acc }, {})
  const isWeekend = (ymd:string) => new Date(ymd + 'T00:00:00Z').getUTCDay() % 6 === 0;
  
  // Add empty divs for weekday offset
  if (days.length > 0) {
    const firstDate = days[0].date;
    const firstDayOfWeek = new Date(firstDate + 'T00:00:00Z').getUTCDay();
    const currentMonthKey = monthKey(firstDate);
    if (groups[currentMonthKey]) {
       const offset = Array.from({length: firstDayOfWeek}, (_, i) => <div key={`offset-${i}`} className="rounded-xl bg-slate-50/50" />);
       groups[currentMonthKey] = [...offset, ...groups[currentMonthKey]];
    }
  }
  
  // keyboard focus ring across cells
  const [focus, setFocus] = useState<string>('')
  const gridRef = useRef<HTMLDivElement>(null)
  useEffect(()=>{
    function onKey(e: KeyboardEvent){
      if (!gridRef.current) return
      const cells = Array.from(gridRef.current.querySelectorAll('[data-ymd]')) as HTMLElement[]
      if (!cells.length) return
      let idx = focus ? cells.findIndex(c=>c.dataset.ymd===focus) : 0
      if(idx === -1) idx = 0; // if focused element not found, start from first
      
      if (e.key==='ArrowRight') idx = Math.min(idx+1, cells.length-1)
      if (e.key==='ArrowLeft') idx = Math.max(idx-1, 0)
      if (e.key==='ArrowDown') idx = Math.min(idx+7, cells.length-1)
      if (e.key==='ArrowUp') idx = Math.max(idx-7, 0)
      
      const next = cells[idx]
      if (next){ setFocus(next.dataset.ymd!); next.focus(); e.preventDefault(); }
    }
    const gridEl = gridRef.current;
    gridEl?.addEventListener('keydown', onKey)
    return ()=> gridEl?.removeEventListener('keydown', onKey)
  }, [focus])

  return (
    <div className="space-y-6" ref={gridRef}>
      {Object.entries(groups).map(([ym, monthDays]: any) => (
        <div key={ym} className="rounded-2xl border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-2 bg-muted/50 text-base font-semibold tracking-tight flex items-center gap-2 border-b"><CalendarDays className="w-5 h-5 text-muted-foreground" /> {new Date(ym + '-02T00:00:00Z').toLocaleString('default', { month: 'long', year: 'numeric', timeZone:'UTC' })}</div>
           <div className="grid grid-cols-7 text-center py-2 text-xs text-muted-foreground font-semibold border-b bg-muted/20">
             <div>Sun</div>
             <div>Mon</div>
             <div>Tue</div>
             <div>Wed</div>
             <div>Thu</div>
             <div>Fri</div>
             <div>Sat</div>
          </div>
          <div className="grid grid-cols-7 gap-px bg-border/40">
            {monthDays.map((d:any, i: number) => d.date ? (
              <button
                key={d.date}
                data-ymd={d.date}
                onClick={()=>onDayClick(d)}
                onFocus={()=>setFocus(d.date)}
                className={cn(`p-2 min-h-[90px] text-xs space-y-1 text-left outline-none transition-shadow relative focus-visible:ring-2 focus-visible:ring-ring focus-visible:z-10`,
                  isWeekend(d.date) ? 'bg-muted/30' : 'bg-card',
                  d.balanceCents < 0 ? 'bg-destructive/10' : '',
                  alertDates.has(d.date) && 'bg-amber-500/10',
                  d.date === today ?'ring-2 ring-primary ring-offset-[-1px] z-10':'',
                  'hover:shadow-md hover:z-20'
                )}
                aria-label={`${d.date}, balance ${fmtUSD(d.balanceCents)}`}
              >
                <div className="flex items-start justify-between">
                    <span className={cn('font-semibold', d.date === today ? 'text-primary' : 'text-muted-foreground')}>{d.date.slice(8).replace(/^0/, '')}</span>
                    <span className={cn("font-semibold", d.balanceCents < 0 ? 'text-destructive' : 'text-foreground')}>{fmtUSD(d.balanceCents)}</span>
                </div>
                <div className="space-y-0.5 pt-1 text-foreground">
                  {d.pay ? <div className="flex items-center gap-1.5 text-green-700 dark:text-green-400"><Wallet className="w-3.5 h-3.5" /> +{fmtUSD(d.pay)}</div> : null}
                  {d.bills ? <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400"><Receipt className="w-3.5 h-3.5" /> {fmtUSD(d.bills)}</div> : null}
                </div>
                 {alertDates.has(d.date) && (
                    <Link href="/alerts" className="absolute bottom-1 right-1 text-amber-500 hover:text-amber-600" aria-label="View alerts for this day">
                        <TriangleAlert className="w-4 h-4" />
                    </Link>
                )}
              </button>
            ) : <div key={`empty-${i}`} className={cn(isWeekend(days[i]?.date) ? 'bg-muted/30' : 'bg-card')}>{d}</div>
           )}
          </div>
        </div>
      ))}
    </div>
  )
}
