'use client'
import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

const fmtUSD = (cents: number) => (cents/100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })

export default function TransactionsClient() {
  const [rows, setRows] = useState<any[]>([])
  const [qtext, setQ] = useState('')
  const uid = 'demo-uid' // TODO: replace with real auth user

  useEffect(() => {
    ;(async () => {
      const qy = query(
        collection(db, 'transactions'),
        where('userId','==', uid),
        orderBy('postedDate','desc'),
        limit(100)
      )
      const snap = await getDocs(qy)
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })()
  }, [])

  const filtered = useMemo(() => {
    const s = qtext.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(r => String(r.description||'').toLowerCase().includes(s))
  }, [rows, qtext])

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Search description…" value={qtext} onChange={e=>setQ(e.target.value)} />
        <div className="text-sm text-muted-foreground">{filtered.length} items</div>
      </div>
      <div className="space-y-2">
        {filtered.map(tx => (
          <Card key={tx.id} className="p-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="font-medium flex items-center gap-2">
                <span>{tx.description}</span>
                {tx.possibleDuplicateOf && <Badge variant="secondary">possible duplicate</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">{tx.postedDate} • {tx.accountId}</div>
            </div>
            <div className={`font-semibold ${tx.amountCents < 0 ? 'text-destructive' : 'text-primary'}`}>{fmtUSD(tx.amountCents)}</div>
          </Card>
        ))}
      </div>
    </div>
  )
}
