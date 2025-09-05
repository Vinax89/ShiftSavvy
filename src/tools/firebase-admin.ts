import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const app = getApps().length
  ? getApps()[0]
  : initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID }, applicationDefault())

// Either omit the second arg (default DB) or pass { databaseId: '(default)' }
export const adminDb = getFirestore(app)
