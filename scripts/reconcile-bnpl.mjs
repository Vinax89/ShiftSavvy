#!/usr/bin/env node
/* eslint-disable no-console */
import 'dotenv/config'
import admin from 'firebase-admin'

// ---------- Args ----------
const args = (() => {
  const raw = process.argv.slice(2)
  const out = {
    user: null,
    account: null,
    since: null,
    dry: false,
    windowBeforeDays: 7,
    windowAfterDays: 14,
    amountTolerancePct: 0.02,
    amountToleranceAbs: 1
  }
  for (let i = 0; i < raw.length; i++) {
    const k = raw[i]
    const v = raw[i + 1]
    if (k === '--user') out.user = v
    if (k === '--account') out.account = v
    if (k === '--since') out.since = v
    if (k === '--dry') out.dry = true
    if (k === '--winBefore') out.windowBeforeDays = Number(v)
    if (k === '--winAfter') out.windowAfterDays = Number(v)
    if (k === '--tolPct') out.amountTolerancePct = Number(v)
    if (k === '--tolAbs') out.amountToleranceAbs = Number(v)
  }
  if (!out.user) {
    console.error('Usage: node scripts/reconcile-bnpl.mjs --user <UID> [--account acct:...] [--since YYYY-MM-DD] [--dry]')
    process.exit(1)
  }
  return out
})()

// ---------- Admin init ----------
if (!admin.apps.length) {
  try {
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID })
  } catch {
    admin.initializeApp()
  }
}
const db = admin.firestore()

// ---------- Helpers ----------
const DAY = 24 * 60 * 60 * 1000
const toTs = (d) => admin.firestore.Timestamp.fromDate(d instanceof Date ? d : new Date(d))
const fromTs = (t) => (t?.toDate ? t.toDate() : new Date(t))
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi)

function amountMatchScore(target, observed, tolPct, tolAbs) {
  const diff = Math.abs(Math.abs(observed) - Math.abs(target))
  const tol = Math.max(tolAbs, Math.abs(target) * tolPct)
  const s = 1 - clamp(diff / (tol || 1), 0, 1) // 1 if perfect, 0 if outside tol
  return s
}
function dateMatchScore(due, hit, winBeforeDays, winAfterDays) {
  const dt = (hit - due)
  const win = dt < 0 ? winBeforeDays * DAY : winAfterDays * DAY
  const s = 1 - clamp(Math.abs(dt) / (win || DAY), 0, 1)
  return s
}
function keywordScore(merchant = '', note = '', provider = '') {
  const hay = `${merchant} ${note}`.toLowerCase()
  const keys = [provider, 'bnpl', 'pay in 4', 'installment', 'affirm', 'afterpay', 'klarna', 'zip pay', 'sezzle', 'paypal pay in 4']
    .filter(Boolean).map(s => s.toLowerCase())
  const hit = keys.some(k => k && hay.includes(k))
  return hit ? 1 : 0
}

