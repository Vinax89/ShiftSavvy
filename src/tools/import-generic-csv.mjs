#!/usr/bin/env node
/**
 * Generic CSV → Firestore importer + BNPL auto-detect
 * Usage:
 *   node src/tools/import-generic-csv.mjs --file ./export.csv --account acct:boa:1234 --user <UID> [--dry] [--bnpl auto|skip]
 *
 * Notes:
 * - Requires `firebase-admin` (npm i -D firebase-admin)
 * - Works with Firestore emulator if FIREBASE_PROJECT_ID is set (no creds needed)
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

// ---------- tiny arg parser ----------
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/)
    return m ? [m[1], m[2] ?? true] : [a, true]
  })
)

const file = args.file || args.f
const accountId = args.account || args.a
const userId = args.user || args.u
const dryRun = Boolean(args.dry)
const bnplMode = (args.bnpl ?? 'auto').toString()

if (!file || !accountId || !userId) {
  console.error('Usage: node src/tools/import-generic-csv.mjs --file <path.csv> --account <accountId> --user <uid> [--dry] [--bnpl auto|skip]')
  process.exit(1)
}

// ---------- Firestore admin init ----------
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'demo-shiftsavvy'
if (!getApps().length) {
  // If running against emulator, creds aren’t required.
  try {
    initializeApp({ projectId, credential: applicationDefault() })
  } catch {
    initializeApp({ projectId })
  }
}
const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })

// ---------- CSV utils (robust-ish, no deps) ----------
function parseCSV(text) {
  const rows = []
  let i = 0, cur = [], cell = '', inQ = false
  while (i < text.length) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') {
        if (text[i+1] === '"') { cell += '"'; i += 2; continue }
        inQ = false; i++; continue
      }
      cell += ch; i++; continue
    }
    if (ch === '"') { inQ = true; i++; continue }
    if (ch === ',') { cur.push(cell); cell = ''; i++; continue }
    if (ch === '\n') { cur.push(cell); rows.push(cur); cur = []; cell = ''; i++; continue }
    if (ch === '\r') { i++; continue }
    cell += ch; i++
  }
  if (cell.length || cur.length) { cur.push(cell); rows.push(cur) }
  return rows
}

function normalizeHeader(h) {
  return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function toYMD(s) {
  if (!s) return null
  const t = s.toString().trim()
  // Try ISO first
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  // Try M/D/YYYY or MM/DD/YYYY
  const mdy = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
  if (mdy) {
    const mm = String(mdy[1]).padStart(2, '0')
    const dd = String(mdy[2]).padStart(2, '0')
    const yyyy = String(mdy[3]).length === 2 ? '20' + mdy[3] : String(mdy[3])
    return `${yyyy}-${mm}-${dd}`
  }
  // Fallback via Date
  const d = new Date(t)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0,10)
  return null
}

function toCents(x) {
  if (x == null || x === '') return 0
  const n = Number(String(x).replace(/[$,]/g, ''))
  if (!isFinite(n) || isNaN(n)) return 0
  return Math.round(n * 100)
}

// ---------- Import pipeline ----------
function hydrateRow(row, headerMap) {
  const get = (names) => {
    for (const n of names) {
      const idx = headerMap[n]; if (idx != null) return row[idx]
    }
    return undefined
  }
  const date = toYMD(get(['date','transaction_date','posted_date','posting_date']))
  let desc = get(['description','memo','details','name','narrative','payee']) ?? ''
  let amountCents = 0

  const hasAmount = headerMap.amount != null || headerMap.amount_cents != null
  const debit = get(['debit','withdrawal','outflow'])
  const credit = get(['credit','deposit','inflow'])

  if (hasAmount) amountCents = toCents(get(['amount','amount_cents']))
  else if (debit != null || credit != null) amountCents = toCents(credit) - toCents(debit)
  else amountCents = 0

  // Most bank CSV put outflows as negative already; keep whatever sign we computed above.
  desc = String(desc || '').trim().slice(0, 512)

  return { postedDate: date, description: desc, amountCents }
}

function stableId({ userId, accountId, postedDate, amountCents, description }) {
  const h = crypto.createHash('sha1').update(
    [userId, accountId, postedDate, amountCents, description].join('\x1f')
  ).digest('hex')
  return `tx_${h}`
}

// ---------- BNPL detection (simple heuristic) ----------
const BNPL_PROVIDERS = [
  'afterpay', 'klarna', 'affirm', 'sezzle', 'zip', 'quadpay',
  'paypal pay in 4', 'pay in 4', 'apple pay later', 'shop pay installments'
]

function detectBnplGroups(importedTx) {
  // pick tx whose description contains provider name
  const hits = importedTx.filter(t => {
    const d = t.description.toLowerCase()
    return BNPL_PROVIDERS.some(p => d.includes(p))
  })
  // group by (provider + merchant guess + abs(amount))
  const groups = new Map()
  for (const t of hits) {
    const low = t.description.toLowerCase()
    const provider = BNPL_PROVIDERS.find(p => low.includes(p)) || 'bnpl'
    // crude merchant extraction: text after provider up to first digits or end
    let merchant = (t.description.replace(/[*]/g,'').match(new RegExp(`${provider}\\s*[:\\-\\s]*([^\\d]+)`, 'i'))?.[1] || '')
      .trim().replace(/\s{2,}/g, ' ')
    merchant = merchant.slice(0, 64) || provider.toUpperCase()
    const key = `${provider}|${merchant}|${Math.abs(t.amountCents)}`
    const arr = groups.get(key) || []
    arr.push(t)
    groups.set(key, arr)
  }
  return groups
}

function median(ns) {
  if (!ns.length) return 0
  const xs = [...ns].sort((a,b)=>a-b)
  const mid = Math.floor(xs.length/2)
  return xs.length % 2 ? xs[mid] : (xs[mid-1] + xs[mid]) / 2
}

function addStep(ymd, cadence) {
  const d = new Date(ymd+'T00:00:00Z')
  if (cadence === 'biweekly') d.setDate(d.getDate() + 14)
  else {
    const day = d.getUTCDate()
    const m = d.getUTCMonth()
    const y = d.getUTCFullYear()
    const next = new Date(Date.UTC(y, m+1, 1))
    const end = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth()+1, 0)).getUTCDate()
    d.setUTCFullYear(next.getUTCFullYear(), next.getUTCMonth(), Math.min(day, end))
  }
  return d.toISOString().slice(0,10)
}

async function autoDetectBnpl({ importedTx, userId }) {
  const groups = detectBnplGroups(importedTx)
  const created = []
  for (const [key, arr] of groups.entries()) {
    if (arr.length < 2) continue // need at least 2 to infer
    const [provider, merchant, absAmtStr] = key.split('|')
    const absAmt = Number(absAmtStr)
    // sort by date
    const seq = arr.map(t => ({ ...t, ts: new Date(t.postedDate+'T00:00:00Z').valueOf() }))
                  .filter(t => isFinite(t.ts))
                  .sort((a,b)=>a.ts-b.ts)

    const gaps = []
    for (let i=1;i<seq.length;i++) gaps.push((seq[i].ts - seq[i-1].ts) / (1000*60*60*24))
    const medGap = median(gaps)
    const cadence = (Math.abs(medGap - 14) <= 3) ? 'biweekly' : 'monthly'

    // remaining installments heuristic: look for "1/4" in description; else default 4 or 6
    const frac = seq[seq.length-1].description.match(/(\d+)\s*\/\s*(\d+)/)
    let remaining = 4
    if (frac) remaining = Math.max(0, Number(frac[2]) - Number(frac[1]))
    else remaining = cadence === 'biweekly' ? Math.max(0, 4 - seq.length) : Math.max(0, 4 - seq.length)

    const nextDueDate = addStep(seq[seq.length-1].postedDate, cadence)

    const planId = `bnpl_${crypto.createHash('md5').update([userId,provider,merchant,absAmt].join('|')).digest('hex')}`

    const planDoc = {
      userId,
      kind: 'bnpl',
      name: merchant,
      provider,
      merchant,
      amountCents: absAmt,
      cadence,
      nextDueDate,
      remainingInstallments: remaining,
      schemaVersion: 2,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    if (!dryRun) {
      await db.collection('obligations').doc(planId).set(planDoc, { merge: true })
      // tag imported tx with plan id
      const batch = db.batch()
      for (let i=0;i<seq.length;i++) {
        const t = seq[i]
        const ref = db.collection('transactions').doc(t.__docId)
        batch.update(ref, { bnplPlanId: planId, bnplSequence: i+1, updatedAt: Timestamp.now() })
      }
      await batch.commit()
    }
    created.push({ planId, provider, merchant, cadence, amountCents: absAmt, nextDueDate, remainingInstallments: remaining, matched: seq.length })
  }
  return created
}

// ---------- main ----------
;(async function main() {
  const csv = fs.readFileSync(path.resolve(file), 'utf8')
  const rows = parseCSV(csv)
  if (!rows.length) { console.error('CSV has no rows'); process.exit(1) }

  const header = rows[0].map(normalizeHeader)
  const headerMap = Object.fromEntries(header.map((h,i)=>[h,i]))
  const data = rows.slice(1).filter(r => r.some(c => String(c||'').trim().length))

  const imported = []
  const batchSize = 400
  let batch = db.batch(), pending = 0, written = 0, skipped = 0

  for (const row of data) {
    const t = hydrateRow(row, headerMap)
    if (!t.postedDate) { skipped++; continue }
    if (t.amountCents === 0 && !String(t.description).trim()) { skipped++; continue }

    const docId = stableId({ userId, accountId, ...t })
    const doc = {
      userId,
      accountId,
      postedDate: t.postedDate,
      description: t.description,
      amountCents: t.amountCents,
      currency: 'USD',
      schemaVersion: 2,
      src: { kind: 'csv', provider: 'generic', importerVersion: 'csv.v1', file: path.basename(file) },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }

    if (dryRun) {
      imported.push({ ...t, __docId: docId, id: docId })
      continue
    }

    const ref = db.collection('transactions').doc(docId)
    batch.set(ref, doc, { merge: true })
    imported.push({ ...t, __docId: docId, id: docId })
    pending++; written++
    if (pending >= batchSize) {
      await batch.commit()
      batch = db.batch()
      pending = 0
    }
  }
  if (!dryRun && pending > 0) await batch.commit()

  console.log(`Imported ${written} transaction(s). Skipped ${skipped}.`)

  if (bnplMode !== 'skip') {
    const plans = await autoDetectBnpl({ importedTx: imported, userId })
    if (plans.length) {
      console.log(`BNPL detection: created/updated ${plans.length} plan(s):`)
      for (const p of plans) {
        const amt = (p.amountCents/100).toLocaleString('en-US',{style:'currency',currency:'USD'})
        console.log(`- ${p.provider} • ${p.merchant} • ${p.cadence} • ${amt} • next ${p.nextDueDate} • matched ${p.matched} tx`)
      }
    } else {
      console.log('BNPL detection: no plans inferred from this CSV batch.')
    }
  } else {
    console.log('BNPL detection skipped (use --bnpl auto to enable).')
  }

  if (dryRun) {
    console.log(`(dry run) Would write ${imported.length} tx. No Firestore changes made.`)
  }
})().catch(err => {
  console.error(err)
  process.exit(1)
})
