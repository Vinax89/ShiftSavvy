import * as Sentry from '@sentry/nextjs'

if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request) delete (event.request as any).cookies
      return event
    },
  })
}