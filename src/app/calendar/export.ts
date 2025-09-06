'use client'
import type { CFEvent } from "@/domain/cashflow";

export function exportForecastCSV(events: CFEvent[]) {
  const header = ['date','kind','label','amountCents']
  const lines = [header.join(',')]
  const esc = (v:any)=>{ const s = String(v??''); return /[",\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s }
  for (const e of events) lines.push([e.date, e.kind, e.label, e.amountCents].map(esc).join(','))
  const blob = new Blob([lines.join('\n')], { type:'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=`forecast-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url)
}
