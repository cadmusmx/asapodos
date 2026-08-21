'use client'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'

import CustomAvatar from '@core/components/mui/Avatar'

import { useTranslatePage } from '@/contexts/dictionaryContext'

import type { ProfileResponse } from '@/types/profile'

type Props = {
  profile: ProfileResponse
  uploadingPhoto: boolean
  onPhotoUpload: (file: File) => void
  onPhotoError: (message: string) => void
}

const MAX_PHOTO_SIZE_MB = 5
const ALLOWED_TYPES = ['image/jpeg', 'image/png']

const ProfileHeader = ({ profile, uploadingPhoto, onPhotoUpload, onPhotoError }: Props) => {
  const { t } = useTranslatePage()
  const emp = profile.employee

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      onPhotoError(t('userProfile.photoUpload.invalidType'))
      e.target.value = ''

      return
    }

    if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
      onPhotoError(t('userProfile.photoUpload.fileTooBig', { mb: MAX_PHOTO_SIZE_MB }))
      e.target.value = ''

      return
    }

    onPhotoUpload(file)
    e.target.value = ''
  }

  const displayName = emp?.fullName ?? profile.nombre ?? '—'

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent sx={{ pt: 4 }}>
        <Box
          display='flex'
          flexDirection={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'center', sm: 'flex-start' }}
          gap={3}
        >
          <Box position='relative'>
            <Box
              component='label'
              sx={{
                display: 'block',
                cursor: uploadingPhoto ? 'default' : 'pointer',
                position: 'relative'
              }}
            >
              <CustomAvatar
                src={profile.photo || '/images/avatars/default.png'}
                alt={displayName}
                size={96}
                skin='light'
                sx={{
                  border: '4px solid var(--mui-palette-background-paper)',
                  boxShadow: 'var(--mui-customShadows-md)',
                  width: 96,
                  height: 96,
                  transition: 'opacity 0.2s',
                  '&:hover': {
                    opacity: uploadingPhoto ? 1 : 0.85
                  }
                }}
              />

              {uploadingPhoto && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(0,0,0,0.45)',
                    borderRadius: '50%',
                    transition: 'opacity 0.2s'
                  }}
                >
                  <CircularProgress size={28} sx={{ color: 'white' }} />
                </Box>
              )}

              {!uploadingPhoto && (
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'rgba(0,0,0,0.45)',
                    borderRadius: '50%',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    '&:hover': { opacity: 1 },
                    '&:focus-within': { opacity: 1 }
                  }}
                >
                  <i className='ri-camera-line' style={{ color: 'white', fontSize: '1.25rem' }} />
                  <Typography
                    variant='caption'
                    sx={{ color: 'white', mt: 0.5, fontWeight: 500, textAlign: 'center', lineHeight: 1.2 }}
                  >
                    {t('userProfile.photoUpload.change')}
                  </Typography>
                </Box>
              )}
              <input
                type='file'
                accept='image/jpeg,image/png'
                hidden
                onChange={handleFileChange}
                aria-label={t('userProfile.photoUpload.changePhoto')}
                disabled={uploadingPhoto}
              />
            </Box>
          </Box>

          <Box flex={1} textAlign={{ xs: 'center', sm: 'left' }}>
            <Typography variant='h5' fontWeight={700}>
              {displayName}
            </Typography>

            <Box
              display='flex'
              flexWrap='wrap'
              gap={1}
              mt={1}
              justifyContent={{ xs: 'center', sm: 'flex-start' }}
              alignItems='center'
            >
              <Typography variant='body2' color='text.secondary'>
                @{profile.usuario}
              </Typography>

              {emp?.employeeNumber && (
                <>
                  <Typography variant='body2' color='text.disabled'>
                    ·
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    No. {emp.employeeNumber}
                  </Typography>
                </>
              )}
            </Box>

            {(emp?.departmentName || emp?.positionName || emp?.regionName) && (
              <Box
                display='flex'
                flexWrap='wrap'
                gap={1}
                mt={1.5}
                justifyContent={{ xs: 'center', sm: 'flex-start' }}
              >
                {emp.departmentName && (
                  <Box
                    px={1.5}
                    py={0.25}
                    sx={{
                      bgcolor: 'var(--mui-palette-primary-lightOpacity)',
                      borderRadius: 1,
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                  >
                    <Typography variant='caption' sx={{ color: 'var(--mui-palette-primary-main)', fontWeight: 500 }}>
                      {emp.departmentName}
                    </Typography>
                  </Box>
                )}
                {emp.positionName && (
                  <Box
                    px={1.5}
                    py={0.25}
                    sx={{
                      bgcolor: 'var(--mui-palette-secondary-lightOpacity)',
                      borderRadius: 1,
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                  >
                    <Typography variant='caption' sx={{ color: 'var(--mui-palette-secondary-main)', fontWeight: 500 }}>
                      {emp.positionName}
                    </Typography>
                  </Box>
                )}
                {emp.regionName && (
                  <Box
                    px={1.5}
                    py={0.25}
                    sx={{
                      bgcolor: 'var(--mui-palette-success-lightOpacity)',
                      borderRadius: 1,
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}
                  >
                    <Typography variant='caption' sx={{ color: 'var(--mui-palette-success-main)', fontWeight: 500 }}>
                      {emp.regionName}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default ProfileHeader
