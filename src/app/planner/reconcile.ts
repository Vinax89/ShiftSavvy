'use client'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'

export async function findMonthlyMatches({ userId, accountId, ym, amountCents }: { userId:string, accountId:string, ym:string, amountCents:number }) {
  const from = ym + '-01'
  const to = (() => { const [y,m] = ym.split('-').map(Number); const d = new Date(Date.UTC(y,m,0)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}` })()
  
  // Query the nested collection first
  let userTransactionsQuery = query(
    collection(db, `users/${userId}/transactions`),
    where('accountId','==', accountId),
    where('postedDate','>=', from),
    where('postedDate','<=', to),
    where('amountCents','==', -Math.abs(amountCents))
  );
  let snap = await getDocs(userTransactionsQuery);
  if (snap.empty) {
      // Fallback to top-level collection if needed
      userTransactionsQuery = query(
        collection(db, 'transactions'),
        where('userId','==', userId),
        where('accountId','==', accountId),
        where('postedDate','>=', from),
        where('postedDate','<=', to),
        where('amountCents','==', -Math.abs(amountCents))
      );
      snap = await getDocs(userTransactionsQuery);
  }

  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function findBnplMatch({ userId, planId, ym }: { userId:string, planId:string, ym:string }){
  const from = ym+'-01'; 
  const date = new Date(from + "T00:00:00Z");
  date.setUTCMonth(date.getUTCMonth()+1); 
  date.setUTCDate(0);
  const end = date.toISOString().slice(0,10)
  
  // Query the nested collection first
  let q = query(
      collection(db,`users/${userId}/transactions`), 
      where('bnpl.planId','==', planId), 
      where('postedDate','>=', from), 
      where('postedDate','<=', end)
  );
  let snap = await getDocs(q);
  
  if (snap.empty) {
    // Fallback to top-level collection
    q = query(
        collection(db,'transactions'), 
        where('userId','==',userId), 
        where('bnpl.planId','==', planId), 
        where('postedDate','>=', from), 
        where('postedDate','<=', end)
    );
    snap = await getDocs(q);
  }

  return snap.docs.map(d=>({ id:d.id, ...d.data() }))
}
