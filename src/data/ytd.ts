'use client';
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'

export async function getYtdGrossCents(uid: string, year = new Date().getFullYear()) {
  const col = collection(db, `users/${uid}/paychecks`)
  const start = new Date(year, 0, 1)
  const end = new Date(year + 1, 0, 1)

  const qy = query(col,
    where('payDate', '>=', start),
    where('payDate', '<', end)
  )

  const snap = await getDocs(qy)
  let sum = 0
  snap.forEach(d => { sum += Number((d.data() as any).grossCents || 0) })
  return sum
}
