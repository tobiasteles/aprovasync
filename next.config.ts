import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['ws', 'bcryptjs'],
};

export default nextConfig;
