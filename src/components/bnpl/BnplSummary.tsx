'use client'
import { useEffect, useState } from 'react'
import { onSnapshot, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'
import { useUid } from '@/hooks/useUid'
import { Skeleton } from '@/components/ui/skeleton'

type Contract = {
  id: string
  provider: string
  merchant: string
  outstanding: number
  state: string
  nextDueDate?: { seconds: number }
}

export default function BnplSummary() {
  const uid = useUid()
  const [items, setItems] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      setItems([]);
      return
    }
    setLoading(true);
    const colRef = collection(db, `users/${uid}/bnpl/contracts`)
    const unsub = onSnapshot(colRef, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub()
  }, [uid])

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    );
  }

  if (!uid) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Sign in to see BNPL contracts.</div>
  }
  
  if (items.length === 0) {
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
