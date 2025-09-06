// src/app/dashboard/page.tsx  (SERVER COMPONENT)
import 'server-only'
import { Suspense } from 'react'
import DashboardClient from '../DashboardClient'

export default function Page() {
  // Suspense fallback is optional; client components render on the client anyway
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading dashboard…</div>}>
      <DashboardClient />
    </Suspense>
  )
}
