'use client'

// Third-party Imports
import classnames from 'classnames'

// Hook Imports
import useVerticalNav from '@menu/hooks/useVerticalNav'

// Util Imports
import { verticalLayoutClasses } from '@layouts/utils/layoutClasses'

// Config Imports
import { APP_VERSION } from '@configs/appConfig'

const FooterContent = () => {
  // Hooks
  const { isBreakpointReached } = useVerticalNav()

  return (
    <div
      className={classnames(verticalLayoutClasses.footerContent, 'flex items-center justify-between flex-wrap gap-4')}
    >
      <p className='m-0'>
        <strong>
          Copyright &copy; {new Date().getFullYear()} <a>Grupo Gaso</a>.
        </strong>{' '}
        All rights reserved.
      </p>
      {!isBreakpointReached && (
        <div>
          <b>Version</b> {APP_VERSION}
        </div>
      )}
    </div>
  )
}

export default FooterContent
