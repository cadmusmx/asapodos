import { EMPLOYEE_DOCUMENTS } from '../constants/employee-catalogs'
import { withTenantContext } from './tenant-context'

const S3_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL ?? 'https://gasosass.s3.us-east-1.amazonaws.com/';

// IsUrl=1 → FilePath ya es URL completa (docs legacy). IsUrl=0 → key en el bucket nuevo.
const resolveUrl = (filePath: string, isUrl: boolean): string => {
  const src = (filePath ?? '').trim();

  if (!src) return '';
  if (isUrl || src.startsWith('http://') || src.startsWith('https://')) return src;

  const key = src.replace(/^\/+/, '');

  return S3_PUBLIC_BASE_URL ? `${S3_PUBLIC_BASE_URL.replace(/\/+$/, '')}/${key}` : key;
};

export async function getProfilePhoto(tenantId: string, employeeId: number): Promise<string> {
  return withTenantContext(tenantId, async (tx) => {
    const rows = await tx.$queryRaw<Array<{ FilePath: string, IsUrl: boolean }>>`
      SELECT TOP 1 FilePath, IsUrl
      FROM HumanCapital.EmployeeFiles
      WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
        AND EmployeeID = ${employeeId}
        AND DocumentTypeID = ${EMPLOYEE_DOCUMENTS.FotoPerfil}
      ORDER BY FileID DESC
    `
    const row = rows[0]
    return row ? resolveUrl(row.FilePath, row.IsUrl) : ''
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
