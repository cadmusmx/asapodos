import type { ErpModuleKey } from '@gaso/shared'

import { canViewErpNavigationModule } from './erp-access'

export type ErpNavigationItem = {
  key: string
  labelKey: string // -> diccionario i18n (pinta el menú)
  href: string
  icon: string
  viewCode: string // -> ata el ítem a me.views (RBAC por vista)
}

export type ErpNavigationModule = {
  key: ErpModuleKey
  labelKey: string
  icon: string

  /** Si true, sus items se renderizan como MenuItem sueltos (sin SubMenu). */
  flat?: boolean
  items: ErpNavigationItem[]
}

export const erpNavigationModules: ErpNavigationModule[] = [
  {
    key: 'dashboard',
    labelKey: 'dashboards.main',
    icon: 'ri-dashboard-line',
    items: [
      { key: 'dash-general', labelKey: 'dashboards.general', href: '/dashboards/general', icon: 'ri-dashboard-3-line', viewCode: 'dashboard' },
      { key: 'dash-hum-cap', labelKey: 'dashboards.humanCapital', href: '/dashboards/human-capital', icon: 'ri-user-heart-line', viewCode: 'dashboard_hum_cap' },
      { key: 'dash-ope-exp', labelKey: 'dashboards.operatingExpenses', href: '/dashboards/operating-expenses', icon: 'ri-wallet-line', viewCode: 'dashboard_ope_exp' },
      { key: 'dash-veh', labelKey: 'dashboards.fleets', href: '/dashboards/fleets', icon: 'ri-truck-line', viewCode: 'dashboard_veh' },
      { key: 'dash-pro', labelKey: 'dashboards.projects', href: '/dashboards/projects', icon: 'ri-briefcase-line', viewCode: 'dashboard_pro' },
      { key: 'dash-war', labelKey: 'dashboards.warehouses', href: '/dashboards/warehouses', icon: 'ri-store-2-line', viewCode: 'dashboard_war' }
    ]
  },
  {
    key: 'warehouses',
    labelKey: 'warehouses.main',
    icon: 'ri-store-2-line',
    items: [
      { key: 'wh-inventory', labelKey: 'warehouses.inventory', href: '/warehouses/inventory', icon: 'ri-file-list-3-line', viewCode: 'inventory' },
      { key: 'wh-ericsson', labelKey: 'warehouses.ericssonInventory', href: '/warehouses/ericsson-inventory', icon: 'ri-npmjs-line', viewCode: 'ericsson_inventory' },
      { key: 'wh-list', labelKey: 'warehouses.warehouseList', href: '/warehouses/warehouse-list', icon: 'ri-layout-grid-line', viewCode: 'warehouses_list' },
      { key: 'wh-map', labelKey: 'warehouses.warehouseMap', href: '/warehouses/warehouse-map', icon: 'ri-map-pin-line', viewCode: 'warehouses_map' },
      { key: 'wh-movements', labelKey: 'warehouses.inventoryMovements', href: '/warehouses/inventory-movements', icon: 'ri-exchange-line', viewCode: 'inventory_movements' },
      { key: 'wh-validation', labelKey: 'warehouses.materialValidation', href: '/warehouses/material-validation', icon: 'ri-file-check-line', viewCode: 'material_validation' },
      { key: 'wh-logistics', labelKey: 'warehouses.materialLogistics', href: '/warehouses/material-logistics', icon: 'ri-inbox-archive-line', viewCode: 'material_logistics' },
      { key: 'wh-quality', labelKey: 'warehouses.qualityInspection', href: '/warehouses/quality-inspection', icon: 'ri-shield-check-line', viewCode: 'quality_inspection' }
    ]
  },
  {
    key: 'human_capital',
    labelKey: 'humanCapital.main',
    icon: 'ri-user-heart-line',
    items: [
      { key: 'hc-employees', labelKey: 'humanCapital.employees', href: '/human-capital/employees', icon: 'ri-user-line', viewCode: 'employees' },
      { key: 'hc-time-off', labelKey: 'humanCapital.timeOff', href: '/human-capital/time-off', icon: 'ri-calendar-check-line', viewCode: 'vacation' }
    ]
  },
  {
    key: 'projects',
    labelKey: 'projects.main',
    icon: 'ri-briefcase-line',
    items: [
      { key: 'pr-management', labelKey: 'projectManagement', href: '/project-management', icon: 'ri-global-line', viewCode: 'project_management' },
      { key: 'pr-active', labelKey: 'projects.activeProjects', href: '/projects/active-projects', icon: 'ri-folder-chart-line', viewCode: 'active_projects' },
      { key: 'pr-orders', labelKey: 'projects.purchaseOrders', href: '/projects/purchase-orders', icon: 'ri-shopping-cart-line', viewCode: 'purchase_orders' },
      { key: 'pr-budget', labelKey: 'projects.expenseBudget', href: '/projects/expense-budget', icon: 'ri-coins-line', viewCode: 'expenditure_budget' }
    ]
  },
  {
    key: 'quotes',
    labelKey: 'quotes',
    icon: 'ri-file-text-line',
    flat: true,
    items: [
      { key: 'quotes', labelKey: 'quotes', href: '/quotes', icon: 'ri-file-text-line', viewCode: 'quotes' }
    ]
  },
  {
    key: 'operating_expenses',
    labelKey: 'operatingExpenses.main',
    icon: 'ri-wallet-line',
    items: [
      { key: 'oe-expense-requests', labelKey: 'operatingExpenses.expenseRequests', href: '/operating-expenses/expense-requests', icon: 'ri-receipt-line', viewCode: 'requests_expenses' }
    ]
  },
  {
    key: 'vehicles',
    labelKey: 'fleets.main',
    icon: 'ri-truck-line',
    items: [
      { key: 'veh-vehicles', labelKey: 'fleets.vehicles', href: '/fleets/vehicles', icon: 'ri-car-line', viewCode: 'vehicles' },
      { key: 'veh-issues', labelKey: 'fleets.issues', href: '/fleets/issues', icon: 'ri-error-warning-line', viewCode: 'findings' },
      { key: 'veh-tracking', labelKey: 'fleets.vehicleTracking', href: '/fleets/vehicle-tracking', icon: 'ri-gps-line', viewCode: 'vehicle_tracking' },
      { key: 'veh-fuel', labelKey: 'fleets.fuelReceipts', href: '/fleets/fuel-receipts', icon: 'ri-drop-line', viewCode: 'gasoline_receipt' },
      { key: 'veh-responsibility', labelKey: 'fleets.vehicleResponsibility', href: '/fleets/vehicle-responsibility', icon: 'ri-file-paper-line', viewCode: 'vehicle_liability' },
      { key: 'veh-mileage', labelKey: 'fleets.weeklyMileage', href: '/fleets/weekly-mileage', icon: 'ri-speed-up-line', viewCode: 'weekly_mileage' },
      { key: 'veh-expense-control', labelKey: 'fleets.vehicleExpenseControl', href: '/fleets/vehicle-expense-control', icon: 'ri-money-dollar-circle-line', viewCode: 'vehicle_expense_control' }
    ]
  },
  {
    key: 'suppliers',
    labelKey: 'suppliers.main',
    icon: 'ri-community-line',
    items: [
      { key: 'sup-contractors', labelKey: 'suppliers.contractors', href: '/suppliers/contractors', icon: 'ri-group-line', viewCode: 'contractors' }
    ]
  },
  {
    key: 'administration',
    labelKey: 'administration.main',
    icon: 'ri-government-line',
    items: [
      { key: 'adm-requests', labelKey: 'administration.requests', href: '/administration/requests', icon: 'ri-file-list-line', viewCode: 'requests' },
      { key: 'adm-audit', labelKey: 'administration.audit', href: '/administration/audit', icon: 'ri-file-history-line', viewCode: 'audit' },
      { key: 'adm-permissions', labelKey: 'administration.permissions', href: '/administration/permissions', icon: 'ri-lock-unlock-line', viewCode: 'permissions_access' }
    ]
  }
]

