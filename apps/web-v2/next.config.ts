import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/types'],
  images: {
    unoptimized: true,
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
          ...(isDev ? [] : [{
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://api.mapbox.com",
              "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
              "img-src 'self' data: blob: https://*.amazonaws.com https://api.mapbox.com https://heimursaga.com",
              "font-src 'self'",
              "connect-src 'self' https://*.heimursaga.com https://api.stripe.com https://api.mapbox.com https://*.amazonaws.com https://events.mapbox.com",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              "worker-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          }]),
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
