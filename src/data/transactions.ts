'use client'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'

export async function listRecentTransactions(userId: string, n = 25) {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId),
    orderBy('date', 'desc'),
    limit(n)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
