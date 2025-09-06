
import type { CFEvent } from './cashflow'

export function toDailySeries(events: CFEvent[], fromYMD: string, toYMD: string, startingBalanceCents: number) {
  const days: { date: string, deltaCents: number, balanceCents: number, pay?: number, bills?: number }[] = []
  const toMap = new Map<string, { pay: number, bills: number }>()
  for (const e of events) {
    const m = toMap.get(e.date) || { pay:0, bills:0 }
    if (e.kind === 'pay') m.pay += e.amountCents
    else m.bills += e.amountCents
    toMap.set(e.date, m)
  }
  let bal = startingBalanceCents
  const start = new Date(fromYMD + 'T00:00:00Z'), end = new Date(toYMD + 'T00:00:00Z')
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate()+1)) {
    const y = d.toISOString().slice(0,10)
    const m = toMap.get(y) || { pay:0, bills:0 }
    const delta = m.pay + m.bills
    bal += delta
    days.push({ date: y, deltaCents: delta, balanceCents: bal, pay: m.pay || undefined, bills: m.bills || undefined })
  }
  return days
}
