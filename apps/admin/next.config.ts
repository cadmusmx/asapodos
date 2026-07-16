import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@gaso/shared'],
  trailingSlash: false,
}

export default nextConfig
