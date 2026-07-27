'use client'

import { FontAwesomeIcon, FontAwesomeIconProps } from '@fortawesome/react-fontawesome'
import { faUsers, faUserCheck, faUserSlash, faUserPlus, faUserMinus, faBuilding, faChartLine, faMapLocationDot, faBriefcase, faClockRotateLeft, faVenusMars, faPeopleRoof } from '@fortawesome/free-solid-svg-icons'

const iconMap: Record<string, typeof faUsers> = {
  'fa-solid fa-users': faUsers,
  'fa-solid fa-user-check': faUserCheck,
  'fa-solid fa-user-slash': faUserSlash,
  'fa-solid fa-user-plus': faUserPlus,
  'fa-solid fa-user-minus': faUserMinus,
  'fa-solid fa-building': faBuilding,
  'fa-solid fa-chart-line': faChartLine,
  'fa-solid fa-map-location-dot': faMapLocationDot,
  'fa-solid fa-briefcase': faBriefcase,
  'fa-solid fa-clock-rotate-left': faClockRotateLeft,
  'fa-solid fa-venus-mars': faVenusMars,
  'fa-solid fa-people-roof': faPeopleRoof
}

type Props = {
  icon: string
  className?: string
  style?: FontAwesomeIconProps['style']
}

const FontAwesomeIconComponent = ({ icon, className, style }: Props) => {
  const iconDefinition = iconMap[icon] || faUsers

  return <FontAwesomeIcon icon={iconDefinition} className={className} style={style} />
}

export default FontAwesomeIconComponent
