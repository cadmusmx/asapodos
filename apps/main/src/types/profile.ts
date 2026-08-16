export type ProfileBasicRow = {
  IdUsuario: number
  TenantID: string
  Usuario: string
  IdArea: number | null
  IdDepartamento: number | null
  IdPuesto: number | null
  IdRegion: number | null
}

export type ProfileEmployeeRow = {
  EmployeeID: number
  TenantID: string
  EmployeeNumber: string | null
  FirstName: string
  LastName: string
  Email: string | null
  Phone: string | null
  DepartmentID: number | null
  PositionID: number | null
  EmploymentStatus: string
  HireDate: Date | string | null
  IsActive: boolean | number
  AreaID: number | null
  RegionID: number | null
  CURP: string | null
  RFC: string | null
  NSS: string | null
}

export type ProfileOrgNamesRow = {
  DepartmentName: string | null
  PositionName: string | null
  AreaName: string | null
  RegionName: string | null
}

export type ProfileActivityRow = {
  AuditID: number
  TenantID: string
  UserID: number | null
  TableName: string
  Action: string
  OldData: string | null
  NewData: string | null
  ChangedAt: Date | string
  AppUser: string | null
  IdOrigin: number | null
  Origin: string | null
}

export type ProfileActivity = {
  id: number
  tableName: string
  action: string
  actionLabel: string
  oldData: unknown | null
  newData: unknown | null
  changedAt: string
  appUser: string | null
  origin: string | null
}

export type ProfileEmployeeInfo = {
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
  employmentStatus: string
  hireDate: string | null
  isActive: boolean
  areaId: number | null
  areaName: string | null
  regionId: number | null
  regionName: string | null
  curp: string | null
  rfc: string | null
  nss: string | null
}

export type ProfileResponse = {
  id: number
  tenantId: string
  usuario: string
  nombre: string | null
  email: string | null
  photo: string
  area: { id: number | null; name: string | null }
  department: { id: number | null; name: string | null }
  position: { id: number | null; name: string | null }
  region: { id: number | null; name: string | null }
  employee: ProfileEmployeeInfo | null
}

export type ChangePasswordPayload = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export type ProfileActivityResponse = {
  data: ProfileActivity[]
  total: number
  page: number
  pageSize: number
}
