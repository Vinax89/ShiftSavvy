
import type { NextConfig } from 'next'

const config: NextConfig = {
  // Make Turbopack explicit and silence "Webpack is configured…" warnings
  turbopack: {},

  // Allow Studio-hosted dev origin to reach /_next/*
  // Add the exact Workstations host printed in your console if needed.
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '*.cloudworkstations.dev',
  ],

  // Keep this clean: NO webpack() override in dev (or at all for now).
  // If you need production-only webpack tweaks later, place them in a separate
  // 'next.config.webpack.js' and import conditionally for builds only.
}

export default config
