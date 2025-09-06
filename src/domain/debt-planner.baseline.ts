import { simulatePayoff } from './debt-planner'
import type { Plan, Debt, BNPL } from './debt-planner.schema'

export function simulateMinOnly(inputs: { debts: Debt[]; bnpl: BNPL[]; plan: Plan }) {
  // same inputs, but force extraDebtBudgetCents = 0
  const p: Plan = { ...inputs.plan, extraDebtBudgetCents: 0 }
  return simulatePayoff({ debts: inputs.debts, bnpl: inputs.bnpl, plan: p, maxMonths: 240 })
}

export function summarizeRun(schedule: any[]) {
  const totals = schedule.reduce((acc, m) => {
    acc.paid += m.totals.paidCents
    acc.interest += m.totals.interestCents
    return acc
  }, { paid: 0, interest: 0 })
  const payoffDates: Record<string,string> = {}
  // first month where endBalance becomes 0 for an account
  for (const m of schedule) {
    for (const L of m.line) {
      if (L.endBalanceCents === 0 && !payoffDates[L.accountId]) {
        const [y, month] = m.ym.split('-').map(Number);
        const d = new Date(Date.UTC(y, month -1, 1));
        payoffDates[L.accountId] = d.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });
      }
    }
  }
  return { months: schedule.length, totalPaidCents: totals.paid, totalInterestCents: totals.interest, payoffDates }
}
