
#!/usr/bin/env node
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/alerts-backfill.mjs <UID>');
  process.exit(1);
}
if (!getApps().length) initializeApp();
const db = getFirestore();

await fetch(`https://us-central1-${process.env.GCLOUD_PROJECT}.cloudfunctions.net/alertsRunNow?uid=${encodeURIComponent(uid)}`)
  .then(r => r.text())
  .then(t => console.log(t))
  .catch(async () => {
    // In emulator or no public URL: call “inline”
    const { default: mod } = await import('../functions/lib/alerts.js');
    if (mod && mod.runForUser) await mod.runForUser(uid);
    console.log('Run locally (inline).');
  });
