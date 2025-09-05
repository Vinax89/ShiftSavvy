'use client'
import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, orderBy, query, where, limit, startAfter } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const PAGE_SIZE = 50
const fmtUSD = (cents: number) => (cents/100).toLocaleString(undefined, { style: 'currency', currency: 'USD' })

export default function TransactionsClient() {
  const [items, setItems] = useState<any[]>([])
  const [lastDoc, setLastDoc] = useState<any>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  const [qtext, setQ] = useState('')
  const [account, setAccount] = useState('')
  const [from, setFrom] = useState('') // YYYY-MM-DD
  const [to, setTo] = useState('')   // YYYY-MM-DD
  const uid = 'demo-uid' // TODO: real auth

  async function loadPage(reset=false) {
    setLoading(true)
    try {
      let qy: any = query(
        collection(db, 'transactions'),
        where('userId','==', uid),
        orderBy('postedDate','desc'),
        limit(PAGE_SIZE)
      )
      if (account) qy = query(qy, where('accountId','==', account))
      if (from) qy = query(qy, where('postedDate','>=', from))
      if (to) qy = query(qy, where('postedDate','<=', to))
      if (!reset && lastDoc) qy = query(qy, startAfter(lastDoc))

      const snap = await getDocs(qy)
      const batch = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      setLastDoc(snap.docs[snap.docs.length - 1] || null)
      setHasMore(snap.docs.length === PAGE_SIZE)
      setItems(prev => reset ? batch : [...prev, ...batch])
    } finally {
      setLoading(false)
    }
  }

  // initial + filter changes
  useEffect(() => { loadPage(true) }, [account, from, to])

  const accounts = useMemo(() => {
    const s = new Set<string>()
    items.forEach(r => { if (r.accountId) s.add(String(r.accountId)) })
    return Array.from(s).sort()
  }, [items])

  const filtered = useMemo(() => {
    const s = qtext.trim().toLowerCase()
    if (!s) return items
    return items.filter(r => String(r.description||'').toLowerCase().includes(s))
  }, [items, qtext])

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
        <div className="text-right text-sm text-muted-foreground">{filtered.length} shown</div>
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

      <div className="flex items-center justify-between pt-2">
        <Button variant="secondary" onClick={() => exportCsv(filtered, uid)} disabled={!filtered.length}>Export CSV</Button>
        <Button onClick={() => loadPage(false)} disabled={!hasMore || loading}>{loading ? 'Loading…' : hasMore ? 'Load more' : 'No more'}</Button>
      </div>
    </div>
  )
}

function exportCsv(rows: any[], uid: string) {
  const esc = (v: any) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const header = ['id','postedDate','description','amountCents','currency','accountId','possibleDuplicateOf','src.kind','src.externalId']
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push([
      r.id,
      r.postedDate,
      r.description,
      r.amountCents, // cents-at-rest preserved
      r.currency,
      r.accountId,
      r.possibleDuplicateOf ?? '',
      r.src?.kind ?? '',
      r.src?.externalId ?? '',
    ].map(esc).join(','))
  }
  const csv = lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-${uid}-${new Date().toISOString().slice(0,10)}.csv`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
