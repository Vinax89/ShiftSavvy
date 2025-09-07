
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Allow Firebase Studio preview to fetch /_next/* during dev
  // @ts-expect-error: older Next types may not include this yet
  allowedDevOrigins: [
    "https://6000-firebase-studio-1757029696220.cluster-2xfkbshw5rfguuk5qupw267afs.cloudworkstations.dev",
    "https://9000-firebase-studio-1757029696220.cluster-2xfkbshw5rfguuk5qupw267afs.cloudworkstations.dev",
  ],

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
