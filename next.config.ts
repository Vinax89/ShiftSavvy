
import type {NextConfig} from 'next';

const USE_EMULATOR = process.env.NEXT_USE_FUNCTIONS_EMULATOR === '1';
const PROJECT = process.env.FIREBASE_PROJECT_ID ?? 'shiftsavvy-2l0pa';
const REGION = process.env.FUNCTIONS_REGION ?? 'us-central1';
const FN_ORIGIN = process.env.FUNCTIONS_EMULATOR_ORIGIN ?? 'http://127.0.0.1:5001';
const dynamicOrigin = process.env.NEXT_DEV_ALLOWED_ORIGIN;

const nextConfig: NextConfig = {
  transpilePackages: ['@domain'],
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
    if (!USE_EMULATOR) return [];
    const functionsBase = `${FN_ORIGIN}/${PROJECT}/${REGION}`;
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
    // your Workstations cluster wildcard and/or exact host
    '*.cluster-2xfkbshw5rfguuk5qupw267afs.cloudworkstations.dev',
    ...(dynamicOrigin ? [dynamicOrigin] : []),
  ],
  experimental: {},
};

export default nextConfig;
