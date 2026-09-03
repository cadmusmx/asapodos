'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid2'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'

import { useTranslatePage } from '@/contexts/dictionaryContext'

import type { ProfileResponse } from '@/types/profile'

type Props = {
  profile: ProfileResponse
}

const PersonalInfoTab = ({ profile }: Props) => {
  const { t } = useTranslatePage()
  const emp = profile.employee

  return (
    <Stack spacing={3}>
      <Card>
        <CardHeader
          title={t('userProfile.personalInfoTab.accountInfo')}
          subheader={t('userProfile.personalInfoTab.accessData')}
          titleTypographyProps={{ variant: 'h6' }}
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant='caption' color='text.secondary' gutterBottom>
                  {t('userProfile.personalInfoTab.fullName')}
                </Typography>
                <Box display='flex' alignItems='center' gap={1}>
                  <Typography variant='body1'>{emp?.fullName ?? profile.nombre ?? '—'}</Typography>
                  <Chip
                    label={t('userProfile.personalInfoTab.readOnly')}
                    size='small'
                    variant='outlined'
                    color='default'
                  />
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant='caption' color='text.secondary' gutterBottom>
                  {t('userProfile.personalInfoTab.username')}
                </Typography>
                <Box display='flex' alignItems='center' gap={1}>
                  <Typography variant='body1'>@{profile.usuario}</Typography>
                  <Chip
                    label={t('userProfile.personalInfoTab.readOnly')}
                    size='small'
                    variant='outlined'
                    color='default'
                  />
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant='caption' color='text.secondary' gutterBottom>
                  {t('userProfile.personalInfoTab.email')}
                </Typography>
                <Box display='flex' alignItems='center' gap={1}>
                  <Typography variant='body1'>{profile.email ?? '—'}</Typography>
                  <Chip
                    label={t('userProfile.personalInfoTab.readOnly')}
                    size='small'
                    variant='outlined'
                    color='default'
                  />
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <Box>
                <Typography variant='caption' color='text.secondary' gutterBottom>
                  {t('userProfile.personalInfoTab.employeeNumber')}
                </Typography>
                <Box display='flex' alignItems='center' gap={1}>
                  <Typography variant='body1'>{emp?.employeeNumber ?? '—'}</Typography>
                  <Chip
                    label={t('userProfile.personalInfoTab.readOnly')}
                    size='small'
                    variant='outlined'
                    color='default'
                  />
                </Box>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default PersonalInfoTab
