'use client'

// React Imports
import { useEffect, useRef } from 'react'
import type { CSSProperties } from 'react'

// Third-party Imports
import styled from '@emotion/styled'

import type { VerticalNavContextProps } from '@menu/contexts/verticalNavContext'

// Component Imports
// import MaterioLogo from '@core/svg/Logo'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'
import { useSettings } from '@core/hooks/useSettings'
import { useColorScheme } from '@mui/material/styles'

type LogoTextProps = {
  isHovered?: VerticalNavContextProps['isHovered']
  isCollapsed?: VerticalNavContextProps['isCollapsed']
  transitionDuration?: VerticalNavContextProps['transitionDuration']
  isBreakpointReached?: VerticalNavContextProps['isBreakpointReached']
  color?: CSSProperties['color']
}

const LogoText = styled.span<LogoTextProps>`
  color: ${({ color }) => color ?? 'var(--mui-palette-text-primary)'};
  font-size: 1.25rem;
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: 0.15px;
  text-transform: uppercase;
  transition: ${({ transitionDuration }) =>
    `margin-inline-start ${transitionDuration}ms ease-in-out, opacity ${transitionDuration}ms ease-in-out`};

  ${({ isHovered, isCollapsed, isBreakpointReached }) => {
    if (isBreakpointReached === undefined) {
      return 'opacity: 1; margin-inline-start: 10px;'
    }

    return !isBreakpointReached && isCollapsed && !isHovered
      ? 'opacity: 0; margin-inline-start: 0;'
      : 'opacity: 1; margin-inline-start: 10px;'
  }}
`

const Logo = ({ color }: { color?: CSSProperties['color'] }) => {
  const logoTextRef = useRef<HTMLSpanElement>(null)

  const { isHovered, transitionDuration, isBreakpointReached } = useVerticalNav()
  const { settings } = useSettings()
  const { mode: muiMode, systemMode: muiSystemMode } = useColorScheme()
  const { layout } = settings
  const isDark = (muiMode === 'system' ? muiSystemMode : muiMode) === 'dark'

  useEffect(() => {
    if (layout !== 'collapsed' || isBreakpointReached === undefined) {
      return
    }

    if (logoTextRef && logoTextRef.current) {
      if (!isBreakpointReached && layout === 'collapsed' && !isHovered) {
        logoTextRef.current?.classList.add('hidden')
      } else {
        logoTextRef.current.classList.remove('hidden')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHovered, layout, isBreakpointReached])

  return (
    <div className='flex items-center min-bs-[24px]'>
      <svg
        width='32px'
        height='32px'
        viewBox='0 0 32 32'
        fill={color ?? (isDark ? 'var(--mui-palette-common-white)' : 'var(--mui-palette-primary-main)')}
      >
        <path d='M 11.230469 0.324219 C 11.0625 0.367188 10.78125 0.582031 10.292969 1.023438 C 9.632812 1.617188 6.917969 4.105469 2.300781 8.332031 C 1.082031 9.445312 0.21875 10.28125 0.164062 10.40625 C 0.0742188 10.585938 0.0625 11.210938 0.0625 15.78125 C 0.0625 19.632812 0.0820312 21.019531 0.136719 21.210938 C 0.21875 21.480469 0.523438 21.8125 1.96875 23.1875 C 3.117188 24.28125 7.425781 28.449219 9.613281 30.59375 C 10.105469 31.074219 10.613281 31.53125 10.738281 31.613281 L 10.96875 31.75 L 16.03125 31.738281 C 20.730469 31.71875 21.113281 31.710938 21.320312 31.605469 C 21.542969 31.492188 22.554688 30.53125 27.0625 26.132812 C 31.25 22.042969 31.9375 21.355469 31.9375 21.242188 C 31.9375 21.1875 31.695312 20.882812 31.394531 20.554688 C 31.101562 20.230469 30.023438 19.054688 29.011719 17.945312 C 27.789062 16.605469 27.101562 15.894531 26.960938 15.835938 C 26.789062 15.761719 25.832031 15.75 21.53125 15.75 C 18.273438 15.75 16.3125 15.773438 16.3125 15.8125 C 16.3125 15.84375 17.207031 16.832031 18.300781 18.007812 C 21.105469 21.039062 21.105469 21.039062 21.15625 21.179688 C 21.179688 21.269531 21.148438 21.375 21.070312 21.488281 C 21.007812 21.582031 19.914062 22.6875 18.636719 23.949219 C 16.898438 25.6875 16.300781 26.25 16.179688 26.25 C 16.070312 26.25 14.8125 25.03125 10.800781 21.011719 C 7.917969 18.136719 5.5625 15.738281 5.5625 15.6875 C 5.5625 15.613281 12.242188 8.898438 15.394531 5.8125 L 16.0625 5.15625 L 18.582031 7.667969 C 20.292969 9.382812 21.167969 10.210938 21.324219 10.28125 C 21.53125 10.363281 22.210938 10.375 26.65625 10.375 C 30.707031 10.375 31.757812 10.355469 31.738281 10.292969 C 31.726562 10.257812 30.648438 9.164062 29.34375 7.875 C 28.039062 6.585938 25.824219 4.398438 24.425781 3.011719 C 22.617188 1.226562 21.800781 0.460938 21.613281 0.375 C 21.355469 0.257812 21.167969 0.25 16.40625 0.257812 C 13.289062 0.261719 11.382812 0.289062 11.230469 0.324219 Z M 11.230469 0.324219 ' />
      </svg>
      <LogoText
        color={color}
        ref={logoTextRef}
        isHovered={isHovered}
        isCollapsed={layout === 'collapsed'}
        transitionDuration={transitionDuration}
        isBreakpointReached={isBreakpointReached}
      >
        {themeConfig.templateName}
      </LogoText>
    </div>
  )
}

export default Logo
