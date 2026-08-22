import { redirect } from 'next/navigation';

import { PERM } from '@gaso/shared';

import VehiclesList from '@views/fleets/vehicles/VehiclesList';

import type { Locale } from '@configs/i18n';

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access';
import { getLocalizedUrl } from '@/utils/i18n';

const VehiclesPage = async (props: { params: Promise<{ lang: Locale }> }) => {
  const { lang } = await props.params;

  const access = await requireViewAccess('vehicles', PERM.R);

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang));
  }

  const canEdit = (access.mask & PERM.U) === PERM.U;

  return <VehiclesList canEdit={canEdit} />;
};

export default VehiclesPage;
