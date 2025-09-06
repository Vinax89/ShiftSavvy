
'use_client'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api.client'


type Candidate = { id: string; date: string; amountCents: number; memo?: string; merchant?: string; confidence: number }

export default function TxnPickerModal({
  open, onClose, dueDate, amountCents, merchant, onPick
}: {
  open: boolean
  onClose: () => void
  dueDate: string
  amountCents: number
  merchant?: string
  onPick: (txnId: string) => void
}) {
  const [items, setItems] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        setLoading(true)
        const q = new URLSearchParams({
          date: dueDate,
          amtCents: String(amountCents),
          winBefore: '10',
          winAfter: '21',
          tolPct: '0.03',
          tolAbs: '2',
          merchant: merchant || '',
          limit: '10',
        }).toString()
        const j = await apiFetch(`/api/transactions/candidates?${q}`, { requireAuth: true })
        if (j.ok) setItems(j.candidates || [])
      } finally {
        setLoading(false)
      }
    })()
  }, [open, dueDate, amountCents, merchant])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-card text-card-foreground rounded-lg shadow-xl w-[600px] max-w-[95vw] p-4" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Choose a transaction</div>
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
        <div className="text-sm mb-3 text-muted-foreground">
          Target: <b>{dueDate}</b> • <b>${(amountCents/100).toFixed(2)}</b> {merchant ? <>• {merchant}</> : null}
        </div>

        <div className="space-y-2 max-h-[50vh] overflow-auto">
          {loading && <div className="text-sm text-muted-foreground p-4 text-center">Loading...</div>}
          {!loading && items.length === 0 && (
            <div className="text-sm text-muted-foreground p-4 text-center">No nearby matches found.</div>
          )}
          {items.map(c => (
            <div key={c.id} className="border rounded p-2 flex items-center justify-between hover:bg-muted">
              <div className="text-sm">
                <div>{c.date} — ${(c.amountCents/100).toFixed(2)} {c.merchant ? <>• {c.merchant}</> : c.memo ? <>• {c.memo}</> : null}</div>
                <div className="text-xs text-muted-foreground">id: {c.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{Math.round(c.confidence*100)}%</Badge>
                <Button size="sm" onClick={()=>{ onPick(c.id); onClose(); }}>Select</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-3 border-t">
          <ManualLink onPick={(id)=>{ onPick(id); onClose(); }} />
        </div>
      </div>
    </div>
  )
}

function ManualLink({ onPick }: { onPick: (id:string)=>void }) {
  const [id, setId] = useState('')
  return (
    <div className="flex items-center gap-2">
      <Input placeholder="Or paste a transaction ID…" value={id} onChange={e=>setId(e.target.value)} />
      <Button size="sm" onClick={()=> id && onPick(id)} disabled={!id.trim()}>Link</Button>
    </div>
  )
}
