import type { Metadata } from 'next'

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript'

import Providers from '@/components/Providers'

import { getDictionary } from '@/utils/getDictionary'
import type { Locale } from '@/utils/getDictionary'

import '@/app/globals.css'

const ADMIN_DEFAULT_LOCALE: Locale = 'es'

export const metadata: Metadata = {
  title: 'Gaso Platform Admin',
  description: 'Super Admin Panel for Gaso-SaaS'
}

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const dictionary = await getDictionary(ADMIN_DEFAULT_LOCALE)

  return (
    <html id='__next' lang={ADMIN_DEFAULT_LOCALE} suppressHydrationWarning>
      <head>
        <link rel='stylesheet' href='https://cdn.jsdelivr.net/npm/remixicon@4.6.0/fonts/remixicon.min.css' />
        <InitColorSchemeScript attribute='data' defaultMode='light' />
      </head>
      <body className='flex is-full min-bs-full flex-auto flex-col'>
        <Providers dictionary={dictionary}>{children}</Providers>
      </body>
    </html>
  )
}
