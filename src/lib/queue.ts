'use client'
import { openDB, IDBPDatabase } from 'idb'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'

type Mutation = {
  id: string
  ts: number
  kind: 'add_estimate'
  userId: string
  doc: any
  retryCount: number
  nextAt: number
}
let _db: IDBPDatabase<any> | null = null
async function pdb() { return _db ??= await openDB('nf-queue', 1, { upgrade(db){ db.createObjectStore('mutations', { keyPath:'id' }) } }) }

const now = () => Date.now()
const jitter = (ms: number) => Math.floor(ms * (0.8 + Math.random()*0.4))
const backoff = (retries: number) => jitter(Math.min(60_000, 1_000 * 2 ** retries))

export async function enqueueEstimate(userId: string, doc: any) {
  const m: Mutation = { id: crypto.randomUUID(), ts: now(), kind: 'add_estimate', userId, doc, retryCount: 0, nextAt: 0 }
  const dbx = await pdb(); await dbx.put('mutations', m)
  // Kick a flush attempt optimistically
  flush().catch(()=>{})
}

export async function flush() {
  const dbx = await pdb()
  const tx = dbx.transaction('mutations', 'readwrite')
  const store = tx.store
  const all = await store.getAll()
  const due = all.filter(m => m.nextAt <= now())
  for (const m of due) {
    try {
      if (m.kind === 'add_estimate') {
        // We remove the userId from the doc payload itself as it's already in the path or as a top-level key
        const { userId: _, ...docData } = m.doc;
        await addDoc(collection(db, 'paycheck_estimates'), { userId: m.userId, ...docData, createdAt: serverTimestamp() })
      }
      await store.delete(m.id)
    } catch (err) {
      m.retryCount += 1
      m.nextAt = now() + backoff(m.retryCount)
      m.doc.lastError = String((err as any)?.message ?? err)
      await store.put(m)
    }
  }
  await tx.done
}

// Auto-flush on connectivity and focus
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => flush().catch(()=>{}))
  window.addEventListener('focus', () => flush().catch(()=>{}))
  navigator.serviceWorker?.addEventListener?.('message', (e: any) => { if (e.data?.type === 'SYNC_FLUSH') flush().catch(()=>{}) })
}

export async function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
        const reg = await navigator.serviceWorker.ready
        await reg.sync.register('flush-queue') 
    } catch (e) {
        console.error('Background sync registration failed:', e)
    }
  }
}
