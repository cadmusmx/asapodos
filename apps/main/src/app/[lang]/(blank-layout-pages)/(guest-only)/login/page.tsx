// Next Imports
// Component Imports
import Login from '@views/Login'

// import Login from '@views/pages/auth/LoginV1'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

// Lib Imports
import { withTenantTitle } from '@/lib/page-metadata'

export const generateMetadata = () => withTenantTitle('Login', 'Login to your account')

const LoginPage = async () => {
  // Vars
  const mode = await getServerMode()

  return <Login mode={mode} />
}

export default LoginPage
