import { redirect } from 'next/navigation';

import { PERM } from '@gaso/shared';


import type { Locale } from '@configs/i18n';

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access';
import { getLocalizedUrl } from '@/utils/i18n';
import MaterialLogisticsOut from '@/views/warehouses/material-logistics/MaterialLogisticsOut';

// Form de entrega (OutDerived) a partir de una recepción. Crear entrega = bit W.
const MaterialLogisticsOutPage = async (props: { params: Promise<{ lang: Locale; folio: string }> }) => {
  const { lang, folio } = await props.params;

  const access = await requireViewAccess('material_logistics', PERM.W);

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang));
  }

  return <MaterialLogisticsOut folio={decodeURIComponent(folio)} />;
};

export default MaterialLogisticsOutPage;
