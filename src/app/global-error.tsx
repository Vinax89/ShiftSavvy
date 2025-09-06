'use client'
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html><body className="p-6">
      <h2 className="text-lg font-semibold">Something went sideways</h2>
      <p className="opacity-75 text-sm mt-2">{error.message}</p>
    </body></html>
  )
}
