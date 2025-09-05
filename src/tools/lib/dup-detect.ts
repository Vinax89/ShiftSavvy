import { Firestore } from 'firebase-admin/firestore'

// Jaccard similarity over lowercase trigrams
export function trigramJaccard(a: string, b: string) {
  const tri = (s: string) => {
    const t = new Set<string>()
    const x = s.toLowerCase().replace(/\s+/g,' ')
    for (let i=0;i<x.length-2;i++) t.add(x.slice(i,i+3))
    return t
  }
  const A = tri(a), B = tri(b)
  const inter = [...A].filter(x => B.has(x)).length
  const union = new Set([...A, ...B]).size
  return union ? inter/union : 0
}

export async function findSoftDuplicate(db: Firestore, opts: {
  userId: string,
  accountId: string,
  postedDate: string, // YYYY-MM-DD
  amountCents: number,
  description: string,
  windowDays?: number,
  threshold?: number,
}) {
  const { userId, accountId, postedDate, amountCents } = opts
  const pad = (n: number) => String(n).padStart(2,'0')
  const d = new Date(postedDate+'T00:00:00Z')
  const w = opts.windowDays ?? 2
  const loD = new Date(d); loD.setUTCDate(d.getUTCDate()-w)
  const hiD = new Date(d); hiD.setUTCDate(d.getUTCDate()+w)
  const toYMD = (x: Date) => `${x.getUTCFullYear()}-${pad(x.getUTCMonth()+1)}-${pad(x.getUTCDate())}`
  const lo = toYMD(loD), hi = toYMD(hiD)

  const q = db.collection('transactions')
    .where('userId','==', userId)
    .where('accountId','==', accountId)
    .where('amountCents','==', amountCents)
    .where('postedDate','>=', lo)
    .where('postedDate','<=', hi)
  const snap = await q.get()
  let best: { id: string, score: number } | null = null
  for (const doc of snap.docs) {
    const cand = doc.data() as any
    const score = trigramJaccard(String(opts.description||''), String(cand.description||''))
    if (!best || score > best.score) best = { id: doc.id, score }
  }
  const threshold = opts.threshold ?? 0.7
  return best && best.score >= threshold ? best.id : null
}
