
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@domain'], // add any local workspace libs imported by web
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    const functionsBase = 'http://127.0.0.1:5001/shiftsavvy-2l0pa/us-central1';
    return [
      {
        source: '/api/estimates/:path*',
        destination: `${functionsBase}/api_estimates_:path*`,
      },
      {
        source: '/api/health',
        destination: `${functionsBase}/api_health`,
      },
      {
        source: '/api/transactions/export.csv',
        destination: `${functionsBase}/api_transactions_exportCsv`,
      },
    ];
  },
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    // match your cluster root (one wildcard level for the left-most part)
    '*.cluster-2xfkbshw5rfguuk5qupw267afs.cloudworkstations.dev',
    // optional: exact host shown in your log (paste your current one here)
    '9000-firebase-studio-1757029696220.cluster-2xfkbshw5rfguuk5qupw267afs.cloudworkstations.dev',
  ],
  experimental: {},
};

export default nextConfig;
