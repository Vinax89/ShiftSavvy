#!/usr/bin/env node
/* eslint-disable no-console */
import fs from 'node:fs';
import { parse } from 'csv-parse';
import 'dotenv/config';
import admin from 'firebase-admin';

const args = process.argv.slice(2);
const file = args[args.indexOf('--file') + 1];
const account = args[args.indexOf('--account') + 1];
const uid = args[args.indexOf('--user') + 1];
if (!file || !uid) {
  console.error('Usage: node scripts/import-generic-csv-stream.mjs --file ./export.csv --user <UID> [--account acct:...]');
  process.exit(1);
}

if (!admin.apps.length) {
  try { admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID }); } catch { admin.initializeApp(); }
}
const db = admin.firestore();
const toTs = (d) => admin.firestore.Timestamp.fromDate(new Date(d));

const parser = fs.createReadStream(file).pipe(parse({ columns: true, trim: true }));

let batch = db.batch();
let count = 0;
const BATCH_MAX = 450;

function flushBatch() {
  const b = batch;
  batch = db.batch();
  console.log(`Committing batch of ${b._ops.length}...`);
  return b.commit();
}

parser.on('data', (row) => {
  const id = row.id || `${row.date}-${row.amount}-${Math.random().toString(36).slice(2, 8)}`;
  const ref = db.doc(`users/${uid}/transactions/${id}`);
  batch.set(ref, {
    amount: Number(row.amount),
    date: toTs(row.date),
    merchant: row.merchant || row.description || '',
    accountId: account || row.accountId || 'acct:generic:checking',
    note: row.note || null,
    raw: row
  }, { merge: true });
  count++;
  if (count % BATCH_MAX === 0) {
    parser.pause();
    flushBatch().then(() => parser.resume());
  }
});

parser.on('end', async () => {
  if (batch._ops.length > 0) {
    await flushBatch();
  }
  console.log(`Imported ${count} rows into users/${uid}/transactions`);
  process.exit(0);
});

parser.on('error', (e) => {
  console.error(e);
  process.exit(1);
});
