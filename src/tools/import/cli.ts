import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { parse } from 'csv-parse/sync'
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { mappers, type Tx } from './mappers'
import { runBnpl } from './post-bnpl'

function stableStringify(v:any): string {
  return JSON.stringify(sort(v));
  function sort(x:any): any { if (Array.isArray(x)) return x.map(sort); if (x && typeof x==='object') { return Object.keys(x).sort().reduce((o,k)=> ((o as any)[k]=sort(x[k]), o),{} as any) } return x }
}
function sha256Base64(s:string){ return createHash('sha256').update(s).digest('base64') }
function normDesc(s:string){ return s.toUpperCase().replace(/\s+/g,' ').trim() }

async function main(){
  if (!getApps().length) {
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID, credential: applicationDefault() })
  }
  const db = getFirestore()

  const file = process.argv[2]
  const vendor = process.argv[3] || 'generic_dc'
  const uid = process.env.DEMO_UID || process.env.IMPORT_UID
  const accountId = process.argv[4] || 'acct:manual:1'
  const dry = process.argv.includes('--dry-run')
  const archive = process.argv.includes('--archive')
  const bnpl = process.argv.includes('--bnpl')

  if (!file || !uid) { console.error('Usage: tsx tools/import/cli.ts <file.csv> <vendor> [accountId] [--dry-run] [--archive] [--bnpl]'); process.exit(2) }

  const mapper = mappers[vendor]
  if (!mapper) { console.error('Unknown vendor mapper:', vendor); process.exit(2) }

  const raw = readFileSync(file, 'utf8')
  const rows = parse(raw, { columns: true, skip_empty_lines: true }) as any[]

  const fileHash = sha256Base64(raw)
  const out: (Tx & { txKey: string })[] = []
  for (const r of rows) {
    const t = mapper(r, { accountId })
    if (!t) continue
    const txKey = sha256Base64(stableStringify({ userId: uid, accountId: t.accountId, postedDate: t.postedDate, amountCents: t.amountCents, normDesc: normDesc(t.description) }))
    out.push({ ...t, txKey })
  }

  // De-dupe within file by txKey
  const unique = Array.from(new Map(out.map(x=>[x.txKey,x])).values())

  // Dry-run summary
  console.log(`Parsed ${rows.length} rows -> ${unique.length} candidate tx (uid=${uid}, acct=${accountId})`)

  if (dry) {
    console.table(unique.slice(0, 5));
    return;
  }

  // Batch write (upsert by txKey)
  const batchSize = 400
  let written = 0, skipped = 0
  for (let i=0;i<unique.length;i+=batchSize) {
    const batch = db.batch()
    const slice = unique.slice(i, i+batchSize)
    for (const t of slice) {
      const q = await db.collection('transactions')
        .where('userId','==', uid)
        .where('txKey','==', t.txKey)
        .limit(1)
        .get()
      if (!q.empty) { skipped++; continue }
      const ref = db.collection('transactions').doc()
      batch.set(ref, {
        userId: uid,
        accountId: t.accountId,
        postedDate: t.postedDate,
        description: t.description,
        amountCents: t.amountCents,
        currency: 'USD',
        txKey: t.txKey,
        src: { kind: 'csv', vendor, fileHash, importedAt: Timestamp.now().toMillis() },
        schemaVersion: 2
      })
    }
    await batch.commit()
    written += (slice.length - skipped)
  }

  console.log(`Committed. Wrote=${written} Skipped=${skipped}`)

  if (archive) {
    // Optional: write raw CSV to Storage (requires a service account with Storage access if on prod)
    const { getStorage } = await import('firebase-admin/storage')
    const storage = getStorage()
    const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    if (!bucketName) {
      console.error('FIREBASE_STORAGE_BUCKET not set, cannot archive.');
    } else {
      const bucket = storage.bucket(bucketName)
      const day = new Date().toISOString().slice(0,10).replace(/-/g,'')
      const path = `imports-archive/${uid}/${day}/${fileHash}.csv`
      await bucket.file(path).save(raw, { contentType: 'text/csv', resumable: false, metadata: { cacheControl: 'no-store' } })
      console.log(`Archived to gs://${bucketName}/${path}`)
    }
  }

  if (bnpl && written > 0) {
    console.log('Running BNPL detection...');
    await runBnpl(uid);
  }
}

main().catch((e)=>{ console.error(e); process.exit(1) })
