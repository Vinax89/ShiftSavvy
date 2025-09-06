import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NODE_ENV !== 'production') return
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NEXT_PUBLIC_ENV ?? 'production',
  })
}