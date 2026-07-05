// apps/main/src/lib/erp-modules.ts  (NUEVO — fuente única)
//
// Vocabulario de módulos del shell, homologado 1:1 con Security.Views.MenuGroup.
// erp-access, erp-navigation y los menús importan de aquí. No se redefine en otro lado.

export const ERP_MODULE_KEYS = [
  'dashboard',
  'warehouses',
  'human_capital',
  'projects',
  'administration',
  'operating_expenses',
  'quotes',
  'suppliers',
  'vehicles'
] as const

export type ErpModuleKey = (typeof ERP_MODULE_KEYS)[number]
