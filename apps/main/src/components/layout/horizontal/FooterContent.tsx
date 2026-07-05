'use client'

// Third-party Imports
import classnames from 'classnames'

// Hook Imports
import useHorizontalNav from '@menu/hooks/useHorizontalNav'

// Util Imports
import { horizontalLayoutClasses } from '@layouts/utils/layoutClasses'

// Config Imports
import { APP_VERSION } from '@configs/appConfig'

const FooterContent = () => {
  // Hooks
  const { isBreakpointReached } = useHorizontalNav()

  return (
    <div
      className={classnames(horizontalLayoutClasses.footerContent, 'flex items-center justify-between flex-wrap gap-4')}
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
