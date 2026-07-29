/**
 * Whitelist de catálogos gestionables por tenant en Logística de Material.
 *
 * Los globales puros (Cat_LMTiposMaterial, Cat_LMTiposIncidencia, Cat_LMTiposEvidencia y Cat_Carriers) NO están aquí:
 *  son taxonomía de plataforma y no se administran desde el tenant.
 *
 * table/nameCol se interpolan con Prisma.raw en las rutas;
 * es seguro porque SIEMPRE salen de este registro, nunca del cliente (que solo aporta la clave `tipo`, validada con isCatalogKey).
 */
export const CATALOG_REGISTRY = {
  'xdocks': { table: 'Cat_LMXdocks', nameCol: 'Nombre', label: 'XDOCK' },
} as const;

export type CatalogKey = keyof typeof CATALOG_REGISTRY;

export const isCatalogKey = (value: string): value is CatalogKey =>
  Object.prototype.hasOwnProperty.call(CATALOG_REGISTRY, value);
