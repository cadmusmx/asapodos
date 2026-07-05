'use client'

// Next Imports
import { useParams } from 'next/navigation'

// MUI Imports
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import { useSession } from 'next-auth/react'

// Type Imports
import type { getDictionary } from '@/utils/getDictionary'
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import HorizontalNav, { Menu, SubMenu, MenuItem } from '@menu/horizontal-menu'
import VerticalNavContent from './VerticalNavContent'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'
import { useMe } from '@/hooks/useMe'

// Lib Imports
import { getVisibleErpNavigation, getDictionaryValue } from '@/lib/erp-navigation'

// Styled Component Imports
import StyledHorizontalNavExpandIcon from '@menu/styles/horizontal/StyledHorizontalNavExpandIcon'
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuRootStyles from '@core/styles/horizontal/menuRootStyles'
import menuItemStyles from '@core/styles/horizontal/menuItemStyles'
import verticalNavigationCustomStyles from '@core/styles/vertical/navigationCustomStyles'
import verticalMenuItemStyles from '@core/styles/vertical/menuItemStyles'
import verticalMenuSectionStyles from '@core/styles/vertical/menuSectionStyles'

type RenderExpandIconProps = {
  level?: number
}

type RenderVerticalExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type ErpSessionUser = {
  admin?: boolean | null
}

const RenderExpandIcon = ({ level }: RenderExpandIconProps) => (
  <StyledHorizontalNavExpandIcon level={level}>
    <i className='ri-arrow-right-s-line' />
  </StyledHorizontalNavExpandIcon>
)

const RenderVerticalExpandIcon = ({ open, transitionDuration }: RenderVerticalExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='ri-arrow-right-s-line' />
  </StyledVerticalNavExpandIcon>
)

const HorizontalMenu = ({ dictionary }: { dictionary: Awaited<ReturnType<typeof getDictionary>> }) => {
  // Hooks
  const verticalNavOptions = useVerticalNav()
  const theme = useTheme()
  const { settings } = useSettings()
  const params = useParams()
  const { data: me, isLoading: isMeLoading } = useMe()
  const { data: session, status } = useSession()

  // Vars
  const { skin } = settings
  const { transitionDuration } = verticalNavOptions
  const { lang: locale } = params

  const sessionUser = session?.user as ErpSessionUser | undefined

  /*
   * Navegación ERP gobernada por RBAC (/api/me).
   * Mismo doble filtro (grupo/ítem) que el menú vertical, vía getVisibleErpNavigation.
   */
  const isNavigationLoading = isMeLoading && status === 'loading'
  const isAdmin = Boolean(me?.user.admin ?? sessionUser?.admin)

  const modules = getVisibleErpNavigation({
    menuGroups: me?.menuGroups,
    views: me?.views,
    isAdmin,
    tenantModules: me?.settings?.modules,
    isLoading: isNavigationLoading
  })

  return (
    <HorizontalNav
      switchToVertical
      verticalNavContent={VerticalNavContent}
      verticalNavProps={{
        customStyles: verticalNavigationCustomStyles(verticalNavOptions, theme),
        backgroundColor:
          skin === 'bordered' ? 'var(--mui-palette-background-paper)' : 'var(--mui-palette-background-default)'
      }}
    >
      <Menu
        rootStyles={menuRootStyles(theme)}
        renderExpandIcon={({ level }) => <RenderExpandIcon level={level} />}
        renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-line' /> }}
        menuItemStyles={menuItemStyles(theme, 'ri-circle-line')}
        popoutMenuOffset={{
          mainAxis: ({ level }) => (level && level > 0 ? 4 : 16),
          alignmentAxis: 0
        }}
        verticalMenuProps={{
          menuItemStyles: verticalMenuItemStyles(verticalNavOptions, theme),
          renderExpandIcon: ({ open }) => (
            <RenderVerticalExpandIcon open={open} transitionDuration={transitionDuration} />
          ),
          renderExpandedMenuItemIcon: { icon: <i className='ri-circle-line' /> },
          menuSectionStyles: verticalMenuSectionStyles(verticalNavOptions, theme)
        }}
      >
        {isNavigationLoading && (
          <MenuItem icon={<i className='ri-loader-4-line' />}>Cargando navegación...</MenuItem>
        )}

        {modules.map(module =>
          module.flat ? (
            module.items.map(item => (
              <MenuItem key={item.key} href={`/${locale}${item.href}`} icon={<i className={item.icon} />}>
                {getDictionaryValue(dictionary, item.labelKey)}
              </MenuItem>
            ))
          ) : (
            <SubMenu
              key={module.key}
              label={getDictionaryValue(dictionary, module.labelKey)}
              icon={<i className={module.icon} />}
            >
              {module.items.map(item => (
                <MenuItem key={item.key} href={`/${locale}${item.href}`} icon={<i className={item.icon} />}>
                  {getDictionaryValue(dictionary, item.labelKey)}
                </MenuItem>
              ))}
            </SubMenu>
          )
        )}
      </Menu>
    </HorizontalNav>
  )
}

export default HorizontalMenu