/** Resuelve un labelKey ('a.b' o 'a') contra dictionary.navigation. */
export const getDictionaryValue = (dictionary: any, path: string): string => {
  return path.split('.').reduce((currentValue, currentKey) => currentValue?.[currentKey], dictionary?.navigation) ?? path
}

type VisibleNavParams = {
  menuGroups?: Record<string, boolean>;

  /** me.views: solo se usa la presencia de la llave viewCode. */
  views?: Record<string, unknown>;

  /** me.planMenuGroups: módulos que el PLAN del tenant habilita. */
  planMenuGroups?: ErpModuleKey[];
  isLoading: boolean;
};

/**
 * Navegación visible para el usuario, doble filtro:
 *  - Grupo: canViewErpNavigationModule (módulo ∈ plan ∧ RBAC tiene vistas en el grupo).
 *  - Ítem: solo los que el usuario tiene en me.views (RBAC por vista).
 * Grupos que quedan sin ítems visibles se omiten.
 */
export const getVisibleErpNavigation = ({
  menuGroups,
  views,
  planMenuGroups,
  isLoading,
}: VisibleNavParams): ErpNavigationModule[] => {
  if (isLoading) return [];

  return erpNavigationModules
    .filter(module =>
      canViewErpNavigationModule({
        moduleKey: module.key,
        isLoading,
        menuGroups,
        planMenuGroups,
      }),
    )
    .map(module => ({
      ...module,
      items: module.items.filter(item => Boolean(views?.[item.viewCode])),
    }))
    .filter(module => module.items.length > 0);
};
