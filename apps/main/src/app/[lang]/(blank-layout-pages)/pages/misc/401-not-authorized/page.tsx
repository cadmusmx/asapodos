import NotAuthorized from '@views/NotAuthorized'
import { getServerMode } from '@core/utils/serverHelpers'

// Lib Imports
import { withTenantTitle } from '@/lib/page-metadata'

export const generateMetadata = () => withTenantTitle('No Autorizado')

const Error401 = async (props: { searchParams: Promise<{ reason?: string }> }) => {
  const mode = await getServerMode()
  const { reason } = await props.searchParams

  return <NotAuthorized mode={mode} reason={reason} />
}

export default Error401