async function loadCandidateTxns(uid, sinceISO, accountId) {
  const base = db.collection('users').doc(uid).collection('transactions')
  let q = base.orderBy('date', 'desc')
  if (sinceISO) q = q.where('date', '>=', toTs(new Date(sinceISO)))
  if (accountId) q = q.where('accountId', '==', accountId)
  const snap = await q.get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function* eachActiveContract(uid) {
  const contractsCol = db.collection(`users/${uid}/bnpl/contracts`)
  const snap = await contractsCol.get()
  for (const doc of snap.docs) {
    const c = { id: doc.id, ...doc.data() }
    if (['OPEN','ACTIVE','LATE'].includes(c.state)) yield c
  }
}

async function loadInstallments(uid, contractId) {
  const col = db.collection(`users/${uid}/bnpl/contracts/${contractId}/installments`)
  const snap = await col.get()
  const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  return list.sort((a,b) => fromTs(a.dueDate) - fromTs(b.dueDate))
}

async function loadExistingLinks(uid, contractId) {
  const col = db.collection(`users/${uid}/bnpl/contracts/${contractId}/links`)
  const snap = await col.get()
  const map = new Map()
  for (const d of snap.docs) {
    const v = { id: d.id, ...d.data() }
    map.set(`${v.txnId}::${v.installmentId}`, v)
  }
  return map
}

function scoreTxnAgainstInstallment(txn, inst, provider, cfg) {
  if (txn.amount >= 0) return -1 // repayments must be outflows
  const sAmount = amountMatchScore(inst.amountDue, txn.amount, cfg.tolPct, cfg.tolAbs)
  const sDate = dateMatchScore(fromTs(inst.dueDate), fromTs(txn.date), cfg.winBeforeDays, cfg.winAfterDays)
  const sKey = keywordScore(txn.merchant || '', txn.note || '', provider || '')
  return 0.6*sAmount + 0.3*sDate + 0.1*sKey
}

function nextStatusForInstallment(inst) {
  const due = fromTs(inst.dueDate)
  const today = new Date()
  const paid = (inst.amountPaid || 0) >= (inst.amountDue || 0) - 1e-6
  if (paid) return 'PAID'
  if (today > due && (inst.amountPaid || 0) > 0) return 'PARTIAL'
  if (today > due) return 'OVERDUE'
  return 'DUE'
}

function nextStateForContract(installments) {
  const unpaid = installments.filter(i => i.status !== 'PAID')
  const anyOverdue = installments.some(i => i.status === 'OVERDUE')
  if (unpaid.length === 0) return 'PAID'
  if (anyOverdue) return 'LATE'
  const anyPaid = installments.some(i => i.status === 'PAID' || i.status === 'PARTIAL')
  return anyPaid ? 'ACTIVE' : 'OPEN'
}

function computeNextDueDate(installments) {
  const next = installments.find(i => i.status !== 'PAID')
  return next ? next.dueDate : null
}

async function writeLinkAndApply({ uid, contractId, inst, txn, applyAmount, confidence, dry }) {
  const linkId = `${txn.id}__${inst.id}`
  const linkRef = db.doc(`users/${uid}/bnpl/contracts/${contractId}/links/${linkId}`)
  const instRef = db.doc(`users/${uid}/bnpl/contracts/${contractId}/installments/${inst.id}`)
  const now = admin.firestore.Timestamp.now()

  if (dry) {
    console.log('[dry] link', linkId, 'amount', applyAmount.toFixed(2))
    return
  }

  await db.runTransaction(async (tx) => {
    const instSnap = await tx.get(instRef)
    if (!instSnap.exists) return
    const data = instSnap.data()
    const amountPaid = (data.amountPaid || 0) + applyAmount
    const status = amountPaid >= data.amountDue - 1e-6 ? 'PAID' : nextStatusForInstallment({ ...data, amountPaid })
    tx.set(linkRef, {
      txnId: txn.id,
      installmentId: inst.id,
      amountApplied: applyAmount,
      confidence,
      matchedAt: now
    }, { merge: true })
    tx.update(instRef, {
      amountPaid,
      status,
      ...(status === 'PAID' && !data.paidAt ? { paidAt: now } : {})
    })
  })
}

async function reconcileContract({ uid, contract, txns, cfg, dry }) {
  const contractId = contract.id
  const [installments, existingLinks] = await Promise.all([
    loadInstallments(uid, contractId),
    loadExistingLinks(uid, contractId)
  ])

  // track how much of each txn is still available to apply
  const txnAvail = new Map(txns.map(t => [t.id, Math.abs(t.amount)]))
  for (const link of existingLinks.values()) {
    const r = txnAvail.get(link.txnId)
    if (r != null) txnAvail.set(link.txnId, Math.max(0, r - link.amountApplied))
  }

  // Apply payments to each unpaid installment in order
  for (const inst of installments.filter(i => i.status !== 'PAID')) {
    let remaining = Math.max(0, (inst.amountDue || 0) - (inst.amountPaid || 0))
    if (remaining <= 1e-6) continue

    const scored = txns
      .map(t => ({ t, score: scoreTxnAgainstInstallment(t, inst, contract.provider, cfg), avail: txnAvail.get(t.id) || 0 }))
      .filter(s => s.score > 0.4 && s.avail > 0)
      .sort((a,b) => b.score - a.score)

    for (const { t, score, avail } of scored) {
      if (remaining <= 1e-6) break
      const apply = Math.min(remaining, avail)
      if (apply <= 0) continue

      await writeLinkAndApply({
        uid, contractId, inst, txn: t,
        applyAmount: apply,
        confidence: Number(score.toFixed(3)),
        dry
      })

      txnAvail.set(t.id, Math.max(0, avail - apply))
      remaining -= apply
    }
  }

  // Refresh and roll up to contract
  const updated = await loadInstallments(uid, contractId)
  const nextState = nextStateForContract(updated)
  const nextDueDate = computeNextDueDate(updated)
  const outstanding = updated.reduce((sum, i) => sum + Math.max(0, (i.amountDue || 0) - (i.amountPaid || 0)), 0)
  const paidInstallments = updated.filter(i => i.status === 'PAID').length

  if (!dry) {
    await db.doc(`users/${uid}/bnpl/contracts/${contractId}`).set({
      state: nextState,
      nextDueDate: nextDueDate || null,
      outstanding,
      paidInstallments,
      totalInstallments: updated.length,
      lastReconciledAt: admin.firestore.Timestamp.now()
    }, { merge: true })
  }

  return { contractId, nextState, nextDueDate, outstanding, paidInstallments, totalInstallments: updated.length }
}

async function main() {
  const uid = args.user
  const txns = await loadCandidateTxns(uid, args.since, args.account)
  const cfg = {
    winBeforeDays: args.windowBeforeDays,
    winAfterDays: args.windowAfterDays,
    tolPct: args.amountTolerancePct,
    tolAbs: args.amountToleranceAbs
  }

  const results = []
  for await (const c of eachActiveContract(uid)) {
    const r = await reconcileContract({ uid, contract: c, txns, cfg, dry: args.dry })
    results.push(r)
    console.log(`[reconciled] ${c.id}: state=${r.nextState} outstanding=${r.outstanding?.toFixed(2)} paid=${r.paidInstallments}/${r.totalInstallments}`)
  }

  if (results.length === 0) console.log('No active BNPL contracts found.')
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
