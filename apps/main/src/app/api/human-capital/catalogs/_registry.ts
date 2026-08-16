/**
 * Los nombres de tabla/columna se interpolan con Prisma.raw en las rutas;
 * es seguro porque SIEMPRE salen de este registro, nunca del cliente.
 */
export const CATALOG_REGISTRY = {
  'departamentos': { namePk: 'DepartmentID', table: 'Departments', nameCol: 'Name', label: 'Departamento' },
  'puestos': { namePk: 'PositionID', table: 'Positions', nameCol: 'Name', label: 'Puesto' },
  'areas': { namePk: 'AreaID', table: 'Areas', nameCol: 'Name', label: 'Area' },
} as const;

export type CatalogKey = keyof typeof CATALOG_REGISTRY;

export const isCatalogKey = (value: string): value is CatalogKey =>
  Object.prototype.hasOwnProperty.call(CATALOG_REGISTRY, value);
