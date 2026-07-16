'use client'

// MUI Imports
import Chip from '@mui/material/Chip'
import Typography from '@mui/material/Typography'

// Third-party Imports
import classnames from 'classnames'
import { useSession } from 'next-auth/react'

// Type Imports
import type { ShortcutsType } from '@components/layout/shared/ShortcutsDropdown'
import type { NotificationsType } from '@components/layout/shared/NotificationsDropdown'

// Component Imports
import NavToggle from './NavToggle'
import NavSearch from '@components/layout/shared/search'
import LanguageDropdown from '@components/layout/shared/LanguageDropdown'
import ModeDropdown from '@components/layout/shared/ModeDropdown'
import ShortcutsDropdown from '@components/layout/shared/ShortcutsDropdown'
import NotificationsDropdown from '@components/layout/shared/NotificationsDropdown'
import UserDropdown from '@components/layout/shared/UserDropdown'

// Hook Imports
import { useMe } from '@/hooks/useMe'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

type TenantSessionUser = {
  tenantName?: string | null
  tenantSlug?: string | null
}

// Vars
const shortcuts: ShortcutsType[] = [
  {
    url: '/apps/calendar',
    icon: 'ri-calendar-line',
    title: 'Calendar',
    subtitle: 'Appointments'
  },
  {
    url: '/apps/invoice/list',
    icon: 'ri-file-list-3-line',
    title: 'Invoice App',
    subtitle: 'Manage Accounts'
  },
  {
    url: '/apps/user/list',
    icon: 'ri-user-3-line',
    title: 'Users',
    subtitle: 'Manage Users'
  },
  {
    url: '/apps/roles',
    icon: 'ri-computer-line',
    title: 'Role Management',
    subtitle: 'Permissions'
  },
  {
    url: '/dashboards/crm',
    icon: 'ri-pie-chart-2-line',
    title: 'Dashboard',
    subtitle: 'User Dashboard'
  },
  {
    url: '/pages/account-settings',
    icon: 'ri-settings-4-line',
    title: 'Settings',
    subtitle: 'Account Settings'
  }
]

const notifications: NotificationsType[] = [
  {
    avatarImage: '/images/avatars/2.png',
    title: 'Congratulations Flora 🎉',
    subtitle: 'Won the monthly bestseller gold badge',
    time: '1h ago',
    read: false
  },
  {
    title: 'Cecilia Becker',
    subtitle: 'Accepted your connection',
    time: '12h ago',
    read: false
  },
  {
    avatarImage: '/images/avatars/3.png',
    title: 'Bernard Woods',
    subtitle: 'You have new message from Bernard Woods',
    time: 'May 18, 8:26 AM',
    read: true
  },
  {
    avatarIcon: 'ri-bar-chart-line',
    avatarColor: 'info',
    title: 'Monthly report generated',
    subtitle: 'July month financial report is generated',
    time: 'Apr 24, 10:30 AM',
    read: true
  },
  {
    avatarText: 'MG',
    avatarColor: 'success',
    title: 'Application has been approved 🚀',
    subtitle: 'Your Meta Gadgets project application has been approved.',
    time: 'Feb 17, 12:17 PM',
    read: true
  },
  {
    avatarIcon: 'ri-mail-line',
    avatarColor: 'error',
    title: 'New message from Harry',
    subtitle: 'You have new message from Harry',
    time: 'Jan 6, 1:48 PM',
    read: true
  }
]

const NavbarContent = () => {
  const { data: me, isLoading, error } = useMe()
  const { data: session } = useSession()

  const sessionUser = session?.user as TenantSessionUser | undefined

  const settingsTenantName = me?.settings?.branding.displayName?.trim()

  const apiTenantName = me?.tenant.name?.trim()
  const apiTenantSlug = me?.tenant.slug?.trim()

  const sessionTenantName = sessionUser?.tenantName?.trim()
  const sessionTenantSlug = sessionUser?.tenantSlug?.trim()

  const tenantName = settingsTenantName || apiTenantName || sessionTenantName
  const tenantSlug = apiTenantSlug || sessionTenantSlug

  const hasTenant = Boolean(tenantName || tenantSlug)
  const hasTenantError = Boolean(error && !hasTenant)

  const tenantLabel =
    isLoading && !hasTenant
      ? 'Cargando empresa...'
      : tenantName || tenantSlug || 'Empresa no disponible'

  return (
    <div className={classnames(verticalLayoutClasses.navbarContent, 'flex items-center justify-between gap-4 is-full')}>
      <div className='flex items-center gap-[7px]'>
        <NavToggle />
        <NavSearch />

        <div className='hidden md:flex items-center gap-2 mis-2'>
          <Typography variant='body2' color='text.secondary'>
            Empresa:
          </Typography>

          <Chip
            size='small'
            variant='outlined'
            color={hasTenantError ? 'error' : 'default'}
            label={tenantLabel}
          />
        </div>
      </div>

      <div className='flex items-center'>
        <LanguageDropdown />
        <ModeDropdown />
        <ShortcutsDropdown shortcuts={shortcuts} />
        <NotificationsDropdown notifications={notifications} />
        <UserDropdown />
      </div>
    </div>
  )
}

export default NavbarContent
