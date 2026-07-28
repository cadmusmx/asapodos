import { redirect } from 'next/navigation';

import { PERM } from '@gaso/shared';

import MaterialLogisticsPdf from '@views/warehouses/material-logistics/MaterialLogisticsPdf';

import type { Locale } from '@configs/i18n';

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access';
import { getLocalizedUrl } from '@/utils/i18n';

// Vista imprimible (print-to-PDF del navegador). Hace su propio fetch a GET /[folio]
// y renderiza el mismo shape del detalle en formato de impresión.
const MaterialLogisticsPdfPage = async (props: { params: Promise<{ lang: Locale; folio: string }> }) => {
  const { lang, folio } = await props.params;

  const access = await requireViewAccess('material_logistics', PERM.R);

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang));
  }

  return <MaterialLogisticsPdf folio={decodeURIComponent(folio)} />;
};

export default MaterialLogisticsPdfPage;
