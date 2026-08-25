import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@gaso/shared'],
  trailingSlash: false,
  eslint: {
    ignoreDuringBuilds: true,
  }
}

export default nextConfig
