import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/types'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'api.mapbox.com',
      },
      {
        protocol: 'https',
        hostname: 'heimursaga.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/user/:username', destination: '/journal/:username', permanent: true },
      { source: '/entries/:id', destination: '/entry/:id', permanent: true },
      { source: '/journeys/:id', destination: '/expedition/:id', permanent: true },
      { source: '/explore', destination: '/', permanent: true },
      { source: '/login', destination: '/auth', permanent: true },
      { source: '/signup', destination: '/auth', permanent: true },
      { source: '/user-guide', destination: '/documentation', permanent: true },
    ];
  },
};

export default nextConfig;
