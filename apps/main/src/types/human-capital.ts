export type EmploymentStatus = 'active' | 'inactive' | 'on_leave' | 'terminated'

export type HumanCapitalDepartment = {
    id: number
    tenantId: string
    name: string
    description: string | null
    isActive: boolean
    createdAt: string | null
    updatedAt: string | null
    createdBy: number | null
    updatedBy: number | null
}

export type HumanCapitalPosition = {
    id: number
    tenantId: string
    departmentId: number | null
    departmentName: string | null
    name: string
    description: string | null
    isActive: boolean
    createdAt: string | null
    updatedAt: string | null
    createdBy: number | null
    updatedBy: number | null
}

export type HumanCapitalEmployee = {
    id: number
    tenantId: string
    employeeNumber: string | null
    firstName: string
    lastName: string
    fullName: string
    email: string | null
    phone: string | null
    departmentId: number | null
    departmentName: string | null
    positionId: number | null
    positionName: string | null
    employmentStatus: EmploymentStatus
    hireDate: string | null
    terminationDate: string | null
    isActive: boolean
    createdAt: string | null
    updatedAt: string | null
    createdBy: number | null
    updatedBy: number | null
}

export type HumanCapitalDepartmentRow = {
    DepartmentID: number
    TenantID: string
    Name: string
    Description: string | null
    IsActive: boolean | number
    CreatedAt: Date | string | null
    UpdatedAt: Date | string | null
    CreatedBy: number | null
    UpdatedBy: number | null
}

export type HumanCapitalPositionRow = {
    PositionID: number
    TenantID: string
    DepartmentID: number | null
    DepartmentName?: string | null
    Name: string
    Description: string | null
    IsActive: boolean | number
    CreatedAt: Date | string | null
    UpdatedAt: Date | string | null
    CreatedBy: number | null
    UpdatedBy: number | null
}

export type HumanCapitalEmployeeRow = {
    EmployeeID: number
    TenantID: string
    EmployeeNumber: string | null
    FirstName: string
    LastName: string
    Email: string | null
    Phone: string | null
    DepartmentID: number | null
    DepartmentName?: string | null
    PositionID: number | null
    PositionName?: string | null
    EmploymentStatus: string
    HireDate: Date | string | null
    TerminationDate: Date | string | null
    IsActive: boolean | number
    CreatedAt: Date | string | null
    UpdatedAt: Date | string | null
    CreatedBy: number | null
    UpdatedBy: number | null
}

export type HumanCapitalEmployeePayload = {
    employeeNumber?: string | null
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
    departmentId?: number | null
    positionId?: number | null
    employmentStatus?: EmploymentStatus
    hireDate?: string | null
    terminationDate?: string | null
}

export type HumanCapitalEmployeesResponse = {
    data: HumanCapitalEmployee[]
    total: number
}

export type HumanCapitalCatalogsResponse = {
    departments: HumanCapitalDepartment[]
    positions: HumanCapitalPosition[]
}
