import { redirect } from 'next/navigation'

import { PERM } from '@gaso/shared'

import type { Locale } from '@configs/i18n'

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access'
import { getLocalizedUrl } from '@/utils/i18n'

import HumanCapitalView from './page.client'

const Page = async (props: { params: Promise<{ lang: Locale }> }) => {
  const { lang } = await props.params

  const access = await requireViewAccess('employees')

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang))
  }

  // Launcher a Gestión de Usuarios: gateado por su viewCode, sin redirigir esta página.
  const usersAccess = await requireViewAccess('users', PERM.R)
  const canManageUsers = usersAccess.ok
  const usersHref = getLocalizedUrl('/administration/users', lang)

  return <HumanCapitalView canManageUsers={canManageUsers} usersHref={usersHref} />
}

export default Page
