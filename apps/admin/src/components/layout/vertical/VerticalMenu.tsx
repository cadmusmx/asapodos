'use client'

// MUI Imports
import { useTheme } from '@mui/material/styles'

// Third-party Imports
import PerfectScrollbar from 'react-perfect-scrollbar'

// Type Imports
import type { VerticalMenuContextProps } from '@menu/components/vertical-menu/Menu'

// Component Imports
import { Menu, MenuItem } from '@menu/vertical-menu'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Styled Component Imports
import StyledVerticalNavExpandIcon from '@menu/styles/vertical/StyledVerticalNavExpandIcon'

// Style Imports
import menuItemStyles from '@core/styles/vertical/menuItemStyles'
import menuSectionStyles from '@core/styles/vertical/menuSectionStyles'

// Config Imports
import adminNavigation from '@configs/adminNavigation'

type RenderExpandIconProps = {
  open?: boolean
  transitionDuration?: VerticalMenuContextProps['transitionDuration']
}

type Props = {
  scrollMenu: (container: any, isPerfectScrollbar: boolean) => void
}

const RenderExpandIcon = ({ open, transitionDuration }: RenderExpandIconProps) => (
  <StyledVerticalNavExpandIcon open={open} transitionDuration={transitionDuration}>
    <i className='ri-arrow-right-s-line' />
  </StyledVerticalNavExpandIcon>
)

const VerticalMenu = ({ scrollMenu }: Props) => {
  const theme = useTheme()
  const verticalNavOptions = useVerticalNav()

  const { isBreakpointReached, transitionDuration } = verticalNavOptions

  const ScrollWrapper = isBreakpointReached ? 'div' : PerfectScrollbar

  return (
    // <ScrollWrapper
    //   {...(isBreakpointReached
    //     ? {
    //       className: 'bs-full overflow-y-auto overflow-x-hidden',
    //       onScroll: container => scrollMenu(container, false)
    //     }
    //     : {
    //       options: { wheelPropagation: false, suppressScrollX: true },
    //       onScrollY: container => scrollMenu(container, true)
    //     })}
    // >
    <Menu
      popoutMenuOffset={{ mainAxis: 10 }}
      menuItemStyles={menuItemStyles(verticalNavOptions, theme)}
      renderExpandIcon={({ open }) => <RenderExpandIcon open={open} transitionDuration={transitionDuration} />}
      renderExpandedMenuItemIcon={{ icon: <i className='ri-circle-line' /> }}
      menuSectionStyles={menuSectionStyles(verticalNavOptions, theme)}
    >
      {adminNavigation.map((item: any) => (
        <MenuItem
          key={item.id}
          href={item.href}
          icon={item.icon ? <i className={item.icon} /> : undefined}
        >
          {item.label}
        </MenuItem>
      ))}
    </Menu>
    // </ScrollWrapper>
  )
}

export default VerticalMenu
