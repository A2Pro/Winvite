/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    buildActivity: false
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://10.244.30.95:8080/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;