import dayjs from 'dayjs'

export type Cadence = 'biweekly'|'monthly'|'semimonthly'

/** Add one cadence step, preserving day-of-month intent. */
export function addStep(dateYMD: string, cadence: Cadence, semimonthDays?: number[]): string {
  const d = dayjs(dateYMD)
  if (cadence === 'biweekly') return d.add(14, 'day').format('YYYY-MM-DD')
  if (cadence === 'monthly') {
    // clamp to last day of month if anchor > daysInMonth
    const anchorDay = d.date()
    const next = d.add(1, 'month')
    const day = Math.min(anchorDay, next.daysInMonth())
    return next.date(day).format('YYYY-MM-DD')
  }
  if (cadence === 'semimonthly' && semimonthDays && semimonthDays.length === 2) {
    const [a, b] = [...semimonthDays].sort((x, y) => x - y)
    // if on a -> jump to b in same month; if on b -> jump to next month a
    if (d.date() === a) return d.date(b).format('YYYY-MM-DD')
    const nextMonth = d.add(1, 'month')
    const day = Math.min(a, nextMonth.daysInMonth())
    return nextMonth.date(day).format('YYYY-MM-DD')
  }
  return d.add(30, 'day').format('YYYY-MM-DD')
}

export function expandCadence(fromYMD: string, count: number, cadence: Cadence, semimonthDays?: number[]) {
  const out: string[] = []
  let cur = fromYMD
  for (let i = 0; i < count; i++) {
    out.push(cur)
    cur = addStep(cur, cadence, semimonthDays)
  }
  return out
}
