'use client'

import useVerticalNav from '@menu/hooks/useVerticalNav'

const NavToggle = () => {
  const { toggleVerticalNav, isBreakpointReached } = useVerticalNav()

  const handleClick = () => {
    toggleVerticalNav()
  }

  return (
    <>
      {isBreakpointReached && <i className='ri-menu-line cursor-pointer' onClick={handleClick} />}
    </>
  )
}

export default NavToggle