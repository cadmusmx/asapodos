// Component Imports
import ComingSoon from '@views/pages/misc/ComingSoon'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

// Lib Imports
import { withTenantTitle } from '@/lib/page-metadata'

export const generateMetadata = () => withTenantTitle('Coming Soon')

const ComingSoonPage = async () => {
  // Vars
  const mode = await getServerMode()

  return <ComingSoon mode={mode} />
}

export default ComingSoonPage
