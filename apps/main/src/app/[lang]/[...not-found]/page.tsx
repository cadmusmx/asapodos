// Type Imports
import type { Locale } from '@configs/i18n'

// Component Imports
import Providers from '@components/Providers'
import BlankLayout from '@layouts/BlankLayout'
import NotFound from '@views/NotFound'

// Config Imports
import { i18n } from '@configs/i18n'

// Util Imports
import { getSystemMode, getServerMode } from '@core/utils/serverHelpers'

// Lib Imports
import { getPublicBranding } from '@/lib/tenant-settings/public-branding'
import { withTenantTitle } from '@/lib/page-metadata'

export const generateMetadata = () => withTenantTitle('Not Found')

const NotFoundPage = async (props: { params: Promise<{ lang: Locale }> }) => {
  const params = await props.params

  // Vars
  const direction = i18n.langDirection[params.lang]
  const systemMode = await getSystemMode()
  const mode = await getServerMode()
  const initialBranding = await getPublicBranding()

  return (
    <Providers direction={direction} initialBranding={initialBranding}>
      <BlankLayout systemMode={systemMode}>
        <NotFound mode={mode} />
      </BlankLayout>
    </Providers>
  )
}

export default NotFoundPage
