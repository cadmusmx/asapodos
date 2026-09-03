import type {
  ProfileActivity,
  ProfileBasicRow,
  ProfileEmployeeInfo,
  ProfileEmployeeRow,
  ProfileOrgNamesRow,
  ProfileResponse,
  ChangePasswordPayload
} from '@/types/profile'

const toBoolean = (value: boolean | number): boolean => value === true || value === 1

const toIsoDate = (value: Date | string | null): string | null => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return date.toISOString().slice(0, 10)
}

const toIsoDateTime = (value: Date | string | null): string | null => {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
}

const normalizeNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

export const normalizeEmployeeFromRow = (
  row: ProfileEmployeeRow,
  orgNames: ProfileOrgNamesRow | null
): ProfileEmployeeInfo => {
  const firstName = row.FirstName.trim()
  const lastName = row.LastName.trim()

  return {
    employeeNumber: row.EmployeeNumber,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    email: row.Email,
    phone: row.Phone,
    departmentId: row.DepartmentID,
    departmentName: orgNames?.DepartmentName ?? null,
    positionId: row.PositionID,
    positionName: orgNames?.PositionName ?? null,
    employmentStatus: row.EmploymentStatus,
    hireDate: toIsoDate(row.HireDate),
    isActive: toBoolean(row.IsActive),
    areaId: row.AreaID,
    areaName: orgNames?.AreaName ?? null,
    regionId: row.RegionID,
    regionName: orgNames?.RegionName ?? null,
    curp: row.CURP,
    rfc: row.RFC,
    nss: row.NSS
  }
}

export const normalizeProfileFromRow = (
  basic: ProfileBasicRow,
  employee: ProfileEmployeeRow | null,
  orgNames: ProfileOrgNamesRow | null,
  photo: string
): ProfileResponse => {
  const firstName = employee?.FirstName?.trim() ?? ''
  const lastName = employee?.LastName?.trim() ?? ''

  return {
    id: basic.IdUsuario,
    tenantId: basic.TenantID,
    usuario: basic.Usuario,
    nombre: `${firstName} ${lastName}`.trim() || null,
    email: employee?.Email ?? null,
    photo,
    area: {
      id: basic.IdArea ?? null,
      name: orgNames?.AreaName ?? null
    },
    department: {
      id: basic.IdDepartamento ?? null,
      name: orgNames?.DepartmentName ?? null
    },
    position: {
      id: basic.IdPuesto ?? null,
      name: orgNames?.PositionName ?? null
    },
    region: {
      id: basic.IdRegion ?? null,
      name: orgNames?.RegionName ?? null
    },
    employee: employee ? normalizeEmployeeFromRow(employee, orgNames) : null
  }
}

export const normalizeActivityFromRow = (
  row: {
    AuditID: string | number | bigint
    TenantID: string
    UserID: string | number | null
    TableName: string
    Action: string
    OldData: string | null
    NewData: string | null
    ChangedAt: Date | string
    AppUser: string | null
    IdOrigin: string | number | null
    Origin: string | null
  },
  actionLabels: Record<string, string>
): ProfileActivity => {
  let oldData: unknown = null
  let newData: unknown = null

  try {
    if (row.OldData) oldData = JSON.parse(row.OldData)
  } catch {
    /* ignore */
  }

  try {
    if (row.NewData) newData = JSON.parse(row.NewData)
  } catch {
    /* ignore */
  }

  const auditId =
    typeof row.AuditID === 'bigint'
      ? Number(row.AuditID)
      : typeof row.AuditID === 'string'
        ? Number(row.AuditID)
        : row.AuditID

  return {
    id: auditId,
    tableName: row.TableName,
    action: row.Action,
    actionLabel: actionLabels[row.Action] ?? row.Action,
    oldData,
    newData,
    changedAt: toIsoDateTime(row.ChangedAt) ?? new Date().toISOString(),
    appUser: row.AppUser,
    origin: row.Origin ?? null
  }
}

const MIN_PASSWORD_LENGTH = 8

export const parseChangePasswordPayload = (raw: unknown): ChangePasswordPayload => {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Body inválido')
  }

  const body = raw as Record<string, unknown>

  const currentPassword = normalizeNullableString(body.currentPassword)

  if (!currentPassword) throw new Error('La contraseña actual es requerida')

  const newPassword = normalizeNullableString(body.newPassword)

  if (!newPassword) throw new Error('La nueva contraseña es requerida')

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`La nueva contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
  }

  const confirmPassword = normalizeNullableString(body.confirmPassword)

  if (!confirmPassword) throw new Error('La confirmación de contraseña es requerida')

  if (newPassword !== confirmPassword) {
    throw new Error('La nueva contraseña y su confirmación no coinciden')
  }

  return { currentPassword, newPassword, confirmPassword }
}
