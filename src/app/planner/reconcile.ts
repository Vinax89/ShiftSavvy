'use client'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'

export async function findMonthlyMatches({ userId, accountId, ym, amountCents }: { userId:string, accountId:string, ym:string, amountCents:number }) {
  const from = ym + '-01'
  const to = (() => { const [y,m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y,m,0)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}` })()
  const qy = query(
    collection(db, 'transactions'),
    where('userId','==', userId),
    where('accountId','==', accountId),
    where('postedDate','>=', from),
    where('postedDate','<=', to),
    where('amountCents','==', -Math.abs(amountCents))
  )
  const snap = await getDocs(qy)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function findBnplMatch({ userId, planId, ym }: { userId:string, planId:string, ym:string }){
  const from = ym+'-01'; 
  const date = new Date(from + "T00:00:00Z");
  date.setUTCMonth(date.getUTCMonth()+1); 
  date.setUTCDate(0);
  const end = date.toISOString().slice(0,10)
  const snap = await getDocs(query(collection(db,'transactions'), where('userId','==',userId), where('bnplPlanId','==', planId), where('postedDate','>=', from), where('postedDate','<=', end)))
  return snap.docs.map(d=>({ id:d.id, ...d.data() }))
}
