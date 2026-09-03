import { redirect } from 'next/navigation'

import { PERM } from '@gaso/shared'

import type { Locale } from '@configs/i18n'

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access'
import { getLocalizedUrl } from '@/utils/i18n'

import EmployeeExpediente from './page.client'

const Page = async (props: { params: Promise<{ lang: Locale; id: string }> }) => {
  const { lang, id } = await props.params

  const access = await requireViewAccess('employees')

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang))
  }

  const employeeId = Number(id)

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    redirect(getLocalizedUrl('/human-capital/employees', lang))
  }

  const canCreate = (access.mask & PERM.W) === PERM.W
  const canEdit = (access.mask & PERM.U) === PERM.U
  const canDelete = (access.mask & PERM.D) === PERM.D

  return <EmployeeExpediente employeeId={employeeId} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />
}

export default Page
