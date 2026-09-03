export type VacationRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export type HumanCapitalVacationBalance = {
  id: number
  tenantId: string
  employeeId: number
  employeeName: string | null
  periodStart: string
  periodEnd: string
  assignedDays: number
  usedDays: number
  pendingDays: number
  availableDays: number
  notes: string | null
  isActive: boolean
  createdAt: string | null
  updatedAt: string | null
  createdBy: number | null
  updatedBy: number | null
}

export type HumanCapitalVacationRequest = {
  id: number
  tenantId: string
  employeeId: number
  employeeName: string | null
  startDate: string
  endDate: string
  requestedDays: number
  status: VacationRequestStatus
  reason: string | null
  reviewComments: string | null
  reviewedBy: number | null
  reviewedAt: string | null
  cancelledBy: number | null
  cancelledAt: string | null
  cancelReason: string | null
  createdAt: string | null
  updatedAt: string | null
  createdBy: number | null
  updatedBy: number | null
}

export type HumanCapitalVacationBalanceRow = {
  BalanceID: number
  TenantID: string
  EmployeeID: number
  EmployeeName?: string | null
  PeriodStart: Date | string
  PeriodEnd: Date | string
  AssignedDays: number | string
  UsedDays: number | string
  PendingDays?: number | string | null
  AvailableDays?: number | string | null
  Notes: string | null
  IsActive: boolean | number
  CreatedAt: Date | string | null
  UpdatedAt: Date | string | null
  CreatedBy: number | null
  UpdatedBy: number | null
}

export type HumanCapitalVacationRequestRow = {
  VacationRequestID: number
  TenantID: string
  EmployeeID: number
  EmployeeName?: string | null
  StartDate: Date | string
  EndDate: Date | string
  RequestedDays: number | string
  Status: string
  Reason: string | null
  ReviewComments: string | null
  ReviewedBy: number | null
  ReviewedAt: Date | string | null
  CancelledBy: number | null
  CancelledAt: Date | string | null
  CancelReason: string | null
  CreatedAt: Date | string | null
  UpdatedAt: Date | string | null
  CreatedBy: number | null
  UpdatedBy: number | null
}

export type VacationBalancePayload = {
  employeeId: number
  periodStart: string
  periodEnd: string
  assignedDays: number
  usedDays?: number
  notes?: string | null
  isActive?: boolean
}

export type VacationBalanceGeneratePayload = {
  employeeId: number
  usedDays?: number
  notes?: string | null
  referenceDate?: string | null
}

export type VacationBalanceGenerationResult = {
  generated: boolean
  balance: HumanCapitalVacationBalance
  calculation: {
    employeeId: number
    employeeName: string | null
    hireDate: string
    yearsCompleted: number
    assignedDays: number
    periodStart: string
    periodEnd: string
  }
}

export type VacationRequestPayload = {
  employeeId: number
  startDate: string
  endDate: string
  requestedDays: number
  reason?: string | null
}

export type VacationReviewPayload = {
  action: 'approve' | 'reject' | 'cancel'
  comments?: string | null
}

export type VacationBalancesResponse = {
  data: HumanCapitalVacationBalance[]
  total: number
  page: number
  pageSize: number
}

export type VacationRequestsResponse = {
  data: HumanCapitalVacationRequest[]
  total: number
  page: number
  pageSize: number
}
