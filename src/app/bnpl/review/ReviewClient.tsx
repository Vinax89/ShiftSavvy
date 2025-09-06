
'use client'
import { useEffect, useMemo, useState } from 'react'
import { useUid } from '@/hooks/useUid'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api.client'
import TxnPickerModal from './TxnPickerModal'

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
type PlansResponse = { ok: true, plans: Plan[] }


export default function ReviewClient() {
  const uid = useUid()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<{[k:string]: Plan}>({}) // planId -> draft
  const [picker, setPicker] = useState<{ open: boolean; planId?: string; schedIdx?: number }>(
    { open: false }
  )

  async function fetchPlans() {
    if (!uid) return
    setLoading(true)
    try {
      const j = await apiFetch<PlansResponse>('/api/bnpl/plans', { requireAuth: true })
      setPlans(j.plans || [])
    } catch (e: any) {
      toast.error(e.message || 'Load failed')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchPlans() }, [uid]) // load on sign-in

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
      await apiFetch('/api/bnpl/plan', {
        method: 'POST',
        body: JSON.stringify(draft),
        requireAuth: true,
      })
      toast.success('Plan saved')
      setEditing(({ [planId]: _omit, ...rest }) => rest)
    } catch (e:any) {
      setPlans(prev) // revert
      toast.error(e.message || 'Save failed')
    }
  }

  async function linkTxn(planId: string, schedIdx: number, txnId: string) {
    // optimistic
    const prev = plans
    setPlans(plans.map(p => p.id===planId ? ({
      ...p,
      schedule: p.schedule.map((s, i) => i===schedIdx ? { ...s, txnId } : s)
    }) : p))
    try {
       await apiFetch('/api/bnpl/link', {
        method: 'POST',
        body: JSON.stringify({ planId, txnId, role:'installment' }),
        requireAuth: true,
      })
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
       await apiFetch('/api/bnpl/unlink', {
        method: 'POST',
        body: JSON.stringify({ planId, txnId }),
        requireAuth: true,
      })
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
       await apiFetch('/api/bnpl/close', {
        method: 'POST',
        body: JSON.stringify({ planId }),
        requireAuth: true,
      })
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
            Link payments, edit schedules, and close plans. <Button variant="secondary" size="sm" onClick={fetchPlans} disabled={loading}>Refresh</Button>
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
                      <Button
                        data-testid={`close-${plan.id}`}
                        size="sm"
                        variant="destructive"
                        onClick={()=>closePlan(plan.id)}
                        disabled={!allLinkedOrPaid}
                      >
                        Close
                      </Button>
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
                              ? <Button
                                  data-testid={`unlink-${plan.id}-${i}`}
                                  size="sm"
                                  variant="outline"
                                  onClick={()=>unlinkTxn(plan.id, i, s.txnId!)}
                                >
                                  Unlink
                                </Button>
                              : <Button
                                  data-testid={`link-${plan.id}-${i}`}
                                  size="sm"
                                  onClick={()=>setPicker({ open:true, planId: plan.id, schedIdx: i })}
                                >
                                  Link
                                </Button>}
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
      
      {/* Modal */}
      {picker.open && (() => {
        const p = plans.find(x => x.id === picker.planId)
        const s = p?.schedule[picker.schedIdx ?? -1]
        if (!p || !s || !uid) return null
        return <TxnPickerModal
          open={picker.open}
          onClose={()=>setPicker({ open:false })}
          dueDate={s.dueDate}
          amountCents={s.amountCents}
          merchant={p.merchant}
          onPick={(txnId)=>linkTxn(p.id, picker.schedIdx!, txnId)}
        />
      })()}
    </div>
  )
}
