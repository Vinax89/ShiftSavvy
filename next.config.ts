import type { NextConfig } from 'next'

const ORIGIN = process.env.STUDIO_ORIGIN || ''

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Allow Firebase Studio’s reverse-proxy to fetch dev assets.
  allowedDevOrigins: [ORIGIN, 'http://localhost:9002', 'http://0.0.0.0:9002'].filter(Boolean),

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

export default nextConfig
