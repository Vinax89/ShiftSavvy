// This file is for server-side instrumentation only
export async function register() {
  if (process.env.NODE_ENV === 'production') {
    // conditionally import otel for production builds
    await import('@sentry/nextjs/otel')
  }
}
