import type { Firestore } from 'firebase-admin/firestore'
import { trigramJaccard } from '../lib/dup-detect'
import { createHash } from 'node:crypto'

const PROVIDERS = [/affirm/i, /afterpay/i, /klarna/i, /paypal\s*(pay in 4|installments)/i, /shop\s*pay/i]

export type Tx = { id:string, postedDate:string, description:string, amountCents:number, accountId:string, currency:string }
export type Detection = {
  planHash:string, provider:string, merchant:string, accountId:string, amountCents:number,
  cadence:'biweekly'|'monthly', startDate:string, count:number, observedIds:string[]
}

export async function detectBnpl(db: Firestore, userId: string): Promise<Detection[]> {
  const q = db.collection('transactions').where('userId','==', userId)
  const snap = await q.get()
  const rows = snap.docs.map(d=>({ id:d.id, ...(d.data() as any) })) as Tx[]

  // 1) provider pre-filter
  const cand = rows.filter(r => PROVIDERS.some(rx => rx.test(r.description)))

  // 2) cluster by (merchant-ish, amount, account)
  const groups: Record<string, Tx[]> = {}
  for (const r of cand) {
    const key = `${r.accountId}|${Math.abs(r.amountCents)}|${merchantKey(r.description)}`
    ;(groups[key] ||= []).push(r)
  }

  const detections: Detection[] = []
  for (const key of Object.keys(groups)) {
    const gs = groups[key].sort((a,b)=> a.postedDate.localeCompare(b.postedDate))
    if (gs.length < 2) continue
    const providerSource = PROVIDERS.find(rx => rx.test(gs[0].description))?.source.replace(/\\s\*\([^)]+\)/g, '') || 'bnpl';
    const provider = providerSource.replace(/[^a-zA-Z]/g, '');

    const merchant = prettyMerchant(gs[0].description)
    const amountCents = Math.abs(gs[0].amountCents)

    // infer cadence by gaps
    const gaps = gs.slice(1).map((t,i)=> diffDays(gs[i].postedDate, t.postedDate))
    const medianGap = gaps.sort((a,b)=>a-b)[Math.floor(gaps.length/2)] || 14
    const cadence = Math.abs(medianGap-14) <= 3 ? 'biweekly' : 'monthly'

    // infer count
    const count = inferCount(gs)
    const startDate = gs[0].postedDate
    const planHash = sha256(`${merchant}|${amountCents}|${startDate}|${count}|${cadence}`)
    detections.push({ planHash, provider, merchant, accountId: gs[0].accountId, amountCents, cadence, startDate, count, observedIds: gs.map(x=>x.id) })
  }
  return dedupe(detections)
}

function sha256(s:string){ return createHash('sha256').update(s).digest('base64') }
function diffDays(a:string,b:string){ return Math.round((+new Date(b) - +new Date(a))/86400000) }
function merchantKey(desc:string){ return desc.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(' ').slice(0,4).join(' ') }
function prettyMerchant(desc:string){ return desc.replace(/(affirm|afterpay|klarna|paypal|shop\s*pay)/ig,'').replace(/\s{2,}/g,' ').trim() || 'Unknown Merchant' }
function inferCount(ts: Tx[]): number { // look for n/m tokens
  const tok = ts.map(t=> (t.description.match(/(\d+)\s*\/\s*(\d+)/) || [])[2]).filter(Boolean)
  const n = tok.map(Number).sort((a,b)=>b-a)[0]
  return n || 4
}
function dedupe(ds: Detection[]): Detection[] {
  const m = new Map<string, Detection>()
  ds.forEach(d => { if (!m.has(d.planHash)) m.set(d.planHash, d) })
  return [...m.values()]
}
