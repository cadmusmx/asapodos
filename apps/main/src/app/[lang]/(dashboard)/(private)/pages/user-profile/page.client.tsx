'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SyntheticEvent } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid2'
import Snackbar from '@mui/material/Snackbar'
import Tab from '@mui/material/Tab'
import TabContext from '@mui/lab/TabContext'
import TabPanel from '@mui/lab/TabPanel'

import CustomTabList from '@core/components/mui/TabList'

import ProfileHeader from './ProfileHeader'
import ActivityTab from './tabs/ActivityTab'
import EmployeeInfoTab from './tabs/EmployeeInfoTab'
import PersonalInfoTab from './tabs/PersonalInfoTab'
import SecurityTab from './tabs/SecurityTab'

import { useTranslatePage } from '@/contexts/dictionaryContext'

import type { ProfileResponse } from '@/types/profile'

type FeedbackState = { type: 'success' | 'error' | 'info'; message: string } | null

const UserProfileView = () => {
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [activeTab, setActiveTab] = useState('personal')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  })

  const { t } = useTranslatePage()

  const showSuccess = useCallback((message: string) => {
    setSnackbar({ open: true, message, severity: 'success' })
  }, [])

  const showError = useCallback((message: string) => {
    setSnackbar({ open: true, message, severity: 'error' })
  }, [])

  const handleSnackbarClose = () => {
    setSnackbar(s => ({ ...s, open: false }))
  }

  const loadProfile = useCallback(async () => {
    setLoadingProfile(true)
    setProfileError(null)

    try {
      const res = await fetch('/api/profile')
      const data = await res.json().catch(() => null)

      if (!res.ok || !data) throw new Error(data?.message ?? t('userProfile.loadProfileError'))

      setProfile(data)
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : t('userProfile.loadProfileError'))
    } finally {
      setLoadingProfile(false)
    }
  }, [t])

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true)

    try {
      const form = new FormData()

      form.append('file', file)

      const res = await fetch('/api/profile/photo', { method: 'POST', body: form })
      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.success) throw new Error(data?.message ?? t('userProfile.uploadPhotoError'))

      showSuccess(t('userProfile.photoUploadSuccess'))
      await loadProfile()
    } catch (e) {
      showError(e instanceof Error ? e.message : t('userProfile.uploadPhotoError'))
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handlePasswordChanged = (message: string) => {
    showSuccess(message)
  }

  const handlePasswordError = (message: string) => {
    showError(message)
  }

  const handleActivityError = (message: string) => {
    showError(message)
  }

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const handleTabChange = (_event: SyntheticEvent, value: string) => {
    setActiveTab(value)
  }

  if (loadingProfile) {
    return (
      <Box p={5}>
        <Alert severity='info'>{t('userProfile.loadingProfile')}</Alert>
      </Box>
    )
  }

  if (profileError) {
    return (
      <Box p={5}>
        <Alert severity='error'>{profileError}</Alert>
      </Box>
    )
  }

  if (!profile) return null

  return (
    <Box p={{ xs: 3, md: 5 }}>
      <ProfileHeader
        profile={profile}
        uploadingPhoto={uploadingPhoto}
        onPhotoUpload={handlePhotoUpload}
        onPhotoError={showError}
      />

      {feedback && (
        <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ mb: 3 }}>
          {feedback.message}
        </Alert>
      )}

      <TabContext value={activeTab}>
        <Grid container spacing={6}>
          <Grid size={{ xs: 12 }}>
            <CustomTabList onChange={handleTabChange} variant='scrollable' pill='true'>
              <Tab
                label={
                  <Box display='flex' alignItems='center' gap={1}>
                    <i className='ri-user-3-line' />
                    {t('userProfile.tabs.personalInfo')}
                  </Box>
                }
                value='personal'
              />
              <Tab
                label={
                  <Box display='flex' alignItems='center' gap={1}>
                    <i className='ri-team-line' />
                    {t('userProfile.tabs.employeeInfo')}
                  </Box>
                }
                value='employee'
              />
              <Tab
                label={
                  <Box display='flex' alignItems='center' gap={1}>
                    <i className='ri-lock-line' />
                    {t('userProfile.tabs.security')}
                  </Box>
                }
                value='security'
              />
              <Tab
                label={
                  <Box display='flex' alignItems='center' gap={1}>
                    <i className='ri-history-line' />
                    {t('userProfile.tabs.activity')}
                  </Box>
                }
                value='activity'
              />
            </CustomTabList>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TabPanel value='personal' className='p-0'>
              <PersonalInfoTab profile={profile} />
            </TabPanel>

            <TabPanel value='employee' className='p-0'>
              <EmployeeInfoTab employee={profile.employee} />
            </TabPanel>

            <TabPanel value='security' className='p-0'>
              <SecurityTab onPasswordChanged={handlePasswordChanged} onPasswordError={handlePasswordError} />
            </TabPanel>

            <TabPanel value='activity' className='p-0'>
              <ActivityTab onError={handleActivityError} />
            </TabPanel>
          </Grid>
        </Grid>
      </TabContext>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} variant='filled' onClose={handleSnackbarClose}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default UserProfileView
