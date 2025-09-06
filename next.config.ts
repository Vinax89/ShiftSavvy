import type { NextConfig } from 'next'

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const ORIGIN = process.env.STUDIO_ORIGIN || ''

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Allow Firebase Studio’s reverse-proxy to fetch dev assets.
  allowedDevOrigins: [ORIGIN, 'http://localhost:9002', 'http://0.0.0.0:9002', 'https://9000-firebase-studio-1757029696220.cluster-2xfkbshw5rfguuk5qupw267afs.cloudworkstations.dev'].filter(Boolean),

  // Extra CORS for dev assets when proxied through Studio.
  async headers() {
    if (process.env.NODE_ENV !== 'development') return []
    return [
      {
        source: '/_next/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: ORIGIN || '*' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
        ],
      },
    ]
  },

  // Keep Turbopack happy: do not set unsupported experimental flags or a custom webpack() hook.
  turbopack: {},
  experimental: {},
}

export default withBundleAnalyzer(nextConfig)
