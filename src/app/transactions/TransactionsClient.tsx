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
  const [account, setAccount] = useState('')
  const [from, setFrom] = useState('') // YYYY-MM-DD
  const [to, setTo] = useState('')   // YYYY-MM-DD
  const uid = 'demo-uid' // TODO: real auth

  useEffect(() => {
    ;(async () => {
      const qy = query(
        collection(db, 'transactions'),
        where('userId','==', uid),
        orderBy('postedDate','desc'),
        limit(500)
      )
      const snap = await getDocs(qy)
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })()
  }, [])

  const accounts = useMemo(() => {
    const s = new Set<string>()
    rows.forEach(r => { if (r.accountId) s.add(String(r.accountId)) })
    return Array.from(s).sort()
  }, [rows])

  const filtered = useMemo(() => {
    const s = qtext.trim().toLowerCase()
    return rows.filter(r => {
      if (account && String(r.accountId) !== account) return false
      if (from && String(r.postedDate) < from) return false
      if (to && String(r.postedDate) > to) return false
      if (!s) return true
      return String(r.description||'').toLowerCase().includes(s)
    })
  }, [rows, qtext, account, from, to])

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
        <div className="col-span-2">
          <Input placeholder="Search description…" value={qtext} onChange={e=>setQ(e.target.value)} />
        </div>
        <div>
          <select className="w-full border rounded h-9 px-2 bg-background" value={account} onChange={e=>setAccount(e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="text-right text-sm text-muted-foreground">{filtered.length} items</div>
        <div className="sm:col-span-2 flex items-center gap-2">
          <label className="text-xs text-muted-foreground">From</label>
          <Input type="date" value={from} onChange={e=>setFrom(e.target.value)} />
          <label className="text-xs text-muted-foreground">To</label>
          <Input type="date" value={to} onChange={e=>setTo(e.target.value)} />
        </div>
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
