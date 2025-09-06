
import { type Debt, type BNPL, type Plan, ZDebt, ZBnpl, ZPlan } from './debt-planner.schema'
import { mulCentsByBps, addC } from './money'

export type MonthLine = { accountId: string, minCents: number, extraCents: number, interestCents: number, principalCents: number, endBalanceCents: number }
export type MonthSchedule = { ym: string, line: MonthLine[], bnpl: { planId: string, installmentCents: number, remainingCents: number }[], totals: { paidCents: number, interestCents: number } }

export function simulatePayoff(input: { debts: Debt[]; bnpl: BNPL[]; plan: Plan; maxMonths?: number; overrides?: Record<string, number> }) {
  const debts = (input.debts as any[]).map(d => ZDebt.parse(d)).map(d => ({ ...d }))
  const bnpl = (input.bnpl as any[]).map(b => ZBnpl.parse(b)).map(b => ({ ...b }))
  const plan = ZPlan.parse(input.plan)
  const maxMonths = input.maxMonths ?? 120

  const out: MonthSchedule[] = []
  const date = new Date(plan.startDate + 'T00:00:00')

  const pickTarget = () => {
    const alive = debts.filter(d => d.balanceCents > 0)
    if (!alive.length) return null
    return plan.strategy === 'avalanche'
      ? alive.reduce((a, b) => (b.aprBps > a.aprBps ? b : a))
      : alive.reduce((a, b) => (b.balanceCents < a.balanceCents ? b : a))
  }

  for (let m = 0; m < maxMonths; m++) {
    const ym = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`
    let budget = plan.extraDebtBudgetCents + (input.overrides?.[ym] ?? 0)

    // 1) BNPL reservations
    const bnplLines = bnpl.map(p => {
      if (p.remainingInstallments <= 0) return { planId: p.id, installmentCents: 0, remainingCents: 0 }
      const rem = (p.remainingInstallments - 1)
      const remainingCents = rem * p.installmentCents
      budget -= p.installmentCents
      p.remainingInstallments = rem
      return { planId: p.id, installmentCents: p.installmentCents, remainingCents }
    })

    // 2) Minimums for all debts
    const lines: MonthLine[] = debts.map(d => ({ accountId: d.id, minCents: Math.min(d.minPaymentCents, d.balanceCents), extraCents: 0, interestCents: 0, principalCents: 0, endBalanceCents: d.balanceCents }))

    // Interest (monthly model)
    for (const L of lines) {
      const d = debts.find(x => x.id === L.accountId)!
      const i = mulCentsByBps(d.balanceCents, Math.round(d.aprBps / 12))
      L.interestCents = i
    }

    // Apply minimums
    for (const L of lines) {
      const d = debts.find(x => x.id === L.accountId)!
      const pay = Math.min(L.minCents, d.balanceCents + L.interestCents)
      const principal = Math.max(0, pay - L.interestCents)
      d.balanceCents = Math.max(0, d.balanceCents + L.interestCents - pay)
      L.principalCents += principal
      L.endBalanceCents = d.balanceCents
    }

    // 3) Sweep extras per strategy
    while (budget > 0) {
      const tgt = pickTarget()
      if (!tgt) break
      const idx = lines.findIndex(x => x.accountId === tgt.id)
      if (tgt.balanceCents === 0) { continue }
      const pay = Math.min(budget, tgt.balanceCents)
      tgt.balanceCents -= pay
      lines[idx].extraCents += pay
      lines[idx].principalCents += pay
      lines[idx].endBalanceCents = tgt.balanceCents
      budget -= pay
    }

    const paid = addC(...lines.map(L => addC(L.minCents, L.extraCents))) + addC(...bnplLines.map(b => b.installmentCents))
    const intC = addC(...lines.map(L => L.interestCents))
    out.push({ ym, line: lines, bnpl: bnplLines, totals: { paidCents: paid, interestCents: intC } })

    // advance month
    date.setMonth(date.getMonth() + 1)

    if (debts.every(d => d.balanceCents === 0) && bnpl.every(b => b.remainingInstallments === 0)) break
  }

  return out
}
