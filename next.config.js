/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/', destination: '/melo', permanent: false },
      // Links antigos enviados aos clientes continuam funcionando
      { source: '/melo/cliente/:token', destination: '/cliente/:token', permanent: true },
    ];
  },
};

module.exports = nextConfig;
