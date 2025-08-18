const { NEXT_PUBLIC_API_BASE_URL } = process.env;
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/ui'],
  experimental: {
    instrumentationHook: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.alltrails.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.mapbox.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.mapbox.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'heimursaga-photos.s3.us-east-2.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
  // proxy requests to backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${NEXT_PUBLIC_API_BASE_URL}/:path*`,
      },
      {
        source: '/user/settings',
        destination: `/user/settings/profile`,
      },
      {
        source: '/sponsorship',
        destination: `/sponsorship/tiers`,
      },
      {
        source: '/payouts',
        destination: `/payouts/withdraw`,
      },
      {
        source: '/insights',
        destination: `/insights/posts`,
      },
      {
        source: '/dashboard',
        destination: `/dashboard/posts`,
      },
    ];
  },
};

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: {
    enabled: true,
  },
  hideSourceMaps: true,
  disableLogger: true,
});
