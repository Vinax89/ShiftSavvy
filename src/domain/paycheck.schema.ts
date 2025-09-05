import { z } from 'zod'
export const ZShift = z.object({
  date: z.string(), // YYYY-MM-DD
  start: z.string(), // HH:mm local
  end: z.string(),
  tags: z.array(z.enum(['night','weekend','holiday','charge','bonus'])).default([]),
})

export const ZOvertimePolicy = z.object({ weeklyHours: z.number().int().default(40), otMultiplierBps: z.number().int().default(15000) }) // 1.5x
export const ZDifferentials = z.object({
  nightBps: z.number().int().default(2000),      // +20%
  weekendBps: z.number().int().default(1500),    // +15%
  holidayBps: z.number().int().default(10000),   // +100%
  chargeAddlPerHourCents: z.number().int().default(0),
  bonusPerShiftCents: z.number().int().default(0),
})
export const ZTaxBracket = z.object({ upToDollars: z.number(), rateBps: z.number().int() })
export const ZTaxProfile = z.object({
  federal: z.object({ brackets: z.array(ZTaxBracket) }),
  state: z.object({ code: z.string(), brackets: z.array(ZTaxBracket) }),
  fica: z.object({ ssRateBps: z.number().int(), medicareRateBps: z.number().int(), ssWageBaseDollars: z.number() })
})
export const ZPolicy = z.object({ baseRateCents: z.number().int(), diffs: ZDifferentials, ot: ZOvertimePolicy })
export type Policy = z.infer<typeof ZPolicy>
export type TaxProfile = z.infer<typeof ZTaxProfile>
export type Shift = z.infer<typeof ZShift>
