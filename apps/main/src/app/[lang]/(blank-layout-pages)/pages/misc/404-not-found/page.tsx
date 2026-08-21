// Component Imports
import NotFound from '@views/NotFound'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

// Lib Imports
import { withTenantTitle } from '@/lib/page-metadata'

export const generateMetadata = () => withTenantTitle('Not Found')

const Error = async () => {
  // Vars
  const mode = await getServerMode()

  return <NotFound mode={mode} />
}

export default Error
