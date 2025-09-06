/**
 * Next.js instrumentation file — runs in Node and Edge runtimes.
 * We init Sentry only in PRODUCTION to avoid OTel noise in dev.
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NODE_ENV !== 'production') return
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN && !process.env.SENTRY_DSN) return

  // Dynamic import keeps heavy deps out of dev and client bundles.
  const Sentry = await import('@sentry/nextjs')
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0.1),
    enableTracing: true,
    debug: false,
    integrations: (integrations) => integrations,
  })
}
