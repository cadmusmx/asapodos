import { redirect } from 'next/navigation'

import { PERM } from '@gaso/shared'

import MaterialValidationOut from '@/views/warehouses/material-validation/MaterialValidationOut'

import type { Locale } from '@configs/i18n'

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access'
import { getLocalizedUrl } from '@/utils/i18n'

const MaterialValidationOutPage = async (props: { params: Promise<{ lang: Locale; folio: string }> }) => {
  const { lang, folio } = await props.params

  const access = await requireViewAccess('material_validation', PERM.W)

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang))
  }

  return <MaterialValidationOut folio={decodeURIComponent(folio)} />
};

export default MaterialValidationOutPage
