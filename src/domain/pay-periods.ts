import { ZPaySchedule } from './pay-schedule.schema'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'

dayjs.extend(isSameOrBefore)


export function previousPayday(ps: unknown, paydayYMD: string): string {
  const p = ZPaySchedule.parse(ps)
  const d = dayjs(paydayYMD)
  if (p.kind === 'weekly' || p.kind === 'biweekly') {
    const step = p.kind === 'weekly' ? 7 : 14
    let prev = dayjs(p.anchor)
    while (prev.add(step,'day').isSameOrBefore(d)) prev = prev.add(step,'day')
    return prev.format('YYYY-MM-DD')
  }
  if (p.kind === 'semimonthly' && p.days?.length) {
    const days = [...p.days].sort((a,b)=>a-b)
    const cur = d
    const prevMonth = cur.subtract(1,'month')
    const candidates = [cur, prevMonth].flatMap(m => days.map(dd => m.date(dd))).filter(x => x.isBefore(d))
    return candidates.sort((a,b)=>a.valueOf()-b.valueOf()).pop()!.format('YYYY-MM-DD')
  }
  if (p.kind === 'monthly' && p.day) {
    const cur = d
    const last = cur.date(Math.min(p.day, cur.daysInMonth()))
    if (last.isBefore(d)) return last.format('YYYY-MM-DD')
    const prev = cur.subtract(1,'month')
    return prev.date(Math.min(p.day, prev.daysInMonth())).format('YYYY-MM-DD')
  }
  return d.subtract(14,'day').format('YYYY-MM-DD')
}

export function periodBounds(ps: unknown, paydayYMD: string): { start: string, end: string } {
  const prev = previousPayday(ps, paydayYMD)
  // Period is (prev, payday] for MVP (exclusive of prev, inclusive of payday)
  const start = dayjs(prev).add(1,'day').format('YYYY-MM-DD')
  const end = paydayYMD
  return { start, end }
}

    