import type { NextConfig } from 'next'

/**
 * Next.js 15 config tuned for Firebase Studio + Turbopack.
 * - allowedDevOrigins stops _next/* CORS blocks from Cloud Workstations
 * - turbopack:{} enables TP config (and ensures no legacy webpack setup fights it)
 * - DO NOT add a "webpack(config){...}" hook; Turbopack ignores it & Next warns.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,

  // ✅ Allow dev assets to be loaded by Firebase Studio Workstations origin.
  allowedDevOrigins: [
    process.env.STUDIO_ORIGIN || '',
    'http://localhost:9002',
    'http://0.0.0.0:9002',
  ].filter(Boolean),

  // ✅ Turbopack configuration bucket (even if empty) — keeps TP happy.
  turbopack: {},

  experimental: {
    typedRoutes: true,
  },
}
export default nextConfig
