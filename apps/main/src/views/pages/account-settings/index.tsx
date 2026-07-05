'use client'

// React Imports
import { useState } from 'react'
import type { SyntheticEvent, ReactElement } from 'react'

// Next Imports
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

// Component Imports
import CustomTabList from '@core/components/mui/TabList'

type AccountSettingsProps = {
  tabContentList: { [key: string]: ReactElement }
}

const tenantSettingsTabValue = 'tenant-settings'

const AccountSettings = ({ tabContentList }: AccountSettingsProps) => {
  // States
  const [activeTab, setActiveTab] = useState('account')

  // Hooks
  const router = useRouter()
  const params = useParams()

  const locale = typeof params.lang === 'string' ? params.lang : 'en'

  const handleChange = (_event: SyntheticEvent, value: string) => {
    if (value === tenantSettingsTabValue) {
      router.push(`/${locale}/administration/tenant-settings`)

      return
    }

    setActiveTab(value)
  }

  return (
    <TabContext value={activeTab}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <CustomTabList onChange={handleChange} variant='scrollable' pill='true'>
            <Tab label='Account' icon={<i className='ri-group-line' />} iconPosition='start' value='account' />
            <Tab label='Security' icon={<i className='ri-lock-unlock-line' />} iconPosition='start' value='security' />
            <Tab
              label='Billing & Plans'
              icon={<i className='ri-bookmark-line' />}
              iconPosition='start'
              value='billing-plans'
            />
            <Tab
              label='Notifications'
              icon={<i className='ri-notification-3-line' />}
              iconPosition='start'
              value='notifications'
            />
            <Tab label='Connections' icon={<i className='ri-link' />} iconPosition='start' value='connections' />
            <Tab label='Testing' icon={<i className='ri-test-tube-line' />} iconPosition='start' value='testing' />
            <Tab
              label='Tenant Settings'
              icon={<i className='ri-building-4-line' />}
              iconPosition='start'
              value={tenantSettingsTabValue}
            />
          </CustomTabList>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TabPanel value={activeTab} className='p-0'>
            {tabContentList[activeTab]}
          </TabPanel>
        </Grid>
      </Grid>
    </TabContext>
  )
}

export default AccountSettings
