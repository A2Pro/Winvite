/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    buildActivity: false
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://winvite-backend/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;