import { redirect } from 'next/navigation';

import { PERM } from '@gaso/shared';

import MaterialValidationList from '@views/warehouses/material-validation/MaterialValidationList';

import type { Locale } from '@configs/i18n';

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access';
import { getLocalizedUrl } from '@/utils/i18n';

const MaterialValidationPage = async (props: { params: Promise<{ lang: Locale }> }) => {
  const { lang } = await props.params;

  const access = await requireViewAccess('material_validation', PERM.R);

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang));
  }

  const canCreate = (access.mask & PERM.W) === PERM.W;
  const canEdit = (access.mask & PERM.U) === PERM.U;

  return <MaterialValidationList canCreate={canCreate} canEdit={canEdit} />;
}

export default MaterialValidationPage;
