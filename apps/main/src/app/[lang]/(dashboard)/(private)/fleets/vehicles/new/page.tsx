import { redirect } from 'next/navigation';

import { PERM } from '@gaso/shared';

import VehicleCreate from '@views/fleets/vehicles/VehicleCreate';

import type { Locale } from '@configs/i18n';

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access';
import { getLocalizedUrl } from '@/utils/i18n';

const VehicleCreatePage = async (props: { params: Promise<{ lang: Locale }> }) => {
  const { lang } = await props.params;

  const access = await requireViewAccess('vehicles', PERM.W);

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang));
  }

  return <VehicleCreate />;
};

export default VehicleCreatePage;
