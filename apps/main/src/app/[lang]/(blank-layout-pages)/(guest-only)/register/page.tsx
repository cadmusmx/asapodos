// Next Imports
// Component Imports
import Register from '@views/Register'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

// Lib Imports
import { withTenantTitle } from '@/lib/page-metadata'

export const generateMetadata = () => withTenantTitle('Register', 'Register to your account')

const RegisterPage = async () => {
  // Vars
  const mode = await getServerMode()

  return <Register mode={mode} />
}

export default RegisterPage
