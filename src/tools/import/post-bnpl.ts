import { getFirestore } from 'firebase-admin/firestore'
import { applyBnpl } from '../bnpl/apply'

export async function runBnpl(uid: string, opts?: { monthsBack: number }){
  const db = getFirestore()
  const monthsBack = opts?.monthsBack ?? 6
  console.log(`Checking for BNPL plans for user ${uid} over the last ${monthsBack} months.`)
  await applyBnpl(db as any, uid)
}