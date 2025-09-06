'use client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { expandBnpl, type BnplOb } from '@/domain/bnpl.timeline'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { resolveBnplInstallment } from './bnpl.resolve'

const fmtUSD = (c:number)=> (c/100).toLocaleString(undefined,{style:'currency',currency:'USD'})

export default function BnplTimeline({ items, matches, userId }: { items: BnplOb[], matches: Record<string, string[]>, userId:string }){

  if (!items.length) return (
    <Card>
      <CardHeader>
        <CardTitle>BNPL Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">No active Buy Now, Pay Later plans found.</p>
      </CardContent>
    </Card>
  )
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>BNPL Timeline</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((o) => {
          const seq = expandBnpl(o)
          return (
            <div key={o.id} className="border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/50 flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="font-semibold text-card-foreground">{o.name}</div>
                  <div className="text-xs text-muted-foreground">{o.provider ? o.provider+' • ' : ''}{o.merchant ?? ''}</div>
                </div>
                <div className="text-sm font-medium text-card-foreground">{fmtUSD(o.amountCents)} × {o.remainingInstallments}</div>
              </div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {seq.map((s, idx) => {
                  const key = `${o.id}|${s.date}`
                  const ms = matches[key] || []
                  const matched = ms.length > 0
                  return (
                    <div key={key} className={`rounded-lg border p-3 text-sm flex flex-col gap-2 justify-between ${matched ?'bg-green-50/50 dark:bg-green-900/20 border-green-200/80 dark:border-green-800/50' : 'bg-card'}`}>
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-muted-foreground">{s.date}</div>
                        <div className={`font-semibold ${matched?'text-green-700 dark:text-green-400':'text-card-foreground'}`}>{fmtUSD(s.amountCents)}</div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {matched ? <Badge variant="secondary">Matched</Badge> : <Badge variant="outline">Pending</Badge>}
                        {!matched && (
                          <Button size="sm" variant="ghost" className="h-7" onClick={async ()=>{
                            await resolveBnplInstallment({ userId, planId: o.id, dateYMD: s.date })
                            toast.success('Marked as resolved', { description: `${o.name} • ${s.date}` })
                          }}>Resolve</Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
