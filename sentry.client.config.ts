// This file configures the Sentry browser-side SDK
import * as Sentry from '@sentry/nextjs';

if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    // Adjust this value in production, or use tracesSampler for finer control
    tracesSampleRate: 1.0,
    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,
    replaysOnErrorSampleRate: 1.0,
    // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysSessionSampleRate: 0.1,
    beforeSend(event) {
      // scrub PII-like data if any slipped in
      if (event.request) delete event.request.cookies;
      return event;
    },
  });
}
