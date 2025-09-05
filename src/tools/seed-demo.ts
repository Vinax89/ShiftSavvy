import 'dotenv/config'
import { nanoid } from 'nanoid'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from './firebase-admin'

async function seed(uid: string) {
  const now = new Date()
  const batch = adminDb.batch()

  // User
  batch.set(adminDb.collection('users').doc(uid), {
    displayName: 'Demo Nurse', createdAt: Timestamp.fromDate(now)
  })

  // Debts (two cards)
  const debts = [
    { name: 'Card A', balance: 3200_00, aprBps: 2499, minCents: 35_00 },
    { name: 'Card B', balance: 1100_00, aprBps: 1799, minCents: 25_00 },
  ]
  debts.forEach(d => {
    const id = nanoid()
    batch.set(adminDb.collection('debts_accounts').doc(id), {
      id, userId: uid, name: d.name, balanceCents: d.balance, aprBps: d.aprBps, minPaymentCents: d.minCents,
    })
  })

  // Obligations
  batch.set(adminDb.collection('obligations').doc(nanoid()), {
    userId: uid, name: 'Rent', amountCents: 1800_00, cadence: 'monthly', nextDueDate: '2025-10-01'
  })

  // Shifts (two weeks of mixed shifts)
  const shifts = [
    { date: '2025-09-01', start: '19:00', end: '07:00', tags: ['night'] },
    { date: '2025-09-03', start: '07:00', end: '19:00', tags: [] },
    { date: '2025-09-07', start: '07:00', end: '19:00', tags: ['weekend'] },
  ]
  shifts.forEach(s => {
    batch.set(adminDb.collection('shifts').doc(nanoid()), { userId: uid, ...s })
  })

  // Tax profile (demo numbers — brackets are placeholders for seed only)
  batch.set(adminDb.collection('tax_profiles').doc(uid), {
    userId: uid,
    filingStatus: 'single',
    federal: { brackets: [ { upToDollars: 11000, rateBps: 1000 }, { upToDollars: 44725, rateBps: 1200 }, { upToDollars: 95375, rateBps: 2200 } ] },
    fica: { ssRateBps: 620, medicareRateBps: 145, ssWageBaseDollars: 168600 },
    state: { code: 'NONE', brackets: [] },
  })

  await batch.commit()
  console.log('Seed complete for', uid)
}

seed(process.env.DEMO_UID || 'demo-uid').catch(err => {
  console.error(err); process.exit(1)
})
