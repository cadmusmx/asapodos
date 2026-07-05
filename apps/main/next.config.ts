import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH,
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/es/start',
        permanent: true,
        locale: false
      },
      {
        source: '/:lang(es|en)',
        destination: '/:lang/start',
        permanent: true,
        locale: false
      },
      {
        source: '/((?!(?:es|en|front-pages|favicon.ico)\\b)):path',
        destination: '/en/:path',
        permanent: true,
        locale: false
      }
    ]
  }
}

export default nextConfig
