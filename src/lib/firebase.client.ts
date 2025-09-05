'use client'
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, onAuthStateChanged } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  connectFirestoreEmulator,
  enableIndexedDbPersistence,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)

// Firestore + offline cache
let db = getFirestore(app)
try {
  // Use new-style initializer to opt-in to durable local cache
  db = initializeFirestore(app, { localCache: persistentLocalCache() })
  enableIndexedDbPersistence(db).catch(() => {/* already enabled or not supported */})
} catch {/* older SDKs fallback to getFirestore */}

// Auth (optionally emulator)
const auth = getAuth(app)
if (process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === '1') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

export { app, auth, db, onAuthStateChanged }
