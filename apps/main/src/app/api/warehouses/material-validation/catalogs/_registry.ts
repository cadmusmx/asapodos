// app/api/warehouses/material-validation/catalogs/_registry.ts
//
// Whitelist de catálogos gestionables por tenant (C1). SOLO los 3 nullable.
// Los globales puros (Cat_Carriers, Cat_VMMotivo, Cat_VMEFisico) NO están aquí:
// son taxonomía de plataforma y no se gestionan desde el tenant.
//
// Los nombres de tabla/columna se interpolan con Prisma.raw en las rutas; es
// seguro porque SIEMPRE salen de este registro, nunca del cliente.

export const CATALOG_REGISTRY = {
  'almacenes': { table: 'GASOAL_VMAlmacenes', nameCol: 'Nombre', label: 'Almacén' },
  'proyectos': { table: 'Cat_VMProyecto', nameCol: 'Proyecto', label: 'Proyecto' },
  'tipos-material': { table: 'Cat_VMTiposMaterial', nameCol: 'Tipo', label: 'Tipo de material' },
} as const;

export type CatalogKey = keyof typeof CATALOG_REGISTRY;

export const isCatalogKey = (value: string): value is CatalogKey =>
  Object.prototype.hasOwnProperty.call(CATALOG_REGISTRY, value);
