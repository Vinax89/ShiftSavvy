
'use client'
import { useEffect, useState } from 'react'
import { useUid } from '@/hooks/useUid'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type Plan = {
  id: string
  merchant: string
  provider: string
  status: string
  schedule: { dueDate: string; amountCents: number; txnId?: string; paidCents?: number }[]
}

export default function ReviewClient() {
  const uid = useUid()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)

  async function refresh() {
    if (!uid) return
    setLoading(true)
    try {
      const r = await fetch('/api/bnpl/rollups', { headers: devHeaders(uid) })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'Failed')
      setPlans(j.plans || [])
    } catch (e: any) {
      toast.error(e.message)
    } finally { setLoading(false) }
  }

  useEffect(() => { refresh() }, [uid])

  if (!uid) return <div className="p-4 text-sm opacity-80">Sign in to review BNPL plans.</div>

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Review BNPL</CardTitle>
          <CardDescription>Link/unlink payments, edit schedules, and close plans.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button disabled={loading} onClick={refresh}>Refresh</Button>
          <div className="space-y-2">
            {plans.map(p => (
              <div key={p.id} className="border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{p.merchant} <Badge variant="secondary">{p.provider}</Badge></div>
                  <Badge>{p.status}</Badge>
                </div>
                <ul className="mt-2 text-sm">
                  {p.schedule?.map((s, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span>{s.dueDate}</span>
                      <span>${(s.amountCents/100).toFixed(2)} {s.txnId ? <Badge>linked</Badge> : <Badge variant="outline">pending</Badge>}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Dev-only: allow X-UID header without Auth token
function devHeaders(uid: string): HeadersInit {
  return process.env.NODE_ENV !== 'production' ? { 'x-uid': uid } : {}
}
