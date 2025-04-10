/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: {
    buildActivity: false
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://winvite-backend:8080/api/:path*',
      },
    ];
  },
};



module.exports = {
  nextConfig,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
}