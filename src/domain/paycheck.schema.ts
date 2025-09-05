import { z } from 'zod'
export const ZShift = z.object({
  date: z.string(), // YYYY-MM-DD
  start: z.string(), // HH:mm (local)
  end: z.string(),   // HH:mm (local)
  tags: z.array(z.enum(['night','weekend','holiday','charge','bonus'])).default([]),
})
export type Shift = z.infer<typeof ZShift>

export const ZOvertimePolicy = z.object({ weeklyHours: z.number().int().default(40), otMultiplier: z.number().default(1.5) })
export const ZDifferentials = z.object({
  nightPct: z.number().default(0.2),
  weekendPct: z.number().default(0.15),
  holidayPct: z.number().default(1.0), // treated as +100% if present
  chargeAddlPerHour: z.number().default(2),
  bonusPerShift: z.number().default(0),
})
export const ZTaxBracket = z.object({ upTo: z.number(), rate: z.number() })
export const ZTaxProfile = z.object({
  federal: z.object({ brackets: z.array(ZTaxBracket) }),
  state: z.object({ code: z.string(), brackets: z.array(ZTaxBracket) }),
  fica: z.object({ ssRate: z.number(), medicareRate: z.number(), ssWageBase: z.number() })
})

export const ZPolicy = z.object({ baseRate: z.number(), diffs: ZDifferentials, ot: ZOvertimePolicy })
export type Policy = z.infer<typeof ZPolicy>
export type TaxProfile = z.infer<typeof ZTaxProfile>
