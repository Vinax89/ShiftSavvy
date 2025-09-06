
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
  allowedDevOrigins: ['localhost', '0.0.0.0', '*.cloudworkstations.dev'],
  experimental: {},
};

export default nextConfig;
