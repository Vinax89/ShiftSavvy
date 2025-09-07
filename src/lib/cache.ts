// src/lib/cache.ts
'use client';
import { LRUCache } from 'lru-cache';

type Value = unknown;

declare global {
  // keep across dev hot reloads
  // eslint-disable-next-line no-var
  var __DATA_CACHE__: LRUCache<string, Value> | undefined;
  // eslint-disable-next-line no-var
  var __INFLIGHT__: LRUCache<string, Promise<Value>> | undefined;
}

const resultCache =
  globalThis.__DATA_CACHE__ ??
  new LRUCache<string, Value>({
    // ~1000 entries with 5 min ttl; tweak as needed
    max: 1000,
    ttl: 1000 * 60 * 5,
  });

const inflight =
  globalThis.__INFLIGHT__ ??
  new LRUCache<string, Promise<Value>>({
    max: 2000,
    ttl: 1000 * 60, // we only want to coalesce for a short period
  });

if (process.env.NODE_ENV === 'development') {
    if (!globalThis.__DATA_CACHE__) globalThis.__DATA_CACHE__ = resultCache;
    if (!globalThis.__INFLIGHT__) globalThis.__INFLIGHT__ = inflight;
}


export { resultCache, inflight };
