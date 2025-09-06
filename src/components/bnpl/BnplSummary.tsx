'use client'
import { useEffect, useState } from 'react'
import { onSnapshot, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'

type Contract = {
  id: string
  provider: string
  merchant: string
  outstanding: number
  state: string
  nextDueDate?: { seconds: number }
}

export default function BnplSummary({ uid }: { uid: string }) {
  const [items, setItems] = useState<Contract[]>([])
  useEffect(() => {
    if (!uid) return;
    const colRef = collection(db, `users/${uid}/bnpl/contracts`)
    const unsub = onSnapshot(colRef, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
    })
    return () => unsub()
  }, [uid])

  if (!items.length) {
    return <div className="p-4 text-center text-muted-foreground">No active BNPL contracts found.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map(c => (
        <div key={c.id} className="p-4 rounded-2xl shadow border bg-card">
          <div className="font-semibold">{c.provider} · {c.merchant}</div>
          <div className="text-sm">State: {c.state}</div>
          <div className="text-sm">Outstanding: {Number(c.outstanding ?? 0).toFixed(2)}</div>
          {c.nextDueDate && (
            <div className="text-sm">
              Next due: {new Date(c.nextDueDate.seconds * 1000).toLocaleDateString()}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
