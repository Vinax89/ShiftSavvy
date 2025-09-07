/** Minimal Turbopack config — no webpack() override */
const config = {
  // Explicit Turbopack so Next doesn’t assume Webpack config is intended
  turbopack: {},

  // Dev host allowance for Firebase Studio / Workstations
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '*.cloudworkstations.dev',
  ],
};
export default config;
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
