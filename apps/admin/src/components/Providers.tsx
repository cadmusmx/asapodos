'use client'

import { SessionProvider } from 'next-auth/react'

import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'
import { SettingsProvider } from '@core/contexts/settingsContext'
import ThemeProvider from '@components/theme'
import { DictionaryProvider } from '@/contexts/dictionaryContext'

import AppReactToastify from '@/libs/styles/AppReactToastify'

type Props = {
  children: React.ReactNode
  dictionary?: any
}

const Providers = ({ children, dictionary }: Props) => {
  return (
    <SessionProvider basePath={process.env.NEXTAUTH_BASEPATH}>
      <DictionaryProvider dictionary={dictionary}>
        <VerticalNavProvider>
          <SettingsProvider>
            <ThemeProvider>
              {children}
              <AppReactToastify hideProgressBar />
            </ThemeProvider>
          </SettingsProvider>
        </VerticalNavProvider>
      </DictionaryProvider>
    </SessionProvider>
  )
}

export default Providers
