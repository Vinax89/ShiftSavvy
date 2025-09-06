
// src/lib/auth.server.ts
import { auth as adminAuth } from 'firebase-admin';
import { headers } from 'next/headers';
import db from '@/lib/firebaseAdmin';

/**
 * getUid(): Extract UID from a verified Firebase ID token.
 * Dev fallback: X-UID header (Studio / local scripts).
 */
export async function getUid(): Promise<string> {
  const h = await headers();
  const devUid = h.get('x-uid') || h.get('X-UID');
  const authz = h.get('authorization') || h.get('Authorization');

  // Dev: allow X-UID header for local testing
  if (process.env.NODE_ENV !== 'production' && devUid) {
    // Optional: create user record on first use for local dev
    const userRef = db.collection('users').doc(devUid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      await userRef.set({ displayName: `Dev User (${devUid.slice(0,5)})`, createdAt: new Date() });
    }
    return devUid;
  }
  
  if (!authz?.startsWith('Bearer ')) {
    throw new Error('Missing Authorization: Bearer <idToken>');
  }
  const idToken = authz.slice('Bearer '.length).trim();
  const decoded = await adminAuth().verifyIdToken(idToken);
  if (!decoded?.uid) throw new Error('Invalid ID token');
  return decoded.uid;
}
