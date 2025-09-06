// src/data/bnpl.ts
import db from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { computeRollups } from '@/domain/bnpl.rollups';
import type { Plan } from '@/domain/bnpl.rollups';

const PLANS_PATH = (uid: string) => `users/${uid}/bnpl/contracts`;    // <— current
const EVENTS_PATH = (uid: string) => `users/${uid}/bnpl/events`;      // <— new
const DUAL_WRITE = process.env.BNPL_DUAL_WRITE !== 'false' // default true

export type { Plan };

export async function upsertPlan(uid: string, plan: Plan) {
  const ref = db.collection(PLANS_PATH(uid)).doc(plan.id);
  await ref.set({ ...plan, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await logEvent(uid, {
    type: 'userEdited',
    planId: plan.id,
    after: plan,
    at: FieldValue.serverTimestamp(),
  });
}

export async function linkTxn(uid: string, planId: string, txnId: string, role: 'principal'|'installment') {
  const nested = db.collection(`users/${uid}/transactions`).doc(txnId)
  const legacy = db.collection(`transactions`).doc(txnId)
  const batch = db.batch()
  batch.set(nested, { bnpl: { planId, role } }, { merge: true })
  if (DUAL_WRITE) batch.set(legacy, { bnpl: { planId, role }, userId: uid }, { merge: true })
  await batch.commit()
  await logEvent(uid, { type:'linkPayment', planId, txnId, at: FieldValue.serverTimestamp() })
}

export async function unlinkTxn(uid: string, planId: string, txnId: string) {
  const nested = db.collection(`users/${uid}/transactions`).doc(txnId)
  const legacy = db.collection(`transactions`).doc(txnId)
  const batch = db.batch()
  batch.set(nested, { bnpl: FieldValue.delete() }, { merge: true })
  if (DUAL_WRITE) batch.set(legacy, { bnpl: FieldValue.delete() }, { merge: true })
  await batch.commit()
  await logEvent(uid, { type:'unlinkPayment', planId, txnId, at: FieldValue.serverTimestamp() })
}

export async function closePlan(uid: string, planId: string) {
  await db.collection(PLANS_PATH(uid)).doc(planId)
    .set({ status: 'paid', updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await logEvent(uid, { type: 'closePlan', planId, at: FieldValue.serverTimestamp() });
}

export async function rollups(uid: string) {
  const snap = await db.collection(PLANS_PATH(uid)).get();
  const plans: Plan[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  const summary = computeRollups(plans);
  return { ...summary, plans };
}

async function logEvent(uid: string, ev: any) {
  await db.collection(EVENTS_PATH(uid)).add(ev);
}
