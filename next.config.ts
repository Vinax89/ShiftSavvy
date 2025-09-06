
import type { NextConfig } from 'next'

const base: NextConfig = {
  turbopack: {}, // keep this so dev never warns
  allowedDevOrigins: ['localhost','127.0.0.1','0.0.0.0','*.cloudworkstations.dev'],
}

// Only wrap in production builds to avoid Webpack-in-dev warnings
const isProd = process.env.NODE_ENV === 'production'
let exported: NextConfig = base

if (isProd) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { withSentryConfig } = require('@sentry/nextjs')
  exported = withSentryConfig(
    base,
    // Sentry Webpack plugin options:
    { silent: true },
    // Sentry SDK options:
    { hideSourceMaps: true }
  )
}

export default exported
