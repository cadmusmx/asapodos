import { redirect } from 'next/navigation';

import { PERM } from '@gaso/shared';

import MaterialValidationDetail from '@views/warehouses/material-validation/MaterialValidationDetail';

import type { Locale } from '@configs/i18n';

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access';
import { getLocalizedUrl } from '@/utils/i18n';

const MaterialValidationDetailPage = async (props: { params: Promise<{ lang: Locale; folio: string }> }) => {
  const { lang, folio } = await props.params;

  const access = await requireViewAccess('material_validation', PERM.R);

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang));
  }

  const canEdit = (access.mask & PERM.U) === PERM.U

  return <MaterialValidationDetail folio={decodeURIComponent(folio)} canEdit={canEdit} />
}

export default MaterialValidationDetailPage
