import { prisma } from '@gaso/shared'

let cachedAdminTenantId: string | null = null

export async function getAdminTenantId(): Promise<string> {
  if (cachedAdminTenantId) return cachedAdminTenantId

  const adminTenant = process.env.ADMIN_TENANT ?? 'gasohub.com'

  const result = await prisma.$queryRaw<Array<{ TenantID: string }>>`
    SELECT TOP 1 TenantID
    FROM Security.Tenants
    WHERE LOWER(Dominio) = LOWER(${adminTenant})
  `

  if (!result[0]?.TenantID) {
    throw new Error(`No tenant found for ADMIN_TENANT: ${adminTenant}`)
  }

  cachedAdminTenantId = result[0].TenantID
  return cachedAdminTenantId
}
