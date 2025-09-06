import type { NextConfig } from 'next'

// Set this in .env.local, no trailing slash.
// STUDIO_ORIGIN=https://9000-firebase-studio-xxxxxxxxxxxxxxxx.cluster-xxxxxxxxxxxxxxxx.dev
const studioOrigin = process.env.STUDIO_ORIGIN?.trim();

const nextConfig: NextConfig = {
  /**
   * Allow Firebase Studio (running on a different origin) to fetch /_next/* in dev.
   * This fixes: "Blocked cross-origin request ... configure allowedDevOrigins".
   */
  allowedDevOrigins: studioOrigin ? [studioOrigin] : [],

  /**
   * If you ever add a webpack() customizer, guard it so Turbopack owns dev:
   */
  // webpack: (config) => {
  //   if ((process as any).env.__TURBOPACK) return config; // no-op in dev
  //   // ...prod-only webpack tweaks (if any)
  //   return config;
  // },
}

export default nextConfig;
