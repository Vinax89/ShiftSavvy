'use client'

import { useEffect } from 'react'

/**
 * Runs once on the client. Extend to hydrate analytics, theme, etc.
 */
export default function ClientInit() {
  useEffect(() => {
    // e.g., init analytics, set CSS vars, warm caches, etc.
    // Service Worker only when explicitly enabled
    if (process.env.NEXT_PUBLIC_ENABLE_SW === '1' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {})
    }
  }, [])
  return null
}
