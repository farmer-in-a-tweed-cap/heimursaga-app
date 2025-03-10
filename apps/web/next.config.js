const path = require('path');

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
    ],
  },
};
