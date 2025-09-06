// src/app/dashboard/page.tsx  (SERVER)
import 'server-only'
import dynamic from 'next/dynamic'

const DashboardClient = dynamic(() => import('../DashboardClient'), {
  ssr: false,
  loading: () => (
    <div className="p-4 text-sm text-muted-foreground">Loading dashboard…</div>
  ),
})

export default function Page() {
  return <DashboardClient />
}
