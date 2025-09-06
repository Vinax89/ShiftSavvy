'use client';
import { auth } from '@/lib/firebase.client';

type Opts = RequestInit & { requireAuth?: boolean };

export async function apiFetch<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(opts.headers as any) };
  
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken().catch(() => null);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else if (process.env.NODE_ENV !== 'production') {
      // Fallback for development environments (like Studio/emulators) where a token might not be available
      headers['X-UID'] = user.uid;
    }
  }

  const res = await fetch(path, { ...opts, headers });
  const jsonResponse = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    throw new Error(jsonResponse?.error || res.statusText || 'An unknown API error occurred');
  }
  
  return jsonResponse as T;
}
