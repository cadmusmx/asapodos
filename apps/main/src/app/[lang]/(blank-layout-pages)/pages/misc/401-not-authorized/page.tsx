import NotAuthorized from '@views/NotAuthorized'
import { getServerMode } from '@core/utils/serverHelpers'

const Error401 = async (props: { searchParams: Promise<{ reason?: string }> }) => {
  const mode = await getServerMode()
  const { reason } = await props.searchParams

  return <NotAuthorized mode={mode} reason={reason} />
}

export default Error401
