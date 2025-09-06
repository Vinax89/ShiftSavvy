'use client'
import { useEffect } from 'react'

export default function ClientInit() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_SW === '1' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
    }
  }, [])
  return null
}
