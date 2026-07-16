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

export const ERP_MODULE_TO_VARIABLE: Record<ErpModuleKey, string> = {
  dashboard: 'd_principal',
  warehouses: 'almacen',
  human_capital: 'capital_humano',
  projects: 'proyectos',
  administration: 'administracion',
  operating_expenses: 'gastos_operacion',
  quotes: 'cotizaciones',
  suppliers: 'proveedores',
  vehicles: 'flotillas',
}

export const ERP_VARIABLE_TO_MODULE: Record<string, ErpModuleKey> = {
  d_principal: 'dashboard',
  almacen: 'warehouses',
  capital_humano: 'human_capital',
  proyectos: 'projects',
  administracion: 'administration',
  gastos_operacion: 'operating_expenses',
  cotizaciones: 'quotes',
  proveedores: 'suppliers',
  flotillas: 'vehicles',
}
