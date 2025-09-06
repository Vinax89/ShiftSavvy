import AlertsClient from './AlertsClient'
import AppSidebar from '@/components/app-sidebar'

export default async function AlertsPage() {
  // In a real app, you would get the user ID from a server-side session.
  // For this demo, we'll pass a static ID.
  const uid = 'demo-uid';

  return (
    <>
      <AppSidebar />
      <main className="flex-1">
        <header className="h-12 flex items-center px-4 border-b mb-4">
          <h1 className="text-lg font-semibold">Alerts</h1>
        </header>
        <div className="p-4 space-y-6">
          <AlertsClient uid={uid} />
        </div>
      </main>
    </>
  );
}
