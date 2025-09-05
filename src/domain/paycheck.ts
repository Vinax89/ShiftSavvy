import { ZPolicy, ZShift, ZTaxProfile } from './paycheck.schema'
import { type Cents, mulCentsByBps, mulHours, addC } from './money'

const toMinutes = (hhmm: string) => { const [h,m] = hhmm.split(':').map(Number); return h*60 + m }
const spanHours = (start: string, end: string) => { const s=toMinutes(start), e=toMinutes(end); const mins = e>=s ? e-s : (1440-s)+e; return mins/60 }

export function evaluatePaycheck(params: {
  shifts: unknown[]
  policy: unknown
  tax: unknown
  ytd: { grossCents: Cents }
}) {
  const shifts = (params.shifts as any[]).map(s => ZShift.parse(s))
  const policy = ZPolicy.parse(params.policy)
  const tax = ZTaxProfile.parse(params.tax)

  let hours=0, nightH=0, weekendH=0, holidayH=0, chargeH=0
  for (const s of shifts) {
    const h = spanHours(s.start, s.end)
    hours += h
    if (s.tags.includes('night')) nightH += h
    if (s.tags.includes('weekend')) weekendH += h
    if (s.tags.includes('holiday')) holidayH += h
    if (s.tags.includes('charge')) chargeH += h
  }

  const baseCents = mulHours(policy.baseRateCents, hours)
  const nightCents = mulCentsByBps(mulHours(policy.baseRateCents, nightH), policy.diffs.nightBps)
  const weekendCents = mulCentsByBps(mulHours(policy.baseRateCents, weekendH), policy.diffs.weekendBps)
  const holidayCents = mulCentsByBps(mulHours(policy.baseRateCents, holidayH), policy.diffs.holidayBps)
  const chargeCents = mulHours(policy.diffs.chargeAddlPerHourCents, chargeH)
  const bonusCents = shifts.length * policy.diffs.bonusPerShiftCents
  const diffCents = addC(nightCents, weekendCents, holidayCents, chargeCents, bonusCents)

  const otHours = Math.max(0, hours - policy.ot.weeklyHours)
  const otBase = mulHours(policy.baseRateCents, otHours)
  const otPremiumCents = mulCentsByBps(otBase, policy.ot.otMultiplierBps - 10000)

  const grossCents = addC(baseCents, diffCents, otPremiumCents)

  // Taxes
  const taxBrackets = (brs: { upToDollars: number, rateBps: number }[], wageCents: Cents) => {
    let owed: Cents = 0
    let prevCents = 0
    for (const b of brs) {
      const upToC = Math.round(b.upToDollars * 100)
      const portion = Math.max(0, Math.min(wageCents, upToC) - prevCents)
      owed += mulCentsByBps(portion, b.rateBps)
      prevCents = upToC
      if (wageCents <= upToC) break
    }
    if (wageCents > prevCents && brs.length) {
      owed += mulCentsByBps(wageCents - prevCents, brs.at(-1)!.rateBps)
    }
    return owed
  }

  const federalCents = taxBrackets(tax.federal.brackets, grossCents)
  const stateCents = taxBrackets(tax.state.brackets, grossCents)

  const ssWageBaseC = Math.round(tax.fica.ssWageBaseDollars * 100)
  const remainingSSBase = Math.max(0, ssWageBaseC - params.ytd.grossCents)
  const ssBase = Math.min(grossCents, remainingSSBase)
  const ssCents = mulCentsByBps(ssBase, tax.fica.ssRateBps)
  const medicareCents = mulCentsByBps(grossCents, tax.fica.medicareRateBps)

  const totalTaxCents = addC(federalCents, stateCents, ssCents + medicareCents)
  const netCents = grossCents - totalTaxCents

  return {
    hours, otHours,
    baseCents, diffCents, otPremiumCents,
    grossCents,
    taxes: { federalCents, stateCents, ficaCents: ssCents + medicareCents, totalCents: totalTaxCents },
    netCents,
  }
}
