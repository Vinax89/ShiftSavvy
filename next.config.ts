import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow dev assets (/ _next/*) to be loaded by Firebase Studio’s preview origin
  allowedDevOrigins: [
    'http://localhost:9000',
    'http://localhost:9002',
    process.env.FIREBASE_STUDIO_ORIGIN || ''
  ].filter(Boolean) as string[],

  // IMPORTANT: remove any custom `webpack()` config to avoid the Turbopack warning.
}

export default nextConfig
