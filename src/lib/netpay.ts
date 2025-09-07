
'use client'
import { collection, getDocs, orderBy, query, where, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase.client'
import { evaluatePaycheck } from '@/domain/paycheck'
import { periodBounds } from '@/domain/pay-periods'
import { type Policy, type TaxProfile } from '@/domain/paycheck.schema'
import { resultCache, inflight } from './cache'

// Cache for in-flight promises to prevent thundering herd
async function once<T>(key: string, fn: () => Promise<T>): Promise<T> {
  let p = inflight.get(key) as Promise<T> | undefined;
  if (p) return p;

  const next = fn().finally(() => {
    // Important: remove the promise from the inflight cache once it's settled
    // to allow for future calls to execute the function again.
    inflight.delete(key);
  });

  inflight.set(key, next);
  return next;
}

async function _getNetForPayday(opts: { userId: string, paydayYMD: string, schedule: any }) {
import { LRUCache } from 'lru-cache'

const cache = new LRUCache<string, number>({
  max: 100, // max 100 users' paydays
  ttl: 1000 * 60 * 5, // 5 minutes
})

export async function getNetForPayday(opts: { userId: string, paydayYMD: string, schedule: any }) {
  const { userId, paydayYMD, schedule } = opts
  const cacheKey = `netpay:${userId}:${paydayYMD}`
  const cached = cache.get(cacheKey)
  if (cached) return cached as number
  
  // 1) Try a saved estimate whose periodStart <= payday <= periodEnd (order by periodStart desc; filter client-side)
  const snap = await getDocs(query(
    collection(db, 'paycheck_estimates'),
    where('userId','==', userId),
    orderBy('periodStart','desc'),
    limit(50) // reasonable limit
  ))

  const saved = snap.docs.find(d => {
    const x = d.data() as any
    return x.periodStart <= paydayYMD && paydayYMD <= x.periodEnd
  })?.data()
  
  if (saved?.result?.netCents != null) {
    cache.set(cacheKey, saved.result.netCents)
    return saved.result.netCents
  }

  // 2) Fallback: recompute from shifts in the pay period
  const { start, end } = periodBounds(schedule, paydayYMD)
  const shiftsSnap = await getDocs(query(collection(db,'shifts'), where('userId','==', userId), where('date','>=', start), where('date','<=', end)))
  const shifts = shiftsSnap.docs.map(d=>d.data())

  if (shifts.length === 0) return 0;

  const taxSnap = await getDocs(query(collection(db,'tax_profiles'), where('userId','==', userId)));
  if (taxSnap.empty) {
      console.warn("No tax profile found for user. Cannot calculate net pay.");
      return 0; // or a sensible default/error
  }
  const tax = taxSnap.docs[0].data() as TaxProfile;

  // TODO: policy lookup; use a reasonable default if none
  const policy: Policy = { baseRateCents: 4500, diffs: { nightBps: 2000, weekendBps: 1500, holidayBps: 10000, chargeAddlPerHourCents: 200, bonusPerShiftCents: 0 }, ot: { weeklyHours: 40, otMultiplierBps: 15000 } }
  const ytd = { grossCents: 0 } // TODO: proper YTD calculation
  const r = evaluatePaycheck({ shifts, policy, tax, ytd })
  
  cache.set(cacheKey, r.netCents)
  return r.netCents
}

export async function getNetForPayday(opts: { userId: string, paydayYMD: string, schedule: any }): Promise<number> {
    const key = `netpay-once:${opts.userId}:${opts.paydayYMD}`;
    return once(key, () => _getNetForPayday(opts));
}
