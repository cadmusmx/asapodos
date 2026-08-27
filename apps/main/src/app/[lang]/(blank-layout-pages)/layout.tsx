// Type Imports
import type { ChildrenType } from '@core/types'
import type { Locale } from '@configs/i18n'

// Component Imports
import Providers from '@components/Providers'
import BlankLayout from '@layouts/BlankLayout'

// Config Imports
import { i18n } from '@configs/i18n'

// Util Imports
import { getSystemMode } from '@core/utils/serverHelpers'

// Lib Imports
import { getPublicBranding } from '@/lib/tenant-settings/public-branding'

type Props = ChildrenType & {
  params: Promise<{ lang: Locale }>
}

const Layout = async (props: Props) => {
  const params = await props.params
  const { children } = props

  // Vars
  const direction = i18n.langDirection[params.lang]
  const systemMode = await getSystemMode()
  const initialBranding = await getPublicBranding()

  return (
    <Providers direction={direction} initialBranding={initialBranding} dictionary={null}>
      <BlankLayout systemMode={systemMode}>{children}</BlankLayout>
    </Providers>
  )
}

export default Layout
