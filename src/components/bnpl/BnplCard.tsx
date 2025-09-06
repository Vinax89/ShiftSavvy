'use client'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api.client'
import { useUid } from '@/hooks/useUid'

type Rollups = { ok: true; outstandingCents: number; nextDue: string|null; plansCount: number }

export default function BnplCard() {
  const uid = useUid()
  const [data, setData] = useState<Rollups | null>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    if (!uid) return
    setLoading(true)
    try {
      const j = await apiFetch<Rollups>('/api/bnpl/rollups', { requireAuth: true })
      setData(j)
    } catch (e:any) {
      toast.error(e.message || 'Failed to load BNPL')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [uid])

  if (!uid) return null

  const dollars = (data?.outstandingCents ?? 0) / 100
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">BNPL Balance</CardTitle>
          <CardDescription>Total outstanding</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>Refresh</Button>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">${dollars.toFixed(2)}</div>
        <p className="text-xs text-muted-foreground">
          {data?.nextDue ? <>Next due on {data.nextDue}</> : 'No upcoming dues'}
        </p>
      </CardContent>
    </Card>
  )
}
