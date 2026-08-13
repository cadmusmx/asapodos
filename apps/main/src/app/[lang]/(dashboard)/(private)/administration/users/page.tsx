import { redirect } from 'next/navigation';

import { PERM } from '@gaso/shared';

import type { Locale } from '@configs/i18n';

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access';
import { getLocalizedUrl } from '@/utils/i18n';

import UsersManager from '@/views/users/UsersManager';

/**
 * Gestión de Usuarios.
 */
const UsersPage = async (props: { params: Promise<{ lang: Locale }> }) => {
  const { lang } = await props.params;

  const access = await requireViewAccess('users', PERM.R);

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang));
  }

  // canEdit: ¿tiene el bit U sobre users? La UI mostrará edición o solo-lectura según esto.
  // NO es la autoridad (el servidor revalida en cada POST), es solo para pintar la UI correcta.
  const canEdit = (access.mask & PERM.U) === PERM.U;

  return <UsersManager canEdit={canEdit} />;
};

export default UsersPage;
