import { redirect } from 'next/navigation'

import { PERM } from '@gaso/shared'

import MaterialLogisticsDetail from '@views/warehouses/material-logistics/MaterialLogisticsDetail'

import type { Locale } from '@configs/i18n'

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access'
import { getLocalizedUrl } from '@/utils/i18n'

const MaterialLogisticsDetailPage = async (props: { params: Promise<{ lang: Locale; folio: string }> }) => {
  const { lang, folio } = await props.params

  const access = await requireViewAccess('material_logistics', PERM.R)

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang))
  }

  return <MaterialLogisticsDetail folio={decodeURIComponent(folio)} />
}

export default MaterialLogisticsDetailPage
