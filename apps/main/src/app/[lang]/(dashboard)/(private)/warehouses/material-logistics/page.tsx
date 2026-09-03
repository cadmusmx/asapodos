import { redirect } from 'next/navigation'

import { PERM } from '@gaso/shared'

import MaterialLogisticsList from '@views/warehouses/material-logistics/MaterialLogisticsList'

import type { Locale } from '@configs/i18n'

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access'
import { getLocalizedUrl } from '@/utils/i18n'

// Logística de Material — listado (solo lectura).
// La captura es responsabilidad de la app Flutter; la web solo lista, muestra detalle y genera el PDF cliente.
const MaterialLogisticsPage = async (props: { params: Promise<{ lang: Locale }> }) => {
  const { lang } = await props.params

  const access = await requireViewAccess('material_logistics', PERM.R)

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang))
  }

  return <MaterialLogisticsList />
}

export default MaterialLogisticsPage
