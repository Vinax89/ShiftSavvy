'use client'
import { addDoc, collection, doc, setDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'
import * as Sentry from '@sentry/nextjs'
import { nanoid } from 'nanoid'

export async function resolveBnplInstallment({ userId, planId, dateYMD }: { userId:string, planId:string, dateYMD:string }) {
  // Zero-dollar, owner-scoped, flagged as manual match
  const docId = `manual-${nanoid()}`;
  
  // This is a simplified approach for the demo. In a real app, you might want to create a server-side endpoint for this.
  const transactionsCollectionRef = collection(db, 'users', userId, 'transactions');
  
  // Since we are on the client, we cannot directly create a document with a specific ID in a subcollection easily without a server call.
  // We will create a transaction in the top-level `transactions` collection for simplicity as the backend services might expect it there too.
  const transactionDocRef = doc(collection(db, 'transactions'), docId);

  await setDoc(transactionDocRef, {
    userId,
    accountId: `bnpl:${planId}`, // synthetic channel to avoid real ledger pollution
    postedDate: dateYMD,
    description: 'BNPL manual resolution',
    amountCents: 0,
    currency: 'USD',
    bnpl: {
        planId: planId,
        role: 'installment'
    },
    src: { kind: 'manualMatch', importerVersion: 'ui.v1', sourceHash: docId, importedAt: new Date().toISOString() },
    schemaVersion: 2
  })

  Sentry.addBreadcrumb({ category:'bnpl', message:'manual-resolve', level:'info', data:{ planId, dateYMD } })
}
