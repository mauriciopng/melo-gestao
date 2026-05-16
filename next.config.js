/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/', destination: '/melo', permanent: false },
    ];
  },
};

module.exports = nextConfig;
