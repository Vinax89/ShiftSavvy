'use client';
import AlertsClient from './AlertsClient'
import AppSidebar from '@/components/app-sidebar'
import { useUid } from '@/hooks/useUid'

export default function AlertsPage() {
  const uid = useUid();

  return (
    <>
      <AppSidebar />
      <main className="flex-1">
        <header className="h-12 flex items-center px-4 border-b mb-4">
          <h1 className="text-lg font-semibold">Alerts</h1>
        </header>
        <div className="p-4 space-y-6">
          {uid ? <AlertsClient uid={uid} /> : <p>Please sign in to see your alerts.</p>}
        </div>
      </main>
    </>
  );
}
