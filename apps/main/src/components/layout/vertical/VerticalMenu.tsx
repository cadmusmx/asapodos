'use client'

// Next Imports
import { useParams } from 'next/navigation'

// MUI Imports
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'
import { useSession } from 'next-auth/react'

// Type Imports
import type { getDictionary } from '@/utils/getDictionary'
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, SubMenu, MenuItem } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useMe } from '@/hooks/useMe'

// Lib Imports
import { getVisibleErpNavigation, getDictionaryValue } from '@/lib/erp-navigation'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  dictionary: Awaited<ReturnType<typeof getDictionary>>
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
}

type ErpSessionUser = {
  admin?: boolean | null
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='ri-arrow-right-s-line' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ dictionary, scrollMenu }: Props) => {
  // Hooks
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()
  const params = useParams()
  const { data: me, isLoading: isMeLoading } = useMe()
  const { data: session, status } = useSession()

  // Vars
  const { isBreakpointReached, transitionDuration } = verticalNavOptions
  const { lang: locale } = params

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  const sessionUser = session?.user as ErpSessionUser | undefined

  /*
   * Navegación ERP gobernada por RBAC (/api/me).
   * - Grupo visible: tenant activo + RBAC (menuGroups) + admin como red de seguridad.
   * - Ítem visible: el usuario debe tener la vista en me.views (RBAC por vista).
   * - Grupos sin ítems visibles se omiten. menuGroups ausente => fail-closed.
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
    // eslint-disable-next-line lines-around-comment
    /* Custom scrollbar instead of browser scroll, remove if you want browser scroll only */
    <ScrollWrapper
      {...(isBreakpointReached
        ? {
          className: 'bs-full overflow-y-auto overflow-x-hidden',
          onScroll: container => scrollMenu(container, false)
        }
        : {
          options: { wheelPropagation: false, suppressScrollX: true },
          onScrollY: container => scrollMenu(container, true)
        })}
    >
      {/* Vertical Menu */}
      <Menu
        popoutMenuOffset={{ mainAxis: 10 }}
        menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
        renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
        renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-line' /> }}
        menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
      >
        {isNavigationLoading && (
          <MenuItem icon={<i className='text-lg ri-loader-4-line' />}>Cargando navegación...</MenuItem>
        )}

        {modules.map(module =>
          module.flat ? (
            module.items.map(item => (
              <MenuItem key={item.key} href={`/${locale}${item.href}`} icon={<i className={`text-lg ${item.icon}`} />}>
                {getDictionaryValue(dictionary, item.labelKey)}
              </MenuItem>
            ))
          ) : (
            <SubMenu
              key={module.key}
              label={getDictionaryValue(dictionary, module.labelKey)}
              icon={<i className={`text-lg ${module.icon}`} />}
            >
              {module.items.map(item => (
                <MenuItem key={item.key} href={`/${locale}${item.href}`} icon={<i className={`text-lg ${item.icon}`} />}>
                  {getDictionaryValue(dictionary, item.labelKey)}
                </MenuItem>
              ))}
            </SubMenu>
          )
        )}
      </Menu>
    </ScrollWrapper>
  )
}

export default VerticalMenu
