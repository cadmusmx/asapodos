import type {
    EmploymentStatus,
    HumanCapitalDepartment,
    HumanCapitalDepartmentRow,
    HumanCapitalEmployee,
    HumanCapitalEmployeePayload,
    HumanCapitalEmployeeRow,
    HumanCapitalPosition,
    HumanCapitalPositionRow
} from '@/types/human-capital'

const validEmploymentStatuses: EmploymentStatus[] = ['active', 'inactive', 'on_leave', 'terminated']

const toBoolean = (value: boolean | number): boolean => value === true || value === 1

const toIsoDateTime = (value: Date | string | null): string | null => {
    if (!value) return null

    const date = value instanceof Date ? value : new Date(value)

    if (Number.isNaN(date.getTime())) return null

    return date.toISOString()
}

const toIsoDate = (value: Date | string | null): string | null => {
    const iso = toIsoDateTime(value)

    return iso ? iso.slice(0, 10) : null
}

const normalizeNullableString = (value: unknown): string | null => {
    if (typeof value !== 'string') return null

    const trimmed = value.trim()

    return trimmed.length > 0 ? trimmed : null
}

const normalizeRequiredString = (value: unknown, fieldName: string): string => {
    if (typeof value !== 'string') {
        throw new Error(`${fieldName} es requerido`)
    }

    const trimmed = value.trim()

    if (!trimmed) {
        throw new Error(`${fieldName} es requerido`)
    }

    return trimmed
}

const normalizeNullableNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null

    const parsed = Number(value)

    if (!Number.isInteger(parsed) || parsed <= 0) return null

    return parsed
}

export const normalizeEmploymentStatus = (value: unknown): EmploymentStatus => {
    if (typeof value !== 'string') return 'active'

    return validEmploymentStatuses.includes(value as EmploymentStatus) ? (value as EmploymentStatus) : 'active'
}

export const normalizeDepartmentFromRow = (row: HumanCapitalDepartmentRow): HumanCapitalDepartment => ({
    id: row.DepartmentID,
    tenantId: row.TenantID,
    name: row.Name,
    description: row.Description,
    isActive: toBoolean(row.IsActive),
    createdAt: toIsoDateTime(row.CreatedAt),
    updatedAt: toIsoDateTime(row.UpdatedAt),
    createdBy: row.CreatedBy,
    updatedBy: row.UpdatedBy
})

export const normalizePositionFromRow = (row: HumanCapitalPositionRow): HumanCapitalPosition => ({
    id: row.PositionID,
    tenantId: row.TenantID,
    departmentId: row.DepartmentID,
    departmentName: row.DepartmentName ?? null,
    name: row.Name,
    description: row.Description,
    isActive: toBoolean(row.IsActive),
    createdAt: toIsoDateTime(row.CreatedAt),
    updatedAt: toIsoDateTime(row.UpdatedAt),
    createdBy: row.CreatedBy,
    updatedBy: row.UpdatedBy
})

export const normalizeEmployeeFromRow = (row: HumanCapitalEmployeeRow): HumanCapitalEmployee => {
    const firstName = row.FirstName.trim()
    const lastName = row.LastName.trim()
    const fullName = `${firstName} ${lastName}`.trim()

    return {
        id: row.EmployeeID,
        tenantId: row.TenantID,
        employeeNumber: row.EmployeeNumber,
        firstName,
        lastName,
        fullName,
        email: row.Email,
        phone: row.Phone,
        departmentId: row.DepartmentID,
        departmentName: row.DepartmentName ?? null,
        positionId: row.PositionID,
        positionName: row.PositionName ?? null,
        employmentStatus: normalizeEmploymentStatus(row.EmploymentStatus),
        hireDate: toIsoDate(row.HireDate),
        terminationDate: toIsoDate(row.TerminationDate),
        isActive: toBoolean(row.IsActive),
        createdAt: toIsoDateTime(row.CreatedAt),
        updatedAt: toIsoDateTime(row.UpdatedAt),
        createdBy: row.CreatedBy,
        updatedBy: row.UpdatedBy
    }
}

export const parseEmployeePayload = (raw: unknown): HumanCapitalEmployeePayload => {
    if (typeof raw !== 'object' || raw === null) {
        throw new Error('Body inválido')
    }

    const body = raw as Record<string, unknown>
    const firstName = normalizeRequiredString(body.firstName, 'Nombre')
    const lastName = normalizeRequiredString(body.lastName, 'Apellido')
    const employmentStatus = normalizeEmploymentStatus(body.employmentStatus)

    const hireDate = normalizeNullableString(body.hireDate)
    const terminationDate = normalizeNullableString(body.terminationDate)

    if (hireDate && terminationDate && terminationDate < hireDate) {
        throw new Error('La fecha de baja no puede ser menor a la fecha de ingreso')
    }

    return {
        employeeNumber: normalizeNullableString(body.employeeNumber),
        firstName,
        lastName,
        email: normalizeNullableString(body.email),
        phone: normalizeNullableString(body.phone),
        departmentId: normalizeNullableNumber(body.departmentId),
        positionId: normalizeNullableNumber(body.positionId),
        employmentStatus,
        hireDate,
        terminationDate
    }
}
