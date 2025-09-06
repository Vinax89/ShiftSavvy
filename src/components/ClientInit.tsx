'use client'

import { useEffect } from 'react'

export default function ClientInit() {
  useEffect(() => {
    // Service Worker only when explicitly enabled
    if (process.env.NEXT_PUBLIC_ENABLE_SW === '1' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {})
    }
    // Any other one-time client bootstraps can live here.
  }, [])

  return null
}
