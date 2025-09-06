import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Add the Firebase Studio origin printed in your logs
  // e.g. "https://9000-firebase-studio-1757029696220.cluster-2xfkbshw5rfguuk5qupw267afs.cloudworkstations.dev"
  allowedDevOrigins: [process.env.STUDIO_ORIGIN!].filter(Boolean) as string[],

  // If you previously customized webpack, guard it so Turbopack stays in charge
  // webpack: (config) => {
  //   if ((process as any).env.__TURBOPACK) return config; // no-op under Turbopack
  //   // ...any webpack-only tweaks for production builds
  //   return config;
  // },
}

export default nextConfig
