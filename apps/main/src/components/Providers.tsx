// Type Imports
import type { ChildrenType, Direction } from '@core/types'

import { VerticalNavProvider } from '@menu/contexts/verticalNavContext'

import { SettingsProvider } from '@core/contexts/settingsContext'

import ThemeProvider from '@components/theme'

import { getMode, getSettingsFromCookie, getSystemMode } from '@core/utils/serverHelpers'

import type { TenantBrandingSettings } from '@/types/tenant-settings'

// Context Imports
import { NextAuthProvider } from '@/contexts/nextAuthProvider'

import ReduxProvider from '@/redux-store/ReduxProvider'
import BrandingEffects from '@/components/branding/BrandingEffects'
import { DictionaryProvider } from '@/contexts/dictionaryContext'
import { BrandingProvider } from '@/contexts/brandingContext'

// Styled Component Imports
import AppReactToastify from '@/libs/styles/AppReactToastify'

// Util Imports

type Props = ChildrenType & {
  direction: Direction
  dictionary?: any
  initialBranding?: TenantBrandingSettings | null
}

const Providers = async (props: Props) => {
  // Props
  const { children, direction, dictionary = null, initialBranding } = props

  // Vars
  const mode = await getMode()
  const settingsCookie = await getSettingsFromCookie()
  const systemMode = await getSystemMode()

  return (
    <NextAuthProvider basePath={process.env.NEXTAUTH_BASEPATH}>
      <DictionaryProvider dictionary={dictionary}>
        <BrandingProvider initialBranding={initialBranding ?? null}>
          <VerticalNavProvider>
            <SettingsProvider settingsCookie={settingsCookie} mode={mode}>
              <ThemeProvider direction={direction} systemMode={systemMode}>
                <BrandingEffects dictionary={dictionary} />
                <ReduxProvider>{children}</ReduxProvider>
                <AppReactToastify direction={direction} hideProgressBar />
              </ThemeProvider>
            </SettingsProvider>
          </VerticalNavProvider>
        </BrandingProvider>
      </DictionaryProvider>
    </NextAuthProvider>
  )
}

export default Providers
