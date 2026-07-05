import type { Metadata } from 'next'

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

import Providers from '@/components/Providers'

import '@/app/globals.css'

export const metadata: Metadata = {
  title: 'Gaso Platform Admin',
  description: 'Super Admin Panel for Gaso-SaaS'
}

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html id='__next' lang='en' suppressHydrationWarning>
      <head>
        <link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.min.css' />
        <InitColorSchemeScript attribute='data' defaultMode='light' />
      </head>
      <body className='flex is-full min-bs-full flex-auto flex-col'>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
