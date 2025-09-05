import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
    return [
      {
        source: '/api/estimates/:path*',
        destination:
          'http://127.0.0.1:5001/shiftsavvy-2l0pa/us-central1/api_estimates_:path*',
      },
      {
        source: '/api/health',
        destination:
          'http://127.0.0.1:5001/shiftsavvy-2l0pa/us-central1/api_health',
      },
    ];
  },
  experimental: {
    // This is required to allow the Next.js dev server to accept requests from
    // the Firebase Studio UI.
    allowedDevOrigins: [
      'https://*.cloudworkstations.dev',
      'https://*.firebase.studio',
    ],
  },
};

export default nextConfig;
