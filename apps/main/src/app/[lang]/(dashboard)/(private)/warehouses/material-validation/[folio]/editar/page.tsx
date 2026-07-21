import { redirect } from 'next/navigation';

import { PERM } from '@gaso/shared';

import MaterialValidationEditForm from '@/views/warehouses/material-validation/MaterialValidationEditForm';

import type { Locale } from '@configs/i18n';

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access';
import { getLocalizedUrl } from '@/utils/i18n';

const MaterialValidationEditPage = async (props: { params: Promise<{ lang: Locale; folio: string }> }) => {
  const { lang, folio } = await props.params;

  const access = await requireViewAccess('material_validation', PERM.U);

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang));
  }

  return <MaterialValidationEditForm folio={decodeURIComponent(folio)} />;
};

export default MaterialValidationEditPage;
