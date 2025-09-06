
'use client';
import { getAuth } from 'firebase/auth'

type Opts = RequestInit & { requireAuth?: boolean };

export async function apiFetch<T = any>(path: string, opts: Opts = {}): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json', ...(opts.headers as any) };
  
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (opts.requireAuth) {
    if (!user) {
      throw new Error('Authentication is required for this request.');
    }
    const token = await user.getIdToken().catch(() => null);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('Could not retrieve authentication token.');
    }
  }

  const res = await fetch(path, { ...opts, headers });
  const jsonResponse = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    throw new Error(jsonResponse?.error || res.statusText || 'An unknown API error occurred');
  }
  
  return jsonResponse as T;
}
