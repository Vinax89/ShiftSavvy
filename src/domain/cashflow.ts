import { ZPaySchedule, type PaySchedule } from './pay-schedule.schema'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)


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
    for (; !d.isAfter(to); d = d.add(step, 'day')) dates.push(d.format('YYYY-MM-DD'))
  } else if (p.kind === 'semimonthly' && p.days?.length) {
    let d = from.startOf('month')
    for (let cur = d; !cur.isAfter(to); cur = cur.add(1,'month')) {
      for (const dd of p.days) if (cur.date(dd).isBefore(to) && cur.date(dd).isAfter(from.subtract(1,'day'))) dates.push(cur.date(dd).format('YYYY-MM-DD'))
    }
  } else if (p.kind === 'monthly' && p.day) {
    const d = from.startOf('month')
    for (let cur = d; !cur.isAfter(to); cur = cur.add(1,'month')) {
      const last = cur.daysInMonth()
      const day = Math.min(p.day, last)
      if (cur.date(day).isBefore(to) && cur.date(day).isAfter(from.subtract(1,'day'))) dates.push(cur.date(day).format('YYYY-MM-DD'))
    }
  }
  return dates.filter(d => d >= fromYMD && d <= toYMD)
}

export async function buildForecast(params: {
  schedule: unknown
  obligations: { name: string, amountCents: number, cadence: 'monthly'|'weekly'|'semimonthly'|'biweekly', nextDueDate: string }[]
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
    if (o.cadence === 'monthly') {
      let cur = dayjs(o.nextDueDate)
      const to = dayjs(params.to)
      while (!cur.isAfter(to)) {
        if (cur.format('YYYY-MM-DD') >= params.from) events.push({ date: cur.format('YYYY-MM-DD'), kind: 'obligation', label: o.name, amountCents: -Math.abs(o.amountCents) })
        cur = cur.add(1,'month')
      }
    }
  }
  events.sort((a,b)=> a.date.localeCompare(b.date) || (a.kind==='pay'?-1:1))
  
  let bal = params.bufferCents
  let minBal = bal
  let shortfallDays = 0
  
  const finalEvents: CFEvent[] = []

  for (const e of events) {
    bal += e.amountCents
    if (bal < 0) shortfallDays++
    if (bal < minBal) minBal = bal
    finalEvents.push({...e, balanceCents: bal})
  }

  return { events: finalEvents, summary: { minBalanceCents: minBal, shortfallDays } }
}

    