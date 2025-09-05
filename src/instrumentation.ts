export async function register() {
  if (process.env.NODE_ENV !== 'production') return;
  try {
    const Sentry = await import('@sentry/nextjs');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
      replaysOnErrorSampleRate: 1.0,
      replaysSessionSampleRate: 0.0,
    });
  } catch (e) {
    // Sentry is not a dependency, so this will fail gracefully.
  }
}
