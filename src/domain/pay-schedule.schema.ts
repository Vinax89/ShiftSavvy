import { z } from 'zod'
export const ZPaySchedule = z.object({
  kind: z.enum(['biweekly','weekly','semimonthly','monthly']),
  anchor: z.string(), // YYYY-MM-DD — a known payday in past
  timezone: z.string(),
  days: z.array(z.number().int().min(1).max(28)).optional(), // semimonthly
  day: z.number().int().min(1).max(31).optional() // monthly
})
export type PaySchedule = z.infer<typeof ZPaySchedule>
