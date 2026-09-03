import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@gaso/shared'],
  trailingSlash: false,
  eslint: {
    ignoreDuringBuilds: false,
  }
}

export default nextConfig
