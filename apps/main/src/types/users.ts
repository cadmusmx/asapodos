export type UserAccountRow = {
  EmployeeID: number
  EmployeeNumber: string | null
  FirstName: string
  LastName: string
  EmploymentStatus: string | null
  IsActive: boolean | number
  DepartmentName: string | null
  PositionName: string | null
  IdUsuario: number | null
  Usuario: string | null
  Estatus: string | null
}

/**
 * Fila del roster, anclado en Employees (LEFT JOIN Users). `hasAccount` false =
 * empleado sin usuario (ordenado primero por el API).
 */
export type UserAccountListItem = {
  employeeId: number
  employeeNumber: string | null
  fullName: string
  positionName: string | null
  departmentName: string | null
  employmentStatus: string | null
  isActive: boolean
  hasAccount: boolean
  userId: number | null
  username: string | null
  accountStatus: string | null
}

export type UsersResponse = {
  data: UserAccountListItem[]
  total: number
  page: number
  pageSize: number
}
