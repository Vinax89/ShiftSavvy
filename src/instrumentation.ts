
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NODE_ENV !== 'production') return
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: process.env.NODE_ENV === 'production',
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.0,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE
      ?? process.env.VERCEL_GIT_COMMIT_SHA
      ?? process.env.GITHUB_SHA,
    beforeSend(event, hint) {
      const msg = (hint?.originalException as any)?.message ?? ''
      // Reduce noise from PWA/offline & hot updates
      if (typeof msg === 'string' && (msg.includes('ChunkLoadError') || msg.includes('NetworkError'))) {
        return null
      }
      return event
    },
  })
}
