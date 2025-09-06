'use client'
import { useEffect, useState } from 'react'
import { collection, getDocs, query, where, writeBatch, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export default function ReviewClient(){
  const uid = 'demo-uid'
  const [cand, setCand] = useState<any[]>([])
  
  async function loadCandidates() {
      // Candidate: transactions with provider tokens but without bnplPlanId
      const snap = await getDocs(query(collection(db,'transactions'), where('userId','==',uid)))
      const rows = snap.docs.map(d=>({ id:d.id, ...d.data() }))
      const rx = /(affirm|afterpay|klarna|paypal\s*(pay in 4|installments)|shop\s*pay)/i
      setCand(rows.filter(r => rx.test(r.description) && !r.bnplPlanId && r.notes !== 'bnpl-ignore'))
  }
  
  useEffect(()=>{ 
    loadCandidates()
  },[])

  async function ignore(ids:string[]){
    const batch = writeBatch(db)
    ids.forEach(id => batch.update(doc(db,'transactions',id), { notes: 'bnpl-ignore' }))
    await batch.commit()
    await loadCandidates() // Refresh list
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <Card>
          <CardHeader>
              <CardTitle>Review BNPL</CardTitle>
              <CardDescription>Review transactions that might be part of a Buy Now, Pay Later plan but were not automatically detected.</CardDescription>
          </CardHeader>
          <CardContent>
            {cand.length===0 ? <div className='text-muted-foreground p-4 text-center'>No BNPL candidates to review.</div> : cand.map(c => (
              <Card key={c.id} className="p-3 flex items-center justify-between mb-2">
                <div className="text-sm">
                  <div className="font-medium">{c.description}</div>
                  <div className="text-muted-foreground">{c.postedDate} • {c.accountId}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{ (c.amountCents / 100).toLocaleString('en-US', {style: 'currency', currency: 'USD'})}</Badge>
                  <Button variant="outline" size="sm" onClick={()=> ignore([c.id])}>Ignore</Button>
                </div>
              </Card>
            ))}
          </CardContent>
      </Card>
    </div>
  )
}
