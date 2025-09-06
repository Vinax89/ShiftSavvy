
import type { CFEvent } from './cashflow';
import { dayjs } from '@/lib/dayjs';

/**
 * Converts a sparse series of events into a dense daily series, calculating a running balance.
 * This is the primary function used by the cashflow calendar.
 * @param events - Sorted array of cashflow events.
 * @param fromYMD - Start date (YYYY-MM-DD).
 * @param toYMD - End date (YYYY-MM-DD).
 * @param startingBalanceCents - The initial balance to start from.
 * @returns An array of daily records, each with balance and event details.
 */
export function toDailySeries(events: CFEvent[], fromYMD: string, toYMD: string, startingBalanceCents: number) {
  const days: { date: string, deltaCents: number, balanceCents: number, pay?: number, bills?: number, bnpl?: number }[] = [];
  const toMap = new Map<string, { pay: number, bills: number, bnpl: number }>();

  // Aggregate events by day
  for (const e of events) {
    const m = toMap.get(e.date) || { pay: 0, bills: 0, bnpl: 0 };
    if (e.kind === 'pay') {
        m.pay += e.amountCents;
    } else {
        if (e.label.startsWith('BNPL')) {
            m.bnpl += e.amountCents;
        } else {
            m.bills += e.amountCents;
        }
    }
    toMap.set(e.date, m);
  }

  let bal = startingBalanceCents;
  const start = dayjs.tz(fromYMD);
  const end = dayjs.tz(toYMD);

  // Iterate through each day in the range to build a dense series
  for (let d = start; d.isSameOrBefore(end); d = d.add(1, 'day')) {
    const ymd = d.format('YYYY-MM-DD');
    const m = toMap.get(ymd) || { pay: 0, bills: 0, bnpl: 0 };
    const delta = m.pay + m.bills + m.bnpl;
    bal += delta;
    days.push({
      date: ymd,
      deltaCents: delta,
      balanceCents: bal,
      pay: m.pay || undefined,
      bills: m.bills || undefined,
      bnpl: m.bnpl || undefined
    });
  }
  return days;
}

/**
 * A generic utility to densify a sparse time series.
 * Given points, it fills in missing days with a value of 0.
 * @param points - An array of objects with a date and a numeric value.
 * @param start - The start date (YYYY-MM-DD).
 * @param end - The end date (YYYY-MM-DD).
 * @returns A dense array of points, one for each day in the range.
 */
export function densifyTimeseries(points: { date: string; value: number }[], start: string, end: string): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = []
  const m = new Map(points.map(p => [p.date, p.value]))
  const d0 = dayjs.tz(start);
  const d1 = dayjs.tz(end);
  for (let d = d0; d.isSameOrBefore(d1); d = d.add(1, 'day')) {
    const ymd = d.format('YYYY-MM-DD');
    out.push({ date: ymd, value: m.get(ymd) ?? 0 })
  }
  return out
}
