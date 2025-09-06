import type { NextConfig } from 'next'

const STUDIO_ORIGIN = process.env.STUDIO_ORIGIN;

const nextConfig: NextConfig = {
  // Allow dev assets (/ _next/*) to be loaded by Firebase Studio’s preview origin
  allowedDevOrigins: STUDIO_ORIGIN ? [STUDIO_ORIGIN] : [
    'http://localhost:9000',
    'http://localhost:9002',
  ],

  // IMPORTANT: remove any custom `webpack()` config to avoid the Turbopack warning.
}

export default nextConfig
