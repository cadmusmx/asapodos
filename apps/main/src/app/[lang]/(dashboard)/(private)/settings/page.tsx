// React Imports
import type { ReactElement } from 'react'

// Next Imports
import dynamic from 'next/dynamic'

// Component Imports
import Settings from '@views/pages/settings'

const TenantSettingsTab = dynamic(() => import('@views/tenant-settings/TenantSettingsView'))
const TestingTab = dynamic(() => import('@views/pages/settings/testing'))

const tabContentList = (): { [key: string]: ReactElement } => ({
  'tenant-settings': <TenantSettingsTab />,
  testing: <TestingTab />
})

const SettingsPage = () => {
  return <Settings tabContentList={tabContentList()} />
}

export default SettingsPage