
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
    {
      // For all available options, see:
      // https://github.com/getsentry/sentry-webpack-plugin#options

      // Suppresses source map uploading logs during build
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    },
    {
      // For all available options, see:
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

      // Upload a larger set of source maps for prettier stack traces (increases build time)
      widenClientFileUpload: true,

      // Hides source maps from generated client bundles
      hideSourceMaps: true,

      // Automatically instrument Vercel Cron Monitors
      automaticVercelMonitors: true,

      // Disable tree-shaking to ensure all Sentry tree-shaking is performed by Next.js
      disableTreeShaking: true,
    }
  )
}

export default exported
