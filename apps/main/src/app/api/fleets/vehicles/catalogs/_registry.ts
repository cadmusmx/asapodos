/**
 * Los nombres de tabla/columna se interpolan con Prisma.raw en las rutas;
 * es seguro porque SIEMPRE salen de este registro, nunca del cliente.
 */
export const CATALOG_REGISTRY = {
  'propietarios': { namePk: 'IdPropietario', table: 'Propietarios', label: 'Propietario' },
  'empresas': { namePk: 'IdEmpresa', table: 'EmpresasSeguros', label: 'Aseguradora' },
} as const;

export type CatalogKey = keyof typeof CATALOG_REGISTRY;

export const isCatalogKey = (value: string): value is CatalogKey =>
  Object.prototype.hasOwnProperty.call(CATALOG_REGISTRY, value);
