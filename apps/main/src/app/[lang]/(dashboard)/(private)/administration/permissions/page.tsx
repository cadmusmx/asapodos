import { redirect } from 'next/navigation';

import { PERM } from '@gaso/shared';

import type { Locale } from '@configs/i18n';

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access';
import { getLocalizedUrl } from '@/utils/i18n';
import PermissionsManager from '@views/permissions/PermissionsManager';

/**
 * Administración de permisos.
 *
 * Guard de página: mismo RBAC que las APIs de /api/permissions/*.
 * Entra quien tenga permissions_access con R (ver).
 * La capacidad de EDITAR (permissions_access con U) se evalúa aparte, en el cliente,
 * para mostrar la UI en modo lectura o edición — y el servidor la vuelve a exigir en cada escritura.
 */
const PermissionsPage = async (props: { params: Promise<{ lang: Locale }> }) => {
  const { lang } = await props.params;

  const access = await requireViewAccess('permissions_access', PERM.R);

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang));
  }

  // canEdit: ¿tiene el bit U sobre permissions_access? La UI mostrará edición o solo-lectura según esto.
  // NO es la autoridad (el servidor revalida en cada POST), es solo para pintar la UI correcta.
  const canEdit = (access.mask & PERM.U) === PERM.U;

  return <PermissionsManager canEdit={canEdit} />;
};

export default PermissionsPage;
