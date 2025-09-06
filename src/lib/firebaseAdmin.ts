
// src/lib/firebaseAdmin.ts
import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST || !!process.env.FIREBASE_EMULATOR_HOST;
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

const app = getApps()[0]
  || initializeApp({
      credential: applicationDefault(),
      projectId,
    });

export const db = getFirestore(app);
// Nice-to-have defaults
// (ignoreUndefined avoids noisy field omits; timestampsInSnapshots is default in modern SDKs)
db.settings({ ignoreUndefinedProperties: true });

export default db;
