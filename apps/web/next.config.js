const path = require('path');

const { NEXT_PUBLIC_API_BASE_URL } = process.env;

module.exports = {
  reactStrictMode: true,
  transpilePackages: ['@repo/ui'],
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
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
    ];
  },
};
