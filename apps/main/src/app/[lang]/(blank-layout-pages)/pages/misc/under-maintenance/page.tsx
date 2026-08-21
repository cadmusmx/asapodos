// Component Imports
import UnderMaintenance from '@views/pages/misc/UnderMaintenance'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

// Lib Imports
import { withTenantTitle } from '@/lib/page-metadata'

export const generateMetadata = () => withTenantTitle('Under Maintenance')

const UnderMaintenancePage = async () => {
  // Vars
  const mode = await getServerMode()

  return <UnderMaintenance mode={mode} />
}

export default UnderMaintenancePage
