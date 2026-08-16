import { prisma } from './prisma'
import { withTenantContext } from './tenant-context'

export const DOCUMENT_TYPE_FOTO_PERFIL = 'FotoPerfil'

const PROFILE_PHOTO_S3_BASE =
  process.env.PROFILE_PHOTO_S3_BASE_URL ?? 'https://argosb.s3.us-east-1.amazonaws.com/'

function resolveProfilePhotoUrl(raw: string | null | undefined): string {
  if (!raw || raw === 'null' || raw === 'undefined') return ''
  const src = String(raw).trim()
  if (!src) return ''
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:image/')) {
    return src
  }
  const key = src.replace(/^(\.\.\/)+/, '').replace(/^(\.\/)+/, '').replace(/^\/+/, '')
  return `${PROFILE_PHOTO_S3_BASE.replace(/\/+$/, '')}/${key}`
}

export async function getProfilePhoto(tenantId: string, employeeId: number): Promise<string> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ FilePath: string }>>`
      SELECT TOP 1 FilePath
      FROM HumanCapital.EmployeeFiles
      WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
        AND EmployeeID = ${employeeId}
        AND DocumentType = ${DOCUMENT_TYPE_FOTO_PERFIL}
        AND IsActive = 1
      ORDER BY FileID DESC
    `
    const row = rows[0]
    return row ? resolveProfilePhotoUrl(row.FilePath) : ''
  })
}

export async function setProfilePhoto(
  tenantId: string,
  employeeId: number,
  urlOrKey: string
): Promise<void> {
  const trimmed = urlOrKey.trim()
  if (!trimmed) return

  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ cnt: bigint }>>`
      SELECT COUNT(1) AS cnt
      FROM HumanCapital.EmployeeFiles
      WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
        AND EmployeeID = ${employeeId}
        AND DocumentType = ${DOCUMENT_TYPE_FOTO_PERFIL}
    `
    const exists = Number(rows[0]?.cnt ?? 0) > 0

    if (exists) {
      await tx.$executeRaw`
        UPDATE HumanCapital.EmployeeFiles
        SET FilePath = ${trimmed},
            IsUrl = 1,
            UpdatedAt = SYSUTCDATETIME()
        WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
          AND EmployeeID = ${employeeId}
          AND DocumentType = ${DOCUMENT_TYPE_FOTO_PERFIL}
      `
    } else {
      await tx.$executeRaw`
        INSERT INTO HumanCapital.EmployeeFiles (
          TenantID, EmployeeID, DocumentType, FilePath, IsUrl, IsActive
        )
        VALUES (
          CAST(${tenantId} AS uniqueidentifier),
          ${employeeId},
          ${DOCUMENT_TYPE_FOTO_PERFIL},
          ${trimmed},
          1,
          1
        )
      `
    }
  })
}
