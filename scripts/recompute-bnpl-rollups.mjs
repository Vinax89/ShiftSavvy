#!/usr/bin/env node
import 'dotenv/config'
import admin from 'firebase-admin'
if (!admin.apps.length) {
  try { admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID }) } catch { admin.initializeApp() }
}
const db = admin.firestore()

const uid = process.argv[2]
if (!uid) {
  console.error('Usage: node scripts/recompute-bnpl-rollups.mjs <UID>')
  process.exit(1)
}
const fromTs = (t) => (t?.toDate ? t.toDate() : new Date(t))

async function run() {
  const contracts = await db.collection(`users/${uid}/bnpl/contracts`).get()
  for (const cdoc of contracts.docs) {
    const cid = cdoc.id
    const instSnap = await db.collection(`users/${uid}/bnpl/contracts/${cid}/installments`).get()
    const insts = instSnap.docs.map(d => ({ id: d.id, ...d.data() }))

    const now = new Date()
    const updates = []
    for (const i of insts) {
      const paid = (i.amountPaid || 0) >= (i.amountDue || 0) - 1e-6
      let status
      if (paid) status = 'PAID'
      else if (fromTs(i.dueDate) < now && (i.amountPaid || 0) > 0) status = 'PARTIAL'
      else if (fromTs(i.dueDate) < now) status = 'OVERDUE'
      else status = 'DUE'
      if (status !== i.status) {
        updates.push({
          ref: db.doc(`users/${uid}/bnpl/contracts/${cid}/installments/${i.id}`),
          data: { status, ...(status==='PAID' && !i.paidAt ? { paidAt: admin.firestore.Timestamp.now() } : {}) }
        })
      }
    }
    while (updates.length) {
      const batch = db.batch()
      for (let k = 0; k < 450 && updates.length; k++) {
        const u = updates.shift()
        batch.update(u.ref, u.data)
      }
      await batch.commit()
    }

    const updatedSnap = await db.collection(`users/${uid}/bnpl/contracts/${cid}/installments`).get()
    const updated = updatedSnap.docs.map(d => d.data())
    const outstanding = updated.reduce((s, i) => s + Math.max(0, (i.amountDue || 0) - (i.amountPaid || 0)), 0)
    const paidInstallments = updated.filter(i => i.status === 'PAID').length
    const totalInstallments = updated.length
    const anyOverdue = updated.some(i => i.status === 'OVERDUE')
    const anyPaid = updated.some(i => i.status === 'PAID' || i.status === 'PARTIAL')
    const state = totalInstallments === paidInstallments ? 'PAID' : (anyOverdue ? 'LATE' : (anyPaid ? 'ACTIVE' : 'OPEN'))
    const nextDue = updated.find(i => i.status !== 'PAID')?.dueDate || null

    await db.doc(`users/${uid}/bnpl/contracts/${cid}`).set({
      outstanding,
      paidInstallments,
      totalInstallments,
      state,
      nextDueDate: nextDue,
      lastReconciledAt: admin.firestore.Timestamp.now()
    }, { merge: true })

    console.log(`[recompute] ${cid}: state=${state} outstanding=${outstanding.toFixed(2)} paid=${paidInstallments}/${totalInstallments}`)
  }
}

run().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
