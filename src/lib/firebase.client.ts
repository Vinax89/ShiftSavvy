'use client'
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, onAuthStateChanged } from 'firebase/auth'
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  connectFirestoreEmulator,
  Firestore,
  persistentMultipleTabManager,
  memoryLocalCache
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

// --- IMPORTANT: configure cache at init-time (replaces enableIndexedDbPersistence) ---
// Multi-tab persistent cache by default; fall back to memory-only in environments
// that block IndexedDB (e.g. Safari Private Browsing).
function createFirestore(): Firestore {
  try {
    // v10 API uses "localCache".
    return initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      // Patched to use long-polling for Cloud Workstations compatibility.
      experimentalAutoDetectLongPolling: true,
      useFetchStreams: false,
    })
  } catch (_e) {
    // Fallback for IndexedDB not available: memory-only (no offline persistence)
    return initializeFirestore(app, { 
        localCache: memoryLocalCache(),
        experimentalAutoDetectLongPolling: true,
        useFetchStreams: false,
     })
  }
}

const db = createFirestore();

// Auth (optionally emulator)
const auth = getAuth(app)
if (process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === '1') {
  // Check if running in a browser environment
  if (typeof window !== 'undefined') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    const host = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':')
    connectFirestoreEmulator(db, host[0], Number(host[1]))
  }
}

export { app, auth, db, onAuthStateChanged }
