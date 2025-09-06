import { z } from 'zod'
export const ZDebt = z.object({ id: z.string(), name: z.string(), balanceCents: z.number().int().nonnegative(), aprBps: z.number().int(), minPaymentCents: z.number().int().nonnegative() })
export const ZBnpl = z.object({ id: z.string(), name: z.string(), installmentCents: z.number().int().nonnegative(), remainingInstallments: z.number().int().nonnegative() })
export const ZPlan = z.object({ strategy: z.enum(['avalanche','snowball']), startDate: z.string(), extraDebtBudgetCents: z.number().int().nonnegative(), assumptions: z.object({ interestModel: z.enum(['monthly','daily365']).default('monthly'), dayOfMonth: z.number().int().min(1).max(28).default(15) }) })
export type Debt = z.infer<typeof ZDebt>; export type BNPL = z.infer<typeof ZBnpl>; export type Plan = z.infer<typeof ZPlan>
