// Tipos compartidos por la UI de administración de permisos (Paso 8).

/** Fila del maestro: usuario administrable (GET /api/permissions/users). */
export interface AssignableUser {
  idUsuario: number;
  nombre: string;
  idDepartamento: number | null;
  departamento: string | null;
}

/** Departamento filtrable (GET /api/permissions/departments). */
export interface FilterableDepartment {
  idDepartamento: number;
  nombre: string;
}

export interface DepartmentsResponse {
  departments: FilterableDepartment[];
}

/** Valor especial del select para "todos los departamentos" (solo privilegiado). */
export const ALL_DEPTS = 'all' as const;
export type DeptSelection = number | typeof ALL_DEPTS;

/** Respuesta paginada del maestro (contrato draw/records/data, igual que audit). */
export interface AssignableUsersResponse {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: AssignableUser[];
}

/** Fila del detalle: vista asignable con sus tres máscaras (GET /api/permissions/user/[id]). */
export interface AssignableView {
  viewCode: string;
  label: string;
  menuGroup: string | null;
  /** CRUDO: solo UserViews (lo asignado manualmente). 0 si nada. */
  currentMask: number;
  /** Techo del depto: máximo asignable. */
  ceilingMask: number;
  /** Piso público (0 = privada): bits "gratis" no quitables. */
  publicMask: number;
}

export interface UserPermissionsResponse {
  idUsuario: number;
  views: AssignableView[];
}
