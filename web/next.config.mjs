/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: { allowedOrigins: ['localhost:3001'] },
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
};

export default nextConfig;
