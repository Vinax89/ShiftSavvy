'use client'
export default function GlobalError({
  error, reset
}: { error: Error & { digest?: string }, reset: () => void }) {
  return (
    <html><body className="p-6">
      <h2 className="text-lg font-semibold">Something went sideways</h2>
      <p className="opacity-75 text-sm mt-2">{error.message}</p>
      <button className="mt-3 underline" onClick={() => reset()}>Try again</button>
    </body></html>
  )
}
