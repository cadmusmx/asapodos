import type { PlatformRole } from '@gaso/shared'
import type { VerticalMenuItemDataType } from '@/types/menuTypes'

const adminNavigation: VerticalMenuItemDataType[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'ri-dashboard-line',
    href: '/admin',
    roles: ['super_admin']
  },
  {
    id: 'plans',
    label: 'Plans',
    icon: 'ri-vip-diamond-line',
    href: '/admin/plans',
    roles: ['super_admin']
  },
  {
    id: 'tenants',
    label: 'Tenants',
    icon: 'ri-building-line',
    href: '/admin/tenants',
    roles: ['super_admin']
  },
  {
    id: 'users',
    label: 'Users',
    icon: 'ri-user-settings-line',
    href: '/admin/users',
    roles: ['super_admin']
  },
  {
    id: 'audit',
    label: 'Audit Log',
    icon: 'ri-file-list-line',
    href: '/admin/audit',
    roles: ['super_admin', 'auditor']
  }
]

export default adminNavigation
