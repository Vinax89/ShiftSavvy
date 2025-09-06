import { describe, it, expect } from 'vitest'
import { computeRollups } from '../bnpl.rollups'

describe('computeRollups', () => {
  it('sums outstanding and finds next due', () => {
    const plans = [
      { id:'a', schedule:[
        { dueDate:'2025-09-10', amountCents:1000, paidCents:0 },
        { dueDate:'2025-09-24', amountCents:1000, paidCents:0 },
      ]},
      { id:'b', schedule:[
        { dueDate:'2025-09-08', amountCents:500, paidCents:500 },
        { dueDate:'2025-09-18', amountCents:700, paidCents:0 },
      ]},
    ]
    const r = computeRollups(plans as any)
    expect(r.outstandingCents).toBe(1000+1000+700)
    expect(r.nextDue).toBe('2025-09-10') // 09-08 fully paid, 09-10 is next pending
    expect(r.plansCount).toBe(2)
  })
})
