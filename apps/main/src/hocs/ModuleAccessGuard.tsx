// Type Imports
import type { ReactNode } from 'react'


// Next Imports
import { headers } from 'next/headers'

// Third-party Imports
import { getServerSession } from 'next-auth'

import type { TenantModuleSettings } from '@/types/tenant-settings'

// Lib Imports
import { authOptions } from '@/libs/auth'
import {
  canAccessErpModule,
  validateTenantMatch,
  type ErpAccessUser
} from '@/lib/erp-access'
import {
  normalizeTenantSettingsFromRow,
  type TenantSettingsRow
} from '@/lib/tenant-settings/normalize'

// Component Imports
import AccessDenied from '@/components/AccessDenied'
import { ErpModuleKey } from '@/lib/erp-modules'

type Props = {
  moduleKey: ErpModuleKey
  children: ReactNode
}

const getTenantModulesForGuard = async (tenantId: string): Promise<TenantModuleSettings | undefined> => {
  try {
    const { prisma } = await import('@/lib/prisma')

    const settingsRows = await prisma.$queryRaw<TenantSettingsRow[]>`
      SELECT BrandingJson, ModulesJson, LimitsJson
      FROM Security.TenantSettings
      WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
    `

    return normalizeTenantSettingsFromRow(settingsRows[0] ?? null).modules
  } catch (error) {
    console.error('[MODULE_ACCESS_GUARD_SETTINGS_ERROR]', error)

    return undefined
  }
}

const getAccessDeniedMessage = (reason?: string) => {
  if (reason === 'MODULE_DISABLED') {
    return 'Este módulo está desactivado para el tenant actual.'
  }

  return 'No tienes permisos para acceder a este módulo.'
}

const ModuleAccessGuard = async ({ moduleKey, children }: Props) => {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return (
      <AccessDenied
        title='Sesión requerida'
        message='Debes iniciar sesión para acceder a este módulo.'
      />
    )
  }

  const user = session.user as ErpAccessUser

  const requestHeaders = await headers()
  const resolvedTenantId = requestHeaders.get('x-tenant-id')

  const tenantValidation = validateTenantMatch(user.tenantId, resolvedTenantId)

  if (!tenantValidation.allowed) {
    return (
      <AccessDenied
        title='Tenant no válido'
        message='Tu sesión no corresponde al tenant actual. Cierra sesión e inicia nuevamente desde el dominio correcto.'
      />
    )
  }

  const tenantModules = resolvedTenantId
    ? await getTenantModulesForGuard(resolvedTenantId)
    : undefined

  const accessValidation = canAccessErpModule({
    moduleKey,
    user,
    tenantModules
  })

  if (!accessValidation.allowed) {
    return (
      <AccessDenied
        title='Acceso denegado'
        message={getAccessDeniedMessage(accessValidation.reason)}
      />
    )
  }

  return <>{children}</>
}

export default ModuleAccessGuard
