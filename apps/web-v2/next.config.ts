import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: false },
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
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
  async headers() {
    return [
      {
        // Allow embedding for /embed/* routes
        source: '/embed/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(self)' },
          ...(isDev ? [] : [{
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://api.mapbox.com https://www.google.com https://www.gstatic.com https://us-assets.i.posthog.com https://static.cloudflareinsights.com https://connect.facebook.net",
              "style-src 'self' 'unsafe-inline' https://api.mapbox.com",
              "img-src 'self' data: blob: https://*.amazonaws.com https://api.mapbox.com https://heimursaga.com https://api.dicebear.com https://www.facebook.com",
              "font-src 'self'",
              "connect-src 'self' https://*.heimursaga.com https://api.stripe.com https://api.mapbox.com https://*.amazonaws.com https://events.mapbox.com https://us.i.posthog.com https://us-assets.i.posthog.com https://static.cloudflareinsights.com https://www.facebook.com",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://www.google.com https://www.youtube.com https://player.vimeo.com",
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
