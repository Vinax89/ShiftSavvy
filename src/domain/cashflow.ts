

import { ZPaySchedule, type PaySchedule } from './pay-schedule.schema'
import { dayjs } from '@/lib/dayjs'


export type CFEvent = { date: string, kind: 'pay'|'obligation', label: string, amountCents: number, balanceCents: number }
export type CFResult = { events: CFEvent[], summary: { minBalanceCents: number, shortfallDays: number } }

export function enumeratePaydays(ps: unknown, fromYMD: string, toYMD: string): string[] {
  const p = ZPaySchedule.parse(ps)
  const from = dayjs.tz(fromYMD, p.timezone)
  const to = dayjs.tz(toYMD, p.timezone)
  const dates: string[] = []
  
  if (p.kind === 'weekly' || p.kind === 'biweekly') {
    const step = p.kind === 'weekly' ? 7 : 14
    let d = dayjs.tz(p.anchor, p.timezone)
    while (d.isBefore(from)) d = d.add(step, 'day')
    for (; d.isSameOrBefore(to); d = d.add(step, 'day')) {
        if(d.isSameOrAfter(from)) dates.push(d.format('YYYY-MM-DD'))
    }
  } else if (p.kind === 'semimonthly' && p.days?.length) {
    let d = from.startOf('month')
    for (let cur = d; cur.isSameOrBefore(to); cur = cur.add(1,'month')) {
      for (const dd of p.days) {
          const payday = cur.date(dd)
          if (payday.isSameOrBefore(to) && payday.isSameOrAfter(from)) {
            dates.push(payday.format('YYYY-MM-DD'))
          }
      }
    }
  } else if (p.kind === 'monthly' && p.day) {
    let d = from.startOf('month')
    for (let cur = d; cur.isSameOrBefore(to); cur = cur.add(1,'month')) {
      const last = cur.daysInMonth()
      const day = Math.min(p.day, last)
      const payday = cur.date(day)
       if (payday.isSameOrBefore(to) && payday.isSameOrAfter(from)) {
          dates.push(payday.format('YYYY-MM-DD'))
       }
    }
  }
  return dates.sort();
}

export async function buildForecast(params: {
  schedule: unknown
  obligations: { name: string, amountCents: number, cadence: 'monthly'|'weekly'|'semimonthly'|'biweekly'|'onetime', nextDueDate: string }[]
  paycheckProvider: { getNetForDate: (d: string) => Promise<number> }
  from: string, to: string, bufferCents: number
}): Promise<CFResult> {
  const ps = ZPaySchedule.parse(params.schedule)
  const paydays = enumeratePaydays(ps, params.from, params.to)
  const events: Omit<CFEvent, 'balanceCents'>[] = []
  
  const nets = await Promise.all(paydays.map(d => params.paycheckProvider.getNetForDate(d)))

  for (let i = 0; i < paydays.length; i++) {
    events.push({ date: paydays[i], kind: 'pay', label: 'Payday', amountCents: nets[i] })
  }

  for (const o of params.obligations) {
    if (o.cadence === 'onetime') {
      const d = dayjs(o.nextDueDate);
      if (d.isSameOrAfter(params.from) && d.isSameOrBefore(params.to)) {
        events.push({ date: o.nextDueDate, kind: 'obligation', label: o.name, amountCents: -Math.abs(o.amountCents) });
      }
    } else if (o.cadence === 'monthly') {
      let cur = dayjs(o.nextDueDate)
      const to = dayjs(params.to)
      while (cur.isSameOrBefore(to)) {
        if (cur.isSameOrAfter(params.from)) events.push({ date: cur.format('YYYY-MM-DD'), kind: 'obligation', label: o.name, amountCents: -Math.abs(o.amountCents) })
        cur = cur.add(1,'month')
      }
    }
  }
  events.sort((a,b)=> a.date.localeCompare(b.date) || (a.kind==='pay'?-1:1))
  
  let bal = params.bufferCents
  let minBal = bal
  
  const finalEvents: CFEvent[] = []

  // Create a map of events by date
  const dateMap = new Map<string, { date: string, kind: 'pay'|'obligation', label: string, amountCents: number }[]>();
  for(const e of events) {
    if(!dateMap.has(e.date)) dateMap.set(e.date, []);
    dateMap.get(e.date)!.push(e);
  }

  // Iterate day by day to calculate running balance
  const start = dayjs(params.from);
  const end = dayjs(params.to);
  for(let d = start; d.isSameOrBefore(end); d = d.add(1, 'day')) {
    const ymd = d.format('YYYY-MM-DD');
    if(dateMap.has(ymd)) {
      for(const e of dateMap.get(ymd)!) {
        bal += e.amountCents;
        finalEvents.push({...e, balanceCents: bal});
      }
    }
    if (bal < minBal) minBal = bal;
  }
  
  // Calculate shortfall days
  const dailyBalances = toDailySeries(finalEvents, params.from, params.to, params.bufferCents);
  const shortfallDays = dailyBalances.filter(d => d.balanceCents < 0).length;


  return { events: finalEvents, summary: { minBalanceCents: minBal, shortfallDays } }
}
