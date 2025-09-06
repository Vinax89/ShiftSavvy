import { Firestore, Timestamp } from 'firebase-admin/firestore'
import { detectBnpl } from './detect'

export async function applyBnpl(db: Firestore, userId: string) {
  const dets = await detectBnpl(db, userId)
  const batch = db.batch()
  for (const d of dets) {
    // upsert obligation by planHash
    const q = await db.collection('obligations').where('userId','==',userId).where('planHash','==', d.planHash).limit(1).get()
    const ref = q.empty ? db.collection('obligations').doc() : q.docs[0].ref
    
    batch.set(ref, {
      userId, 
      name: `${cap(d.provider)} — ${d.merchant}`, 
      kind:'bnpl', 
      amountCents: d.amountCents,
      cadence: d.cadence, 
      nextDueDate: d.startDate, 
      remainingInstallments: d.count - 1,
      merchant: d.merchant, 
      provider: d.provider, 
      planHash: d.planHash, 
      schemaVersion: 2,
      updatedAt: Timestamp.now()
    }, { merge: true })

    // link transactions to plan
    for (let i=0;i<d.observedIds.length;i++) {
      const tRef = db.collection('transactions').doc(d.observedIds[i])
      batch.set(tRef, { bnplPlanId: ref.id, bnplSequence: i+1 }, { merge: true })
    }
  }
  await batch.commit()
  return dets.length
}
function cap(s:string){ return s.charAt(0).toUpperCase()+s.slice(1) }
