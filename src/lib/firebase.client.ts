
'use client'

import { getApps, getApp, initializeApp, type FirebaseApp } from 'firebase/app'
import {
  initializeFirestore,
  connectFirestoreEmulator,
  type Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from 'firebase/firestore'
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

export const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)

export const auth: Auth = getAuth(app)

export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      // v10: configure cache here (replaces enableIndexedDbPersistence)
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  } catch {
    // IndexedDB not available (e.g., Safari Private); degrade gracefully.
    return initializeFirestore(app, { localCache: memoryLocalCache() })
  }
})()

// Emulators (dev/CI)
if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
  const [fh, fp] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':')
  connectFirestoreEmulator(db, fh, Number(fp))
  const [ah, ap] = (process.env.FIREBASE_AUTH_EMULATOR_HOST || '127.0.0.1:9099').split(':')
  connectAuthEmulator(auth, `http://${ah}:${ap}`, { disableWarnings: true })
}
