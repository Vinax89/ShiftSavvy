'use client'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'
import * as Sentry from '@sentry/nextjs'
import { nanoid } from 'nanoid'

export async function resolveBnplInstallment({ userId, planId, dateYMD }: { userId:string, planId:string, dateYMD:string }) {
  // Zero-dollar, owner-scoped, flagged as manual match
  const docId = `manual-${nanoid()}`;
  await addDoc(collection(db, 'transactions'), {
    userId,
    accountId: `bnpl:${planId}`, // synthetic channel to avoid real ledger pollution
    postedDate: dateYMD,
    description: 'BNPL manual resolution',
    amountCents: 0,
    currency: 'USD',
    bnplPlanId: planId,
    bnplSequence: null,
    src: { kind: 'manualMatch', importerVersion: 'ui.v1', sourceHash: docId, importedAt: new Date().toISOString() },
    schemaVersion: 2
  })
  Sentry.addBreadcrumb({ category:'bnpl', message:'manual-resolve', level:'info', data:{ planId, dateYMD } })
}
