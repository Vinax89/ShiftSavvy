/* eslint-disable no-console */
import 'dotenv/config'
import admin from 'firebase-admin'

const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-shiftsavvy'
try { admin.initializeApp({ projectId }) } catch(e) { /* was complaining about re-init */ }
const db = admin.firestore()

const UID = process.env.E2E_UID || 'e2e-user-001'
const ACCOUNT = 'acct:test:checking'

// Simple helpers
const ymd = (d: Date) => new Date(d).toISOString().slice(0,10)
const addDays = (d: Date, n: number) => {
  const x = new Date(d); x.setDate(x.getDate()+n); return x
}

export async function seedBnplFixture() {
  // Clean old data for repeatability
  await deleteCollection(db, `users/${UID}/transactions`)
  await deleteCollection(db, 'transactions')
  await deleteCollection(db, `users/${UID}/bnpl/contracts`)

  // Dates: purchase + 4 bi-weekly installments
  const purchaseDate = new Date()
  purchaseDate.setHours(0,0,0,0)
  const due1 = addDays(purchaseDate, 14)
  const due2 = addDays(purchaseDate, 28)
  const due3 = addDays(purchaseDate, 42)
  const due4 = addDays(purchaseDate, 56)

  const principalCents = 200_00
  const installmentCents = 50_00

  // Seed transactions: principal + 4 installments (unlinked)
  const txns = [
    { date: ymd(purchaseDate), amountCents: principalCents,  merchant: 'Klarna Shop', memo: 'Klarna Purchase', accountId: ACCOUNT, role: 'principal' },
    { date: ymd(due1),        amountCents: installmentCents, merchant: 'Klarna',       memo: 'Klarna Installment', accountId: ACCOUNT, role: 'installment' },
    { date: ymd(due2),        amountCents: installmentCents, merchant: 'Klarna',       memo: 'Klarna Installment', accountId: ACCOUNT, role: 'installment' },
    { date: ymd(due3),        amountCents: installmentCents, merchant: 'Klarna',       memo: 'Klarna Installment', accountId: ACCOUNT, role: 'installment' },
    { date: ymd(due4),        amountCents: installmentCents, merchant: 'Klarna',       memo: 'Klarna Installment', accountId: ACCOUNT, role: 'installment' }
  ]

  for (const t of txns) {
    const refNested = db.collection(`users/${UID}/transactions`).doc()
    await refNested.set({ userId: UID, ...t })
    // legacy mirror (dual-write era)
    await db.collection('transactions').doc(refNested.id).set({ userId: UID, ...t })
  }

  console.log('Seeded transactions for', UID)
}

// Utility: delete small collections (dev)
async function deleteCollection(db: admin.firestore.Firestore, path: string) {
  const snap = await db.collection(path).get().catch(()=>null)
  if (!snap || snap.empty) return
  const batch = db.batch()
  snap.forEach(doc => batch.delete(doc.ref))
  await batch.commit()
}

if (process.env.NODE_ENV !== 'test') {
  seedBnplFixture().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
}
