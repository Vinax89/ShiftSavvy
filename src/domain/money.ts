export type Cents = number // integer
export const toCents = (dollars: number): Cents => Math.round(dollars * 100)
export const fromCents = (cents: Cents): number => cents / 100
export const addC = (...ns: Cents[]) => ns.reduce((a, b) => a + b, 0)
export const mulCentsByBps = (c: Cents, bps: number): Cents => Math.round((c * bps) / 10000)
export const mulHours = (rateCents: Cents, hours: number): Cents => Math.round(rateCents * hours)
