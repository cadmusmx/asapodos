import { notFound, redirect } from 'next/navigation';

import { PERM } from '@gaso/shared';

import VehicleDetail from '@views/fleets/vehicles/VehicleDetail';

import type { Locale } from '@configs/i18n';

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access';
import { getLocalizedUrl } from '@/utils/i18n';

const VehicleDetailPage = async (props: { params: Promise<{ lang: Locale; id: string }> }) => {
  const { lang, id } = await props.params;

  const access = await requireViewAccess('vehicles', PERM.R);

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang));
  }

  const vehicleId = Number(id);

  if (!Number.isInteger(vehicleId) || vehicleId <= 0) {
    notFound();
  }

  const canEdit = (access.mask & PERM.U) === PERM.U;

  return <VehicleDetail vehicleId={vehicleId} canEdit={canEdit} />;
};

export default VehicleDetailPage;
