export type Plan = { id:string; schedule:{ dueDate:string; amountCents:number; paidCents?:number }[] }
export function computeRollups(plans: Plan[]) {
  let outstandingCents = 0
  let nextDue: string | null = null
  for (const p of plans) {
    for (const s of p.schedule || []) {
      const remain = Math.max(0, (s.amountCents||0) - (s.paidCents||0))
      if (remain > 0) {
        outstandingCents += remain
        if (!nextDue || s.dueDate < nextDue) nextDue = s.dueDate
      }
    }
  }
  return { outstandingCents, nextDue, plansCount: plans.length }
}
