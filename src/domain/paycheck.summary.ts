import { ZShift, ZPolicy } from './paycheck.schema'

export function summarizeInputs(shifts: unknown[], policy: unknown) {
  const ps = ZPolicy.parse(policy)
  const ss = (shifts as any[]).map(s => ZShift.parse(s))
  let hours=0, nightH=0, weekendH=0, holidayH=0, chargeH=0
  for (const s of ss) {
    const h = spanHours(s.start, s.end)
    hours += h
    if (s.tags.includes('night')) nightH += h
    if (s.tags.includes('weekend')) weekendH += h
    if (s.tags.includes('holiday')) holidayH += h
    if (s.tags.includes('charge')) chargeH += h
  }
  const otHours = Math.max(0, hours - ps.ot.weeklyHours)
  return { shiftCount: ss.length, hours, nightH, weekendH, holidayH, chargeH, otHours }
}

const toMinutes = (hhmm: string) => { const [h,m] = hhmm.split(':').map(Number); return h*60 + m }
const spanHours = (start: string, end: string) => {
  const s = toMinutes(start), e = toMinutes(end)
  const mins = e >= s ? e - s : (24*60 - s) + e
  return mins / 60
}

export const EVALUATOR_VERSION = '2025-09-01.v1'
