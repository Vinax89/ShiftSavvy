
'use client'
import { TrendingUp, TriangleAlert, Filter, Settings, FileDown } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function CalendarHeader({
  minBalanceCents, shortfallDays, range, setRange, filters, setFilters, onExport, onSettings
}: {
  minBalanceCents: number
  shortfallDays: number
  range: number
  setRange: (n:number)=>void
  filters: { showPay: boolean; showBills: boolean; showBnpl: boolean }
  setFilters: (f: any)=>void
  onExport: () => void
  onSettings: () => void
}) {
  const fmt = (c:number)=> (c/100).toLocaleString(undefined,{style:'currency',currency:'USD'})
  return (
    <Card>
      <CardHeader className="p-4 flex flex-row flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="space-y-0.5">
            <div className="text-sm text-muted-foreground">Min balance</div>
            <div className={`text-xl font-bold ${minBalanceCents<0?'text-destructive':''}`}>{fmt(minBalanceCents)}</div>
          </div>
          <div className="space-y-0.5">
            <div className="text-sm text-muted-foreground">Shortfall days</div>
            <div className={`text-xl font-bold flex items-center gap-1.5 ${shortfallDays > 0 ? 'text-destructive':''}`}>
              {shortfallDays > 0 ? <TriangleAlert className="w-5 h-5"/> : <TrendingUp className="w-5 h-5 text-green-600"/>}
              {shortfallDays}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 p-1 bg-muted rounded-lg">
            <Button variant={range===30?'default':'ghost'} size="sm" onClick={()=>setRange(30)}>30d</Button>
            <Button variant={range===60?'default':'ghost'} size="sm" onClick={()=>setRange(60)}>60d</Button>
            <Button variant={range===90?'default':'ghost'} size="sm" onClick={()=>setRange(90)}>90d</Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant={filters.showPay? 'secondary':'outline'} size="sm" onClick={()=>setFilters({ ...filters, showPay: !filters.showPay })}><Filter className="w-3.5 h-3.5 mr-1.5"/>Pay</Button>
            <Button variant={filters.showBills? 'secondary':'outline'} size="sm" onClick={()=>setFilters({ ...filters, showBills: !filters.showBills })}><Filter className="w-3.5 h-3.5 mr-1.5"/>Bills</Button>
            <Button variant={filters.showBnpl? 'secondary':'outline'} size="sm" onClick={()=>setFilters({ ...filters, showBnpl: !filters.showBnpl })}><Filter className="w-3.5 h-3.5 mr-1.5"/>BNPL</Button>
          </div>
          <Button variant="outline" size="icon" onClick={onExport}><FileDown className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" onClick={onSettings}><Settings className="w-4 h-4" /></Button>
        </div>
      </CardHeader>
    </Card>
  )
}
