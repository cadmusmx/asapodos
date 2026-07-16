import { redirect } from 'next/navigation'

import type { Locale } from '@configs/i18n'

import { getTargetByReason, requireViewAccess } from '@/lib/auth/require-view-access'
import { getLocalizedUrl } from '@/utils/i18n'
import AuditViewer from '@views/audit/AuditViewer'

const AuditPage = async (props: { params: Promise<{ lang: Locale }> }) => {
  const { lang } = await props.params

  // Guard de página (defensa en profundidad nivel UI): mismo RBAC que la API.
  // Pregunta lo mismo que /api/audit: ¿tiene la vista 'audit'? No basta ser admin.
  const access = await requireViewAccess('audit')

  if (!access.ok) {
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang));
  }

  // El cross-tenant (isSaasAdmin / input de tenant) se retiró de apps/main.
  // La auditoría global vive en apps/admin (módulo aparte).
  return <AuditViewer />
}

export default AuditPage
