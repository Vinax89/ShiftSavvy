import { describe, it, expect } from 'vitest'
import { evaluatePaycheck } from '../paycheck'

const tax = {
  federal: { brackets: [
    { upToDollars: 11_000, rateBps: 1_000 },
    { upToDollars: 44_725, rateBps: 1_200 },
    { upToDollars: 95_375, rateBps: 2_200 },
  ]},
  state: { code: 'NONE', brackets: [] },
  fica: { ssRateBps: 620, medicareRateBps: 145, ssWageBaseDollars: 168_600 },
}
const policy = { baseRateCents: 4_000, diffs: { nightBps: 2_000, weekendBps: 1_500, holidayBps: 10_000, chargeAddlPerHourCents: 200, bonusPerShiftCents: 0 }, ot: { weeklyHours: 40, otMultiplierBps: 15_000 } }

describe('evaluatePaycheck (cents)', () => {
  it('overnight 12h with night diff', () => {
    const r = evaluatePaycheck({ shifts:[{ date:'2025-09-01', start:'19:00', end:'07:00', tags:['night'] }], policy, tax, ytd: { grossCents: 0 } })
    expect(r.hours).toBeCloseTo(12, 5)
    expect(r.baseCents).toBeCloseTo(48_000, 0) // 12 * $40
    expect(r.diffCents).toBeCloseTo(9_600, 0)  // +20%
  })
  it('overtime premium for 8h beyond 40', () => {
    const s = (n:number)=>({ date:`2025-09-${String(n).padStart(2,'0')}`, start:'07:00', end:'19:00', tags:[] })
    const r = evaluatePaycheck({ shifts:[s(1),s(2),s(3),s(4)], policy, tax, ytd: { grossCents: 0 } })
    expect(r.otHours).toBeCloseTo(8, 5)
    expect(r.otPremiumCents).toBeCloseTo(16_000, 0) // 8h * $40 * 0.5
  })
})
