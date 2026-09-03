import type {
  HumanCapitalVacationBalance,
  HumanCapitalVacationBalanceRow,
  HumanCapitalVacationRequest,
  HumanCapitalVacationRequestRow,
  VacationBalancePayload,
  VacationRequestPayload,
  VacationRequestStatus,
  VacationBalanceGeneratePayload,
  VacationReviewPayload
} from '@/types/human-capital-vacation'

const validVacationStatuses: VacationRequestStatus[] = ['pending', 'approved', 'rejected', 'cancelled']

const toBoolean = (value: boolean | number): boolean => value === true || value === 1

const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0

  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : 0
}

const toIsoDateTime = (value: Date | string | null): string | null => {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return null

  return date.toISOString()
}

const toIsoDate = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString().slice(0, 10)
}

const normalizeNullableString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

const normalizePositiveInteger = (value: unknown, fieldName: string): number => {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} inválido`)
  }

  return parsed
}

const normalizeNonNegativeNumber = (value: unknown, fieldName: string): number => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} inválido`)
  }

  return parsed
}

const normalizePositiveNumber = (value: unknown, fieldName: string): number => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} inválido`)
  }

  return parsed
}

const normalizeRequiredDate = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} es requerido`)
  }

  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error(`${fieldName} es requerido`)
  }

  const date = new Date(`${trimmed}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} inválido`)
  }

  return trimmed
}

export const normalizeVacationStatus = (value: unknown): VacationRequestStatus => {
  if (typeof value !== 'string') return 'pending'

  return validVacationStatuses.includes(value as VacationRequestStatus) ? (value as VacationRequestStatus) : 'pending'
}

export const normalizeVacationBalanceFromRow = (row: HumanCapitalVacationBalanceRow): HumanCapitalVacationBalance => {
  const assignedDays = toNumber(row.AssignedDays)
  const usedDays = toNumber(row.UsedDays)
  const pendingDays = toNumber(row.PendingDays)

  const availableDays =
    row.AvailableDays === undefined || row.AvailableDays === null
      ? Math.max(assignedDays - usedDays - pendingDays, 0)
      : toNumber(row.AvailableDays)

  return {
    id: row.BalanceID,
    tenantId: row.TenantID,
    employeeId: row.EmployeeID,
    employeeName: row.EmployeeName ?? null,
    periodStart: toIsoDate(row.PeriodStart),
    periodEnd: toIsoDate(row.PeriodEnd),
    assignedDays,
    usedDays,
    pendingDays,
    availableDays,
    notes: row.Notes,
    isActive: toBoolean(row.IsActive),
    createdAt: toIsoDateTime(row.CreatedAt),
    updatedAt: toIsoDateTime(row.UpdatedAt),
    createdBy: row.CreatedBy,
    updatedBy: row.UpdatedBy
  }
}

export const normalizeVacationRequestFromRow = (row: HumanCapitalVacationRequestRow): HumanCapitalVacationRequest => ({
  id: row.VacationRequestID,
  tenantId: row.TenantID,
  employeeId: row.EmployeeID,
  employeeName: row.EmployeeName ?? null,
  startDate: toIsoDate(row.StartDate),
  endDate: toIsoDate(row.EndDate),
  requestedDays: toNumber(row.RequestedDays),
  status: normalizeVacationStatus(row.Status),
  reason: row.Reason,
  reviewComments: row.ReviewComments,
  reviewedBy: row.ReviewedBy,
  reviewedAt: toIsoDateTime(row.ReviewedAt),
  cancelledBy: row.CancelledBy,
  cancelledAt: toIsoDateTime(row.CancelledAt),
  cancelReason: row.CancelReason,
  createdAt: toIsoDateTime(row.CreatedAt),
  updatedAt: toIsoDateTime(row.UpdatedAt),
  createdBy: row.CreatedBy,
  updatedBy: row.UpdatedBy
})

export const parseVacationBalancePayload = (raw: unknown): VacationBalancePayload => {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Body inválido')
  }

  const body = raw as Record<string, unknown>
  const employeeId = normalizePositiveInteger(body.employeeId, 'Empleado')
  const periodStart = normalizeRequiredDate(body.periodStart, 'Fecha inicial del periodo')
  const periodEnd = normalizeRequiredDate(body.periodEnd, 'Fecha final del periodo')
  const assignedDays = normalizeNonNegativeNumber(body.assignedDays, 'Días asignados')
  const usedDays = body.usedDays === undefined ? 0 : normalizeNonNegativeNumber(body.usedDays, 'Días usados')

  if (periodEnd < periodStart) {
    throw new Error('La fecha final del periodo no puede ser menor a la fecha inicial')
  }

  if (usedDays > assignedDays) {
    throw new Error('Los días usados no pueden ser mayores a los días asignados')
  }

  return {
    employeeId,
    periodStart,
    periodEnd,
    assignedDays,
    usedDays,
    notes: normalizeNullableString(body.notes),
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true
  }
}

export const parseVacationRequestPayload = (raw: unknown): VacationRequestPayload => {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Body inválido')
  }

  const body = raw as Record<string, unknown>
  const employeeId = normalizePositiveInteger(body.employeeId, 'Empleado')
  const startDate = normalizeRequiredDate(body.startDate, 'Fecha inicial')
  const endDate = normalizeRequiredDate(body.endDate, 'Fecha final')
  const requestedDays = normalizePositiveNumber(body.requestedDays, 'Días solicitados')

  if (endDate < startDate) {
    throw new Error('La fecha final no puede ser menor a la fecha inicial')
  }

  return {
    employeeId,
    startDate,
    endDate,
    requestedDays,
    reason: normalizeNullableString(body.reason)
  }
}

export const parseVacationReviewPayload = (raw: unknown): VacationReviewPayload => {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Body inválido')
  }

  const body = raw as Record<string, unknown>
  const action = body.action

  if (action !== 'approve' && action !== 'reject' && action !== 'cancel') {
    throw new Error('Acción inválida')
  }

  return {
    action,
    comments: normalizeNullableString(body.comments)
  }
}

export const parseVacationBalanceGeneratePayload = (raw: unknown): VacationBalanceGeneratePayload => {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Body inválido')
  }

  const body = raw as Record<string, unknown>
  const employeeId = normalizePositiveInteger(body.employeeId, 'Empleado')
  const usedDays = body.usedDays === undefined ? 0 : normalizeNonNegativeNumber(body.usedDays, 'Días usados')

  const referenceDate =
    body.referenceDate === undefined || body.referenceDate === null || body.referenceDate === ''
      ? null
      : normalizeRequiredDate(body.referenceDate, 'Fecha de referencia')

  return {
    employeeId,
    usedDays,
    notes: normalizeNullableString(body.notes),
    referenceDate
  }
}
