import type { NextConfig } from 'next'
import withBundleAnalyzer from '@next/bundle-analyzer'

// Canvas/Studio-friendly config:
//  - allowedDevOrigins accepts rotating Firebase Studio preview hosts via regex
//  - memory cache in dev avoids overlay-fs rename races on packfile renames
const nextConfig: NextConfig = {
  // distDir: 'build', // Reverted to default '.next'
  // @ts-expect-error Next types allow (string | RegExp)[]
  allowedDevOrigins: [/^https:\/\/\d{4}-firebase-studio-.*\.cloudworkstations\.dev$/],
  webpack: (config, { dev }) => {
    if (dev) {
      // @ts-ignore — webpack types not exposed by Next
      config.cache = { type: 'memory' }
    }
    config.ignoreWarnings ||= []
    config.ignoreWarnings.push(/Critical dependency: the request of a dependency is an expression/)
    return config
  }
}

const analyzer = withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })
export default analyzer(nextConfig)
