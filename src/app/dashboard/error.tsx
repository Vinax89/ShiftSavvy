'use client';

export default function DashboardError({ error }: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-destructive">Something went wrong on the Dashboard</h2>
      <pre className="mt-2 text-sm text-muted-foreground">{error.message}</pre>
      <button onClick={() => reset()} className="mt-4 rounded-md bg-primary px-4 py-2 text-primary-foreground">
        Try again
      </button>
    </div>
  );
}
