import { expandCadence } from './bnpl.cadence'

export type BnplOb = { id:string; name:string; amountCents:number; cadence:'biweekly'|'monthly'|'semimonthly'; nextDueDate:string; remainingInstallments:number; provider?:string; merchant?:string }

export function expandBnpl(ob: BnplOb) {
  const dates = expandCadence(ob.nextDueDate, ob.remainingInstallments, ob.cadence)
  return dates.map(date => ({ date, amountCents: ob.amountCents }))
}
