import type { NextConfig } from 'next'

// Keep Turbopack clean in dev and silence "Webpack configured" warning
const base: NextConfig = {
  turbopack: {},
  allowedDevOrigins: ['localhost','127.0.0.1','0.0.0.0','*.cloudworkstations.dev'],
}

const isProd = process.env.NODE_ENV === 'production'
let exported: NextConfig = base

if (isProd) {
  // Wrap only in prod to avoid Webpack-in-dev behavior
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { withSentryConfig } = require('@sentry/nextjs')
  exported = withSentryConfig(
    base,
    { silent: true },             // Sentry Webpack plugin opts
    { hideSourceMaps: true }      // Sentry SDK opts
  )
}

export default exported