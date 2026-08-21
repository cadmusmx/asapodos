// Next Imports
import { Inter, Geist, Plus_Jakarta_Sans } from 'next/font/google'

// MUI Imports
import type { Theme } from '@mui/material/styles'

// Type Imports
import type { Settings } from '@core/contexts/settingsContext'
import type { Skin, SystemMode } from '@core/types'

// Theme Options Imports
import overrides from './overrides'
import colorSchemes from './colorSchemes'
import spacing from './spacing'
import shadows from './shadows'
import customShadows from './customShadows'
import typography from './typography'

const inter = Inter({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800', '900'] })
const geist = Geist({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800', '900'] })
const plusJakartaSans = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['300', '400', '500', '600', '700', '800'] })

export const FONT_OPTIONS = [
  { value: 'Inter', label: 'Inter', fontFamily: 'Inter, sans-serif', instance: inter },
  { value: 'Geist', label: 'Geist', fontFamily: 'Geist, sans-serif', instance: geist },
  { value: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', fontFamily: '"Plus Jakarta Sans", sans-serif', instance: plusJakartaSans }
] as const

export type FontOption = typeof FONT_OPTIONS[number]

const fontFamilyMap: Record<string, string> = {
  Inter: inter.style.fontFamily,
  Geist: geist.style.fontFamily,
  'Plus Jakarta Sans': plusJakartaSans.style.fontFamily
}

const theme = (
  settings: Settings,
  mode: SystemMode,
  direction: Theme['direction'],
  fontFamily?: string | null
): Theme => {
  const resolvedFontFamily = fontFamily && fontFamilyMap[fontFamily] ? fontFamilyMap[fontFamily] : inter.style.fontFamily

  return {
    direction,
    components: overrides(settings.skin as Skin),
    colorSchemes: colorSchemes(settings.skin as Skin),
    ...spacing,
    shape: {
      borderRadius: 6,
      customBorderRadius: {
        xs: 2,
        sm: 4,
        md: 6,
        lg: 8,
        xl: 10
      }
    },
    shadows: shadows(mode),
    typography: typography(resolvedFontFamily),
    customShadows: customShadows(mode),
    mainColorChannels: {
      light: '46 38 61',
      dark: '231 227 252',
      lightShadow: '46 38 61',
      darkShadow: '19 17 32'
    }
  } as Theme
}

export default theme
