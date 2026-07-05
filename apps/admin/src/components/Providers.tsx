'use client'

import { SessionProvider } from 'next-auth/react'

import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'
import { SettingsProvider } from '@core/contexts/settingsContext'
import ThemeProvider from '@components/theme'

import AppReactToastify from '@/libs/styles/AppReactToastify'

type Props = {
  children: React.ReactNode
}

const Providers = ({ children }: Props) => {
  return (
    <SessionProvider>
      <VerticalNavProvider>
        <SettingsProvider>
          <ThemeProvider>
            {children}
            <AppReactToastify hideProgressBar />
          </ThemeProvider>
        </SettingsProvider>
      </VerticalNavProvider>
    </SessionProvider>
  )
}

export default Providers
