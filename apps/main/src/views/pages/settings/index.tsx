'use client'

// React Imports
import { useState } from 'react'
import type { SyntheticEvent, ReactElement } from 'react'

// MUI Imports
import Grid from '@mui/material/Grid2'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

// Component Imports
import CustomTabList from '@core/components/mui/TabList'

type SettingsProps = {
  tabContentList: { [key: string]: ReactElement }
}

const Settings = ({ tabContentList }: SettingsProps) => {
  const [activeTab, setActiveTab] = useState('tenant-settings')

  const handleChange = (_event: SyntheticEvent, value: string) => {
    setActiveTab(value)
  }

  return (
    <TabContext value={activeTab}>
      <Grid container spacing={6}>
        <Grid size={{ xs: 12 }}>
          <CustomTabList onChange={handleChange} variant='scrollable' pill='true'>
            <Tab
              label='Tenant Settings'
              icon={<i className='ri-building-4-line' />}
              iconPosition='start'
              value='tenant-settings'
            />
            <Tab label='Testing' icon={<i className='ri-test-tube-line' />} iconPosition='start' value='testing' />
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

export default Settings
