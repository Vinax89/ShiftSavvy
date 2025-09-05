import { ZPolicy, ZShift, ZTaxProfile } from './paycheck.schema'

const toMinutes = (hhmm: string) => { const [h,m] = hhmm.split(':').map(Number); return h*60 + m }
const spanHours = (start: string, end: string) => {
  // supports overnight (e.g., 19:00 → 07:00 next day)
  const s = toMinutes(start), e = toMinutes(end)
  const mins = e >= s ? e - s : (24*60 - s) + e
  return mins / 60
}

export function evaluatePaycheck(params: {
  shifts: unknown[]
  policy: unknown
  tax: unknown
  ytd: { gross: number } // cents
}) {
  const shifts = (params.shifts as any[]).map(s => ZShift.parse(s))
  const policy = ZPolicy.parse(params.policy)
  const tax = ZTaxProfile.parse(params.tax)

  let hours = 0, nightH = 0, weekendH = 0, holidayH = 0, chargeH = 0

  for (const s of shifts) {
    const h = spanHours(s.start, s.end)
    hours += h
    if (s.tags.includes('night')) nightH += h
    if (s.tags.includes('weekend')) weekendH += h
    if (s.tags.includes('holiday')) holidayH += h
    if (s.tags.includes('charge')) chargeH += h
  }

  const base = hours * policy.baseRate
  const diff =
    nightH * policy.baseRate * policy.diffs.nightPct +
    weekendH * policy.baseRate * policy.diffs.weekendPct +
    holidayH * policy.baseRate * policy.diffs.holidayPct +
    chargeH * policy.diffs.chargeAddlPerHour +
    shifts.length * policy.diffs.bonusPerShift

  // Simple weekly overtime (aggregate) — MVP
  const otHours = Math.max(0, hours - policy.ot.weeklyHours)
  const ot = otHours * policy.baseRate * (policy.ot.otMultiplier - 1)

  const gross = base + diff + ot

  // Withholding via progressive brackets (federal + state) and FICA
  const taxBrackets = (brs: { upTo: number, rate: number }[], wage: number) => {
    let owed = 0, prev = 0
    for (const b of brs) {
      const portion = Math.max(0, Math.min(wage, b.upTo) - prev)
      owed += portion * b.rate
      prev = b.upTo
      if (wage <= b.upTo) break
    }
    if (wage > prev && brs.length) owed += (wage - prev) * brs.at(-1)!.rate
    return owed
  }

  const federal = taxBrackets(tax.federal.brackets, gross)
  const state = taxBrackets(tax.state.brackets, gross)
  const fica = Math.min(gross, Math.max(0, tax.fica.ssWageBase - params.ytd.gross)) * tax.fica.ssRate
              + gross * tax.fica.medicareRate

  const totalTax = federal + state + fica
  const net = gross - totalTax

  return {
    hours, otHours, base, diff, ot, gross, taxes: { federal, state, fica, total: totalTax }, net
  }
}
