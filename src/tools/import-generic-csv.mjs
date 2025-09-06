#!/usr/bin/env node
/**
 * Generic CSV → Firestore importer + BNPL auto-detect
 * Usage:
 *   node scripts/import-generic-csv.mjs --file ./export.csv --account acct:boa:1234 --user <UID> [--dry] [--bnpl auto|skip]
 *
 * Notes:
 * - Requires `firebase-admin` (npm i -D firebase-admin)
 * - Works with Firestore emulator if FIREBASE_PROJECT_ID is set (no creds needed)
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

// ---------- tiny arg parser ----------
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] ?? true] : [a, true];
  })
);

const file = args.file || args.f;
const accountId = args.account || args.a;
const userId = args.user || args.u;
const dryRun = Boolean(args.dry);
const bnplMode = (args.bnpl ?? 'auto').toString();

if (!file || !accountId || !userId) {
  console.error('Usage: node src/tools/import-generic-csv.mjs --file <path.csv> --account <accountId> --user <uid> [--dry] [--bnpl auto|skip]');
  process.exit(1);
}

// ---------- Firestore admin init ----------
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || 'demo-nursefin';
if (!getApps().length) {
  try {
    initializeApp({ projectId, credential: applicationDefault() });
  } catch {
    initializeApp({ projectId });
  }
}
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

// ---------- CSV utils (robust-ish, no deps) ----------
function parseCSV(text) {
  const rows = [];
  let i = 0, cur = [], cell = '', inQ = false;
  while (i < text.length) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i+1] === '"') { cell += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      cell += ch; i++; continue;
    }
    if (ch === '"') { inQ = true; i++; continue; }
    if (ch === ',') { cur.push(cell); cell = ''; i++; continue; }
    if (ch === '\n') { cur.push(cell); rows.push(cur); cur = []; cell = ''; i++; continue; }
    if (ch === '\r') { i++; continue; }
    cell += ch; i++;
  }
  if (cell.length || cur.length) { cur.push(cell); rows.push(cur); }
  return rows;
}

function normalizeHeader(h) {
  return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function toYMD(s) {
  if (!s) return null;
  const t = s.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return new Date(t).toISOString().slice(0,10);
  const mdy = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (mdy) {
    const mm = String(mdy[1]).padStart(2, '0');
    const dd = String(mdy[2]).padStart(2, '0');
    const yyyy = String(mdy[3]).length === 2 ? '20' + mdy[3] : String(mdy[3]);
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(t);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
  return null;
}

function toCents(x) {
  if (x == null || x === '') return 0;
  const n = Number(String(x).replace(/[$,]/g, ''));
  return isFinite(n) ? Math.round(n * 100) : 0;
}

// ---------- Import pipeline ----------
function hydrateRow(row, headerMap) {
  const get = (names) => {
    for (const n of names) {
      const idx = headerMap[n]; if (idx != null) return row[idx];
    }
    return undefined;
  };
  const date = toYMD(get(['date','transaction_date','posted_date','posting_date']));
  let desc = get(['description','memo','details','name','narrative','payee']) ?? '';
  let amountCents = 0;

  const hasAmount = headerMap.amount != null || headerMap.amount_cents != null;
  const debit = get(['debit','withdrawal','outflow']);
  const credit = get(['credit','deposit','inflow']);

  if (hasAmount) amountCents = toCents(get(['amount','amount_cents']));
  else if (debit != null || credit != null) amountCents = toCents(credit) - toCents(debit);

  desc = String(desc || '').trim().slice(0, 512);

  return { postedDate: date, description: desc, amountCents };
}

function stableId({ userId, accountId, postedDate, amountCents, description }) {
  const h = crypto.createHash('sha1').update(
    [userId, accountId, postedDate, amountCents, description].join('\x1f')
  ).digest('hex');
  return `csv_${h.slice(0, 24)}`;
}


// ---------- main ----------
;(async function main() {
  console.log(`Importing ${file} for user ${userId} into account ${accountId}...`);
  const csv = fs.readFileSync(path.resolve(file), 'utf8');
  const rows = parseCSV(csv);
  if (rows.length < 2) { console.error('CSV has no data rows'); process.exit(1); }

  const header = rows[0].map(normalizeHeader);
  const headerMap = Object.fromEntries(header.map((h,i)=>[h,i]));
  const data = rows.slice(1).filter(r => r.some(c => String(c||'').trim().length));

  const importedTxs = [];
  const batchSize = 400;
  let batch = db.batch(), pending = 0, written = 0, skipped = 0;

  for (const row of data) {
    const t = hydrateRow(row, headerMap);
    if (!t.postedDate) { skipped++; continue; }
    if (t.amountCents === 0 && !String(t.description).trim()) { skipped++; continue; }

    const docId = stableId({ userId, accountId, ...t });
    const doc = {
      // Per new schema: amount, date, merchant, accountId, note, raw
      amount: t.amountCents,
      date: Timestamp.fromDate(new Date(t.postedDate)),
      merchant: t.description,
      accountId: accountId,
      note: 'Imported via generic CSV',
      raw: header.reduce((acc, h, i) => ({...acc, [h]: row[i]}), {}),
      // System fields
      userId: userId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };
    
    importedTxs.push({id: docId, ...doc});

    if (dryRun) continue;

    const ref = db.collection(`users/${userId}/transactions`).doc(docId);
    batch.set(ref, doc, { merge: true });
    pending++;
    if (pending >= batchSize) {
      await batch.commit();
      console.log(`...committed ${pending} records`);
      batch = db.batch();
      written += pending;
      pending = 0;
    }
  }
  if (!dryRun && pending > 0) {
    await batch.commit();
    written += pending;
  }

  console.log(`Imported ${written} transaction(s). Skipped ${skipped}.`);

  if (bnplMode === 'auto' && !dryRun) {
    console.log('[BNPL] Reconstructing from recent transactions...');
    const { reconstructBnplContracts, persistBnplResults } = await import('../lib/bnpl/reconstruct.js');
    const res = await reconstructBnplContracts({ userId, accountId, horizonDays: 180 });
    if(res.contracts.length > 0) {
        await persistBnplResults(res);
    }
    console.log(`[BNPL] Upserted ${res.stats.contracts} contracts / ${res.stats.installments} installments.`);
  } else {
    console.log('BNPL detection skipped.');
  }

  if (dryRun) {
    console.log(`(DRY RUN) Would write ${importedTxs.length} tx. No Firestore changes made.`);
    if (importedTxs.length > 0) {
        console.log('Sample hydrated transaction:');
        console.log(importedTxs[0]);
    }
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
