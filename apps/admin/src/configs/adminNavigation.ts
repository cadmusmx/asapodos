import type { VerticalMenuItemDataType } from '@/types/menuTypes'

const adminNavigation: VerticalMenuItemDataType[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'ri-dashboard-line',
    href: '/admin'
  },
  {
    id: 'tenants',
    label: 'Tenants',
    icon: 'ri-building-line',
    href: '/admin/tenants'
  },
  {
    id: 'audit',
    label: 'Audit Log',
    icon: 'ri-file-list-line',
    href: '/admin/audit'
  }
]

export default adminNavigation
