'use client'

// React Imports
import { useMemo } from 'react'

// MUI Imports
import { deepmerge } from '@mui/utils'
import { ThemeProvider, lighten, darken, createTheme } from '@mui/material/styles'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v14-appRouter'
import CssBaseline from '@mui/material/CssBaseline'
import type {} from '@mui/material/themeCssVarsAugmentation' //! Do not remove this import otherwise you will get type errors while making a production build
import type {} from '@mui/lab/themeAugmentation' //! Do not remove this import otherwise you will get type errors while making a production build

// Third-party Imports
import { useMedia } from 'react-use'
import stylisRTLPlugin from 'stylis-plugin-rtl'

// Type Imports
import type { ChildrenType, Direction, SystemMode } from '@core/types'

// Component Imports
import ModeChanger from './ModeChanger'

// Config Imports
import themeConfig from '@configs/themeConfig'
import primaryColorConfig from '@configs/primaryColorConfig'

// Hook Imports
import { useSettings } from '@core/hooks/useSettings'
import { useMe } from '@/hooks/useMe'
import { useInitialBranding } from '@/contexts/brandingContext'

// Core Theme Imports
import defaultCoreTheme from '@core/theme'

type Props = ChildrenType & {
  direction: Direction
  systemMode: SystemMode
}

const CustomThemeProvider = (props: Props) => {
  // Props
  const { children, direction, systemMode } = props

  // Vars
  const isServer = typeof window === 'undefined'
  let currentMode: SystemMode

  // Hooks
  const { settings } = useSettings()
  const { data: meData } = useMe()
  const initialBranding = useInitialBranding()
  const isDark = useMedia('(prefers-color-scheme: dark)', systemMode === 'dark')

  if (isServer) {
    currentMode = systemMode
  } else {
    if (settings.mode === 'system') {
      currentMode = isDark ? 'dark' : 'light'
    } else {
      currentMode = settings.mode as SystemMode
    }
  }

  const tenantPrimaryColor =
    meData?.settings?.branding?.primaryColor ?? initialBranding?.primaryColor ?? primaryColorConfig[0].main

  const tenantFontFamily = meData?.settings?.branding?.fontFamily ?? initialBranding?.fontFamily ?? null

  // Merge the primary color scheme override with the core theme
  const theme = useMemo(() => {
    const newTheme = {
      colorSchemes: {
        light: {
          palette: {
            primary: {
              main: tenantPrimaryColor,
              light: lighten(tenantPrimaryColor, 0.2),
              dark: darken(tenantPrimaryColor, 0.1)
            }
          }
        },
        dark: {
          palette: {
            primary: {
              main: tenantPrimaryColor,
              light: lighten(tenantPrimaryColor, 0.2),
              dark: darken(tenantPrimaryColor, 0.1)
            }
          }
        }
      },
      cssVariables: {
        colorSchemeSelector: 'data'
      }
    }

    const coreTheme = deepmerge(defaultCoreTheme(settings, currentMode, direction, tenantFontFamily), newTheme)

    return createTheme(coreTheme)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantPrimaryColor, tenantFontFamily, settings.skin, currentMode])

  return (
    <AppRouterCacheProvider
      options={{
        prepend: true,
        ...(direction === 'rtl' && {
          key: 'rtl',
          stylisPlugins: [stylisRTLPlugin]
        })
      }}
    >
      <ThemeProvider
        theme={theme}
        defaultMode={systemMode}
        modeStorageKey={`${themeConfig.templateName.toLowerCase().split(' ').join('-')}-mui-template-mode`}
      >
        <>
          <ModeChanger systemMode={systemMode} />
          <CssBaseline />
          {children}
        </>
      </ThemeProvider>
    </AppRouterCacheProvider>
  )
}

export default CustomThemeProvider
