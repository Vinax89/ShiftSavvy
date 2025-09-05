import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'csv-parse'              // streaming CSV parser
import { XMLParser } from 'fast-xml-parser'    // OFX 2.x/QFX (XML) parser
import { initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { ZTransactionV2 } from '../domain/transactions.schema'
import { stableStringify } from '../domain/canonical'
import { sha256Base64Url } from './lib/hash-url'
import { getApps } from 'firebase-admin/app'

if (!getApps().length) {
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID, credential: applicationDefault() })
}
const db = getFirestore()

const norm = (s: string) => s.trim().replace(/\s+/g, ' ')

async function upsert(txn: unknown) {
  const parsed = ZTransactionV2.parse(txn)
  const basis = {
    userId: parsed.userId,
    accountId: parsed.accountId,
    postedDate: parsed.postedDate,
    amountCents: parsed.amountCents,
    description: norm(parsed.description),
    externalId: parsed.src.externalId ?? null,
  }
  const id = await sha256Base64Url(stableStringify(basis))
  const ref = db.collection('transactions').doc(id)
  const snap = await ref.get()
  if (snap.exists) return { id, status: 'skipped' }
  await ref.set(parsed, { merge: false })
  return { id, status: 'created' }
}

async function importCSV(file: string, userId: string, accountId: string) {
  const results: any[] = []
  const parser = fs.createReadStream(file).pipe(parse({ columns: true, trim: true }))
  for await (const row of parser) {
    const postedDate = new Date(row.Date).toISOString().slice(0, 10) // adjust mapper as needed
    const amountCents = Math.round(parseFloat(String(row.Amount)) * 100)
    const description = norm(String(row.Description || ''))
    const src = {
      kind: 'csv' as const,
      fileName: path.basename(file),
      externalId: null,
      sourceHash: await sha256Base64Url(stableStringify(row)),
      importedAt: new Date().toISOString(),
      importerVersion: '2025-09-05.v1',
    }
    results.push(await upsert({ userId, accountId, postedDate, description, amountCents, currency: 'USD', src, schemaVersion: 2 }))
  }
  return results
}

async function importOFX2(file: string, userId: string, accountId: string) {
  const xml = fs.readFileSync(file, 'utf8')
  const fxp = new XMLParser({ ignoreAttributes: false, trimValues: true })
  const j = fxp.parse(xml)
  const txs = j?.OFX?.BANKMSGSRSV1?.STMTTRNRS?.STMTRS?.BANKTRANLIST?.STMTTRN || []
  const out: any[] = []
  for (const t of txs) {
    const postedDate = String(t.DTPOSTED).slice(0, 8).replace(/(\d{4})(\d{2})(\d{2}).*/, function (_, y, m, d) { return y + '-' + m + '-' + d })
    const amountCents = Math.round(parseFloat(String(t.TRNAMT)) * 100)
    const description = norm(String(t.NAME || t.MEMO || ''))
    const externalId = String(t.FITID || '') || null
    const src = {
      kind: 'ofx' as const,
      fileName: path.basename(file),
      externalId,
      sourceHash: await sha256Base64Url(stableStringify(t)),
      importedAt: new Date().toISOString(),
      importerVersion: '2025-09-05.v1',
    }
    out.push(await upsert({ userId, accountId, postedDate, description, amountCents, currency: 'USD', src, schemaVersion: 2 }))
  }
  return out
}

async function main() {
  const [,, file, userId = 'demo-uid', accountId = 'generic:checking:0000'] = process.argv
  if (!file) throw new Error('usage: tsx tools/import-transactions.ts <file.csv|.ofx|.qfx> [userId] [accountId]')
  const ext = path.extname(file).toLowerCase()
  const res = ext === '.csv'
    ? await importCSV(file, userId, accountId)
    : (ext === '.ofx' || ext === '.qfx')
      ? await importOFX2(file, userId, accountId)
      : (() => { throw new Error('Unsupported file type') })()
  console.table(res)
}
main().catch(e => { console.error(e); process.exit(1) })
