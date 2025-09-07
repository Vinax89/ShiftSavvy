'use client';
import { getAuth } from 'firebase/auth';
import { resultCache, inflight } from './cache';

function stableKey(parts: any[]): string {
  return parts
    .map((p) =>
      typeof p === 'string' ? p : JSON.stringify(p, Object.keys(p || {}).sort())
    )
    .join('|');
}

type FetchJSONOpts = RequestInit & {
  ttl?: number;
  varyHeaders?: string[];
  cacheKey?: string;
  requireAuth?: boolean;
};

export async function apiFetch<T = any>(
  url: string,
  opts: FetchJSONOpts = {}
): Promise<T> {
  const {
    ttl = 5 * 60_000,
    varyHeaders = ['authorization', 'accept-language'],
    cacheKey,
    requireAuth,
    ...init
  } = opts;

  const headersObj: Record<string, string | null> = {};
  const hdrs = new Headers(init.headers || {});

  if (requireAuth) {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Authentication is required for this request.');
    }
    const token = await user.getIdToken().catch(() => null);
    if (token) {
      hdrs.set('Authorization', `Bearer ${token}`);
    } else {
      throw new Error('Could not retrieve authentication token.');
    }
  }

  varyHeaders.forEach((h) => {
    headersObj[h.toLowerCase()] = hdrs.get(h) as any;
  });

  const method = (init.method || 'GET').toUpperCase();
  const bodyKey =
    method === 'GET' || !init.body
      ? null
      : typeof init.body === 'string'
      ? init.body
      : '[binary]';

  const key =
    cacheKey ??
    stableKey(['v1', url, method, bodyKey, headersObj]);

  const hit = resultCache.get(key);
  if (hit !== undefined) return hit as T;

  const existing = inflight.get(key);
  if (existing) return (await existing) as T;

  const p = (async () => {
    const res = await fetch(url, { ...init, headers: hdrs });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const errorMsg = `HTTP ${res.status} ${res.statusText} for ${url}\n${text.slice(0, 500)}`;
      
      const jsonError = await res.json().catch(() => null);
      if (jsonError && jsonError.error) {
          throw new Error(jsonError.error);
      }
      
      throw new Error(errorMsg);
    }

    const contentType = res.headers.get('content-type') || '';
    const data =
      contentType.includes('application/json')
        ? await res.json()
        : await res.text();

    resultCache.set(key, data, { ttl });
    return data as T;
  })()
    .finally(() => inflight.delete(key));

  inflight.set(key, p);
  return (await p) as T;
}
