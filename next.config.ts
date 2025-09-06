
import type {NextConfig} from 'next';

const config: NextConfig = {
  // Helps Next treat Turbopack as the bundler you intend to use (and lets you tweak it later)
  turbopack: {},

  // keep this TOP-LEVEL (not under experimental)
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '*.cluster-2xfkbshw5rfguuk5qupw267afs.cloudworkstations.dev',
    '9000-firebase-studio-1757029696220.cluster-2xfkbshw5rfguuk5qupw267afs.cloudworkstations.dev',
  ],

  // If you have a custom webpack() override, disable it during dev.
  webpack(config, {dev}) {
    if (dev) return config; // ← prevents Webpack-only tweaks from forcing a fallback
    // production-only tweaks can go here…
    return config;
  },
};

export default config;
