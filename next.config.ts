
import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  // Allow Studio’s preview host to fetch /_next/* during dev
  allowedDevOrigins: [
    // update if Studio shows a different hostname
    "https://6000-firebase-studio-1757029696220.cluster-2xfkbshw5rfguuk5qupw267afs.cloudworkstations.dev",
    "https://9000-firebase-studio-1757029696220.cluster-2xfkbshw5rfguuk5qupw267afs.cloudworkstations.dev",
  ],

  // Optional: quiet the OpenTelemetry “Critical dependency” warnings in dev
  webpack: (config) => {
    config.ignoreWarnings ||= [];
    config.ignoreWarnings.push(
      /Critical dependency: the request of a dependency is an expression/
    );
    return config;
  },
};

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default analyzer(nextConfig)
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
