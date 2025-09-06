'use client'

import { useEffect, useState, startTransition } from 'react'
import Link from 'next/link'
// import other client UI (tabs, sidebar, toasts, recharts, etc.)

export default function DashboardClient() {
  // client logic only
  return (
    <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* your interactive dashboard UI */}
      <Link href="/paycheck" className="inline-flex items-center gap-2 text-sm">Paycheck</Link>
    </main>
  )
}
