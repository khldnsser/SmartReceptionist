const allowedOrigins = (process.env.SERVER_ACTION_ALLOWED_ORIGINS ?? 'localhost:3001')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: { allowedOrigins },
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
};

export default nextConfig;
