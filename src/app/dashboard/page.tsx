'use client';

import dynamic from 'next/dynamic';

const DashboardClient = dynamic(() => import('../DashboardClient'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center p-4 text-sm text-muted-foreground animate-pulse">
      Loading dashboard…
    </div>
  ),
});

export default function Page() {
  return <DashboardClient />;
}
