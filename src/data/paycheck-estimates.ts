'use client'
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp, where, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'
import { stableStringify } from '@/domain/canonical'
import { sha256Base64 } from '@/domain/hash'
import { summarizeInputs } from '@/domain/paycheck.summary'
import { evaluatePaycheck } from '@/domain/paycheck'

export async function saveEstimate(userId: string, payload: any) {
  const ref = collection(db, 'paycheck_estimates')
  // We remove the userId from the doc payload itself as it's already in the path or as a top-level key
  const { userId: _, ...docData } = payload;
  return addDoc(ref, {
    userId,
    createdAt: serverTimestamp(),
    ...docData,
  })
}

export async function listEstimates(userId: string, n = 10) {
  const q = query(collection(db, 'paycheck_estimates'), where('userId','==',userId), orderBy('createdAt','desc'), limit(n))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}


export async function buildEstimateDoc({ userId, shifts, policy, tax, ytd, periodStart, periodEnd }: any) {
  const inputs = { shifts, policy, tax, ytd }
  const canonical = stableStringify(inputs)
  const inputsHash = await sha256Base64(canonical)
  const summary = summarizeInputs(shifts, policy)
  const result = evaluatePaycheck({ shifts, policy, tax, ytd })
  return { userId, periodStart, periodEnd, inputsHash, summary, result, schemaVersion: 2 }
}
