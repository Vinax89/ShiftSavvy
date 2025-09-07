import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // allow Firebase Studio (use the exact origin you see in logs)
  allowedDevOrigins: [
    'https://6000-firebase-studio-1757029696220.cluster-2xfkbshw5rfguuk5qupw267afs.cloudworkstations.dev',
    'https://9000-firebase-studio-1757029696220.cluster-2xfkbshw5rfguuk5qupw267afs.cloudworkstations.dev',
  ],
  webpack: (config: any) => {
    config.ignoreWarnings ??= []
    config.ignoreWarnings.push(
      /Critical dependency: the request of a dependency is an expression/
    )
    return config
  },
}

export default nextConfig
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
