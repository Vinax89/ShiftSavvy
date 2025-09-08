import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';
import path from 'path';

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

// Accept comma-separated hosts from env (strings only)
const allowedFromEnv = (process.env.NEXT_ALLOWED_DEV_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  ...(allowedFromEnv.length ? { allowedDevOrigins: allowedFromEnv } : {}),
  webpack: (config, { dev }) => {
    if (dev) {
      // Avoid overlay-fs cache rename flakiness in dev
      // @ts-ignore — webpack types not exposed by Next
      config.cache = { type: 'memory' };
    }
    // Ensure '@/…' always resolves to ./src
    config.resolve = config.resolve || {};
    config.resolve.alias = { ...(config.resolve.alias || {}), '@': path.resolve(__dirname, 'src') };

    config.ignoreWarnings ||= [];
    config.ignoreWarnings.push(/Critical dependency: the request of a dependency is an expression/);
    return config;
  },
};

export default withBundleAnalyzer(nextConfig);
