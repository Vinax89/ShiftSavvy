
'use client'
import { useEffect, useMemo, useState } from 'react'
import { useUid } from '@/hooks/useUid'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { auth } from '@/lib/firebase.client'

type Sched = { dueDate: string; amountCents: number; txnId?: string; paidCents?: number }
type Plan = {
  id: string
  merchant: string
  provider: string
  status: 'active'|'paid'|'delinquent'|'cancelled'
  schedule: Sched[]
  principalCents?: number
  aprPct?: number|null
  notes?: string
}

async function getAuthHeaders(): Promise<HeadersInit> {
    const user = auth.currentUser
    if (!user) return {}
    const token = await user.getIdToken()
    return { Authorization: `Bearer ${token}` }
}


export default function ReviewClient() {
  const uid = useUid()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<{[k:string]: Plan}>({}) // planId -> draft

  async function fetchRollups() {
    if (!uid) return
    setLoading(true)
    try {
      const headers = await getAuthHeaders();
      const r = await fetch('/api/bnpl/rollups', { headers })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'Failed to load rollups')
      setPlans((j.plans || []) as Plan[])
    } catch (e: any) {
      toast.error(e.message || 'Load failed')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchRollups() }, [uid]) // load on sign-in

  function setDraft(planId: string, mutate: (p: Plan)=>Plan) {
    setEditing(prev => ({ ...prev, [planId]: mutate(prev[planId] ?? plans.find(p => p.id===planId)!) }))
  }

  async function savePlan(planId: string) {
    const draft = editing[planId]
    if (!draft) return
    // optimistic
    const prev = plans
    setPlans(plans.map(p => p.id===planId ? draft : p))
    try {
      const headers = await getAuthHeaders();
      const r = await fetch('/api/bnpl/plan', {
        method: 'POST',
        headers: { 'content-type':'application/json', ...headers },
        body: JSON.stringify(draft),
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'Save failed')
      toast.success('Plan saved')
      setEditing(({ [planId]: _omit, ...rest }) => rest)
    } catch (e:any) {
      setPlans(prev) // revert
      toast.error(e.message || 'Save failed')
    }
  }

  async function linkTxn(planId: string, schedIdx: number) {
    const txnId = prompt('Enter transaction ID to link:')
    if (!txnId) return
    // optimistic
    const prev = plans
    setPlans(plans.map(p => p.id===planId ? ({
      ...p,
      schedule: p.schedule.map((s, i) => i===schedIdx ? { ...s, txnId } : s)
    }) : p))
    try {
       const headers = await getAuthHeaders();
      const r = await fetch('/api/bnpl/link', {
        method: 'POST',
        headers: { 'content-type':'application/json', ...headers },
        body: JSON.stringify({ planId, txnId, role:'installment' })
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'Link failed')
      toast.success('Linked')
    } catch (e:any) {
      setPlans(prev)
      toast.error(e.message || 'Link failed')
    }
  }

  async function unlinkTxn(planId: string, schedIdx: number, txnId: string) {
    const prev = plans
    setPlans(plans.map(p => p.id===planId ? ({
      ...p,
      schedule: p.schedule.map((s, i) => i===schedIdx ? { ...s, txnId: undefined } : s)
    }) : p))
    try {
       const headers = await getAuthHeaders();
      const r = await fetch('/api/bnpl/unlink', {
        method: 'POST',
        headers: { 'content-type':'application/json', ...headers },
        body: JSON.stringify({ planId, txnId })
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'Unlink failed')
      toast.success('Unlinked')
    } catch (e:any) {
      setPlans(prev)
      toast.error(e.message || 'Unlink failed')
    }
  }

  async function closePlan(planId: string) {
    // optimistic: mark paid
    const prev = plans
    setPlans(plans.map(p => p.id===planId ? { ...p, status:'paid' } : p))
    try {
       const headers = await getAuthHeaders();
      const r = await fetch('/api/bnpl/close', {
        method: 'POST',
        headers: { 'content-type':'application/json', ...headers },
        body: JSON.stringify({ planId })
      })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error || 'Close failed')
      toast.success('Plan closed')
    } catch (e:any) {
      setPlans(prev)
      toast.error(e.message || 'Close failed')
    }
  }

  if (!uid) return <div className="p-4 text-sm opacity-80">Sign in to review BNPL plans.</div>

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Review BNPL</CardTitle>
          <CardDescription>
            Link payments, edit schedules, and close plans. <Button variant="secondary" size="sm" onClick={fetchRollups} disabled={loading}>Refresh</Button>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {plans.length === 0 && <div className="text-sm opacity-80">No plans yet. Try running auto-reconstruct or create one manually.</div>}
          {plans.map(plan => {
            const draft = editing[plan.id]
            const current = draft ?? plan
            const dirty = !!draft
            const allLinkedOrPaid = (current.schedule||[]).every(s => (s.paidCents ?? 0) >= (s.amountCents ?? 0) || !!s.txnId)
            return (
              <div key={plan.id} className="border rounded p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">
                    {current.merchant}{' '}
                    <Badge variant="secondary">{current.provider}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge>{current.status}</Badge>
                    {dirty ? (
                      <>
                        <Button size="sm" onClick={()=>savePlan(plan.id)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={()=>setEditing(({[plan.id]:_, ...rest})=>rest)}>Cancel</Button>
                      </>
                    ) : current.status !== 'paid' ? (
                      <Button size="sm" variant="destructive" onClick={()=>closePlan(plan.id)} disabled={!allLinkedOrPaid}>Close</Button>
                    ) : null}
                  </div>
                </div>

                <ul className="mt-1 space-y-1">
                  {current.schedule?.map((s, i) => (
                    <li key={i} className="grid grid-cols-12 items-center gap-2">
                      {/* date editor */}
                      <div className="col-span-4">
                        {dirty ? (
                          <Input
                            type="date"
                            value={s.dueDate}
                            onChange={e=>{
                              setDraft(plan.id, p => ({
                                ...p,
                                schedule: p.schedule.map((x, idx)=> idx===i ? { ...x, dueDate: e.target.value } : x)
                              }))
                            }}
                          />
                        ) : <span className="text-sm">{s.dueDate}</span>}
                      </div>

                      {/* amount editor */}
                      <div className="col-span-3">
                        {dirty ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={(s.amountCents/100).toFixed(2)}
                            onChange={e=>{
                              const cents = Math.round(Number(e.target.value || '0')*100)
                              setDraft(plan.id, p => ({
                                ...p,
                                schedule: p.schedule.map((x, idx)=> idx===i ? { ...x, amountCents: cents } : x)
                              }))
                            }}
                          />
                        ) : <span className="text-sm">${(s.amountCents/100).toFixed(2)}</span>}
                      </div>

                      {/* link status */}
                      <div className="col-span-3">
                        {s.txnId
                          ? <Badge>linked</Badge>
                          : <Badge variant="outline">pending</Badge>}
                      </div>

                      {/* actions */}
                      <div className="col-span-2 flex justify-end gap-1">
                        {!dirty && (
                          <>
                            {s.txnId
                              ? <Button size="sm" variant="outline" onClick={()=>unlinkTxn(plan.id, i, s.txnId!)}>Unlink</Button>
                              : <Button size="sm" onClick={()=>linkTxn(plan.id, i)}>Link</Button>}
                            <Button size="sm" variant="secondary" onClick={()=>setDraft(plan.id, p=>({ ...p }))}>Edit</Button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
