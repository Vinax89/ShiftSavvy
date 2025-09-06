// This file configures the Sentry server-side SDK
import * as Sentry from '@sentry/nextjs';

if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // Adjust this value in production, or use tracesSampler for finer control
    tracesSampleRate: 1.0,
    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
    beforeSend(event) {
      // scrub PII-like data if any slipped in
      if (event.request) delete event.request.cookies;
      return event;
    },
  });
}
