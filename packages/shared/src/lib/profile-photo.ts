import { EMPLOYEE_DOCUMENTS } from '../constants/employee-catalogs'
import { withTenantContext } from './tenant-context'

const PROFILE_PHOTO_S3_BASE =
  process.env.PROFILE_PHOTO_S3_BASE_URL ?? 'https://argosb.s3.us-east-1.amazonaws.com/' // El bucket ya no es argosb

// Nota: la tabla `HumanCapital.EmployeeFiles` tiene la columna IsUrl por los documentos migrados de los usuarios legacy de Gaso
// vienen con la URL completa https://argosb.s3.us-east-1.amazonaws.com/file (solo para estos documentos)
// los nuevos documentos que se cargeun de aqui en adelante deben ser IsUrl en 0 y guardar solo la key del archivo S3.
// estos archivos ya son de otro Bucket y las carpetas deben ser Qa o Pr
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

// No usar DocumentType era dato de la migración, usar DocumentTypeID en su lugar

export async function getProfilePhoto(tenantId: string, employeeId: number): Promise<string> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ FilePath: string }>>`
      SELECT TOP 1 FilePath
      FROM HumanCapital.EmployeeFiles
      WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
        AND EmployeeID = ${employeeId}
        AND DocumentTypeID = ${EMPLOYEE_DOCUMENTS.FotoPerfil}
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
  // Ya no deberiamos subir la URL completa se deja asi por compatibilidad
  const isUrl = /^(https?:)?\/\//.test(trimmed) || trimmed.startsWith('data:image/') ? 1 : 0;

  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ cnt: bigint }>>`
    SELECT COUNT(1) AS cnt
    FROM HumanCapital.EmployeeFiles
    WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
    AND EmployeeID = ${employeeId}
    AND DocumentTypeID = ${EMPLOYEE_DOCUMENTS.FotoPerfil}
    `
    const exists = Number(rows[0]?.cnt ?? 0) > 0

    if (exists) {
      await tx.$executeRaw`
      UPDATE HumanCapital.EmployeeFiles
      SET FilePath = ${trimmed},
      IsUrl = ${isUrl},
      UpdatedAt = SYSUTCDATETIME()
      WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
      AND EmployeeID = ${employeeId}
      AND DocumentTypeID = ${EMPLOYEE_DOCUMENTS.FotoPerfil}
      `
    } else {
      // NO usar columna IsActive en EmployeeFiles (fue de uso temporal)
      await tx.$executeRaw`
        INSERT INTO HumanCapital.EmployeeFiles (
          TenantID, EmployeeID, DocumentTypeID, FilePath, IsUrl
        )
        VALUES (
          CAST(${tenantId} AS uniqueidentifier),
          ${employeeId},
          ${EMPLOYEE_DOCUMENTS.FotoPerfil},
          ${trimmed},
          ${isUrl}
        )
      `
    }
  })
}
