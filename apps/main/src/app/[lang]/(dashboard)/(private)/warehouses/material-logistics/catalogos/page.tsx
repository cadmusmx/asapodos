import { redirect } from 'next/navigation'

import { PERM } from '@gaso/shared'

import MaterialLogisticsCatalogs from '@views/warehouses/material-logistics/MaterialLogisticsCatalogs'

import type { Locale } from '@configs/i18n'

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access'
import { getLocalizedUrl } from '@/utils/i18n'

// entra con R; W/U/D habilitan crear, editar/reactivar y desactivar.
// El segmento estático `catalogos` gana sobre `[folio]`.
const MaterialLogisticsCatalogsPage = async (props: { params: Promise<{ lang: Locale }> }) => {
  const { lang } = await props.params

  const access = await requireViewAccess('material_logistics', PERM.R)

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang))
  }

  const canCreate = (access.mask & PERM.W) === PERM.W
  const canEdit = (access.mask & PERM.U) === PERM.U
  const canDelete = (access.mask & PERM.D) === PERM.D

  return <MaterialLogisticsCatalogs canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />
}

export default MaterialLogisticsCatalogsPage
