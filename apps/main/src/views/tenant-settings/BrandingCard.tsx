'use client'

import { useEffect, useRef, useState } from 'react'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'

import { HexColorPicker } from 'react-colorful'

import type { TenantBrandingSettings } from '@/types/tenant-settings'

// import type { Dictionary } from '@/utils/getDictionary'

const LOGO_ACCEPT = '.png,.jpg,.jpeg,.svg,.webp'
const FAVICON_ACCEPT = '.png,.ico,.svg'
const LOGO_MAX_MB = 5
const FAVICON_MAX_MB = 1

type Props = {
  branding: TenantBrandingSettings
  tenantName: string
  dictionary: any //Dictionary
  onChange: (branding: TenantBrandingSettings) => void
}

const isValidHex = (color: string): boolean => /^#[0-9a-f]{3}$|^#[0-9a-f]{6}$/i.test(color.trim())

const BrandingCard = ({ branding, tenantName, dictionary, onChange }: Props) => {
  const t = dictionary.branding ?? {}

  const [logoUploading, setLogoUploading] = useState(false)
  const [faviconUploading, setFaviconUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [faviconError, setFaviconError] = useState<string | null>(null)
  const [primaryColorInput, setPrimaryColorInput] = useState(branding.primaryColor ?? '')

  useEffect(() => {
    setPrimaryColorInput(branding.primaryColor ?? '')
  }, [branding.primaryColor])

  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  const update = (key: keyof TenantBrandingSettings, value: string | null) => {
    onChange({ ...branding, [key]: value })
  }

  const uploadFile = async (kind: 'logo' | 'favicon', file: File) => {
    const endpoint = kind === 'logo' ? '/api/admin/tenant-settings/logo' : '/api/admin/tenant-settings/favicon'
    const maxMb = kind === 'logo' ? LOGO_MAX_MB : FAVICON_MAX_MB
    const accept = kind === 'logo' ? LOGO_ACCEPT : FAVICON_ACCEPT
    const setError = kind === 'logo' ? setLogoError : setFaviconError
    const setUploading = kind === 'logo' ? setLogoUploading : setFaviconUploading
    const fieldKey = kind === 'logo' ? 'logoUrl' : 'faviconUrl'

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const allowedExts = accept.split(',').map(e => e.trim().toLowerCase())

    if (!allowedExts.includes(ext)) {
      setError(t.invalidFileType ?? `Tipo de archivo no permitido. Solo: ${accept.replace(/\./g, '').toUpperCase()}`)

      return
    }

    if (file.size > maxMb * 1024 * 1024) {
      setError((t.fileTooLarge ?? `El archivo excede ${maxMb} MB.`).replace('{mb}', String(maxMb)))

      return
    }

    setUploading(true)
    setError(null)

    try {
      const form = new FormData()

      form.append('file', file)
      const res = await fetch(endpoint, { method: 'POST', credentials: 'include', body: form })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message ?? t.uploadError ?? 'Error al subir el archivo.')

        return
      }

      update(fieldKey, data.url)
    } catch {
      setError(t.networkError ?? 'Error de red al subir el archivo.')
    } finally {
      setUploading(false)
    }
  }

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (file) uploadFile('logo', file)
    e.target.value = ''
  }

  const handleFaviconFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]

    if (file) uploadFile('favicon', file)
    e.target.value = ''
  }

  const handleColorPickerChange = (color: string) => {
    const hex = color.toLowerCase()

    setPrimaryColorInput(hex)
    update('primaryColor', hex)
  }

  const handleColorInputChange = (value: string) => {
    setPrimaryColorInput(value)
    const trimmed = value.trim()

    if (isValidHex(trimmed)) {
      update('primaryColor', trimmed)
    }
  }

  const handleColorInputBlur = () => {
    if (!isValidHex(primaryColorInput.trim())) {
      const fallback = branding.primaryColor ?? '#0f172a'

      setPrimaryColorInput(fallback)
      update('primaryColor', fallback)
    }
  }

  return (
    <Box className='flex flex-col gap-4'>
      <TextField
        fullWidth
        label={t.visibleName ?? 'Nombre visible'}
        value={branding.displayName}
        onChange={event => update('displayName', event.target.value)}
        placeholder={tenantName}
        helperText={t.visibleNameHint ?? 'Nombre que se muestra en la barra superior y en el título del navegador.'}
      />

      <Box>
        <Typography variant='body2' fontWeight={500} mb={1}>
          {t.logo ?? 'Logo'}
        </Typography>
        <Box display='flex' alignItems='flex-start' gap={3} flexWrap='wrap'>
          <Box position='relative'>
            <Box
              sx={{
                width: 96,
                height: 96,
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                bgcolor: 'action.hover',
                cursor: logoUploading ? 'default' : 'pointer',
                '&:hover': { borderColor: 'primary.main', opacity: logoUploading ? 1 : 0.8 }
              }}
              onClick={() => !logoUploading && logoInputRef.current?.click()}
            >
              {branding.logoUrl ? (
                <img
                  src={branding.logoUrl}
                  alt={t.logo ?? 'Logo'}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={() => update('logoUrl', null)}
                />
              ) : (
                <svg
                  width='60px'
                  height='60px'
                  viewBox='0 0 32 32'
                  fill='var(--mui-palette-text-secondary)'
                >
                  <path d='M 11.230469 0.324219 C 11.0625 0.367188 10.78125 0.582031 10.292969 1.023438 C 9.632812 1.617188 6.917969 4.105469 2.300781 8.332031 C 1.082031 9.445312 0.21875 10.28125 0.164062 10.40625 C 0.0742188 10.585938 0.0625 11.210938 0.0625 15.78125 C 0.0625 19.632812 0.0820312 21.019531 0.136719 21.210938 C 0.21875 21.480469 0.523438 21.8125 1.96875 23.1875 C 3.117188 24.28125 7.425781 28.449219 9.613281 30.59375 C 10.105469 31.074219 10.613281 31.53125 10.738281 31.613281 L 10.96875 31.75 L 16.03125 31.738281 C 20.730469 31.71875 21.113281 31.710938 21.320312 31.605469 C 21.542969 31.492188 22.554688 30.53125 27.0625 26.132812 C 31.25 22.042969 31.9375 21.355469 31.9375 21.242188 C 31.9375 21.1875 31.695312 20.882812 31.394531 20.554688 C 31.101562 20.230469 30.023438 19.054688 29.011719 17.945312 C 27.789062 16.605469 27.101562 15.894531 26.960938 15.835938 C 26.789062 15.761719 25.832031 15.75 21.53125 15.75 C 18.273438 15.75 16.3125 15.773438 16.3125 15.8125 C 16.3125 15.84375 17.207031 16.832031 18.300781 18.007812 C 21.105469 21.039062 21.105469 21.039062 21.15625 21.179688 C 21.179688 21.269531 21.148438 21.375 21.070312 21.488281 C 21.007812 21.582031 19.914062 22.6875 18.636719 23.949219 C 16.898438 25.6875 16.300781 26.25 16.179688 26.25 C 16.070312 26.25 14.8125 25.03125 10.800781 21.011719 C 7.917969 18.136719 5.5625 15.738281 5.5625 15.6875 C 5.5625 15.613281 12.242188 8.898438 15.394531 5.8125 L 16.0625 5.15625 L 18.582031 7.667969 C 20.292969 9.382812 21.167969 10.210938 21.324219 10.28125 C 21.53125 10.363281 22.210938 10.375 26.65625 10.375 C 30.707031 10.375 31.757812 10.355469 31.738281 10.292969 C 31.726562 10.257812 30.648438 9.164062 29.34375 7.875 C 28.039062 6.585938 25.824219 4.398438 24.425781 3.011719 C 22.617188 1.226562 21.800781 0.460938 21.613281 0.375 C 21.355469 0.257812 21.167969 0.25 16.40625 0.257812 C 13.289062 0.261719 11.382812 0.289062 11.230469 0.324219 Z M 11.230469 0.324219 ' />
                </svg>
              )}
              {logoUploading && (
                <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress size={24} sx={{ color: 'white' }} />
                </Box>
              )}
            </Box>
            <input
              ref={logoInputRef}
              type='file'
              accept={LOGO_ACCEPT}
              hidden
              onChange={handleLogoFileChange}
              disabled={logoUploading}
            />
          </Box>
          <Box flex={1}>
            <Typography variant='caption' color='text.secondary'>
              {t.logoHint ?? `PNG, JPG, JPEG, SVG o WebP. Máximo ${LOGO_MAX_MB} MB.`}
            </Typography>
            <Box mt={1} display='flex' gap={1}>
              <Button
                size='small'
                variant='outlined'
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
              >
                {branding.logoUrl ? (t.change ?? 'Cambiar') : (t.upload ?? 'Subir')}
              </Button>
              {branding.logoUrl && (
                <Button size='small' color='error' variant='outlined' onClick={() => update('logoUrl', null)}>
                  {t.remove ?? 'Quitar'}
                </Button>
              )}
            </Box>
          </Box>
        </Box>
        {logoError && (
          <Alert severity='error' sx={{ mt: 1 }} onClose={() => setLogoError(null)}>
            {logoError}
          </Alert>
        )}
      </Box>

      <Box>
        <Typography variant='body2' fontWeight={500} mb={1}>
          {t.favicon ?? 'Favicon'}
        </Typography>
        <Box display='flex' alignItems='flex-start' gap={3} flexWrap='wrap'>
          <Box position='relative'>
            <Box
              sx={{
                width: 64,
                height: 64,
                border: '2px dashed',
                borderColor: 'divider',
                borderRadius: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                bgcolor: 'action.hover',
                cursor: faviconUploading ? 'default' : 'pointer',
                '&:hover': { borderColor: 'primary.main', opacity: faviconUploading ? 1 : 0.8 }
              }}
              onClick={() => !faviconUploading && faviconInputRef.current?.click()}
            >
              {branding.faviconUrl ? (
                <img
                  src={branding.faviconUrl}
                  alt={t.favicon ?? 'Favicon'}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={() => update('faviconUrl', null)}
                />
              ) : (
                <img
                  src='/favicon.ico'
                  alt={t.favicon ?? 'Favicon'}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              )}
              {faviconUploading && (
                <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                </Box>
              )}
            </Box>
            <input
              ref={faviconInputRef}
              type='file'
              accept={FAVICON_ACCEPT}
              hidden
              onChange={handleFaviconFileChange}
              disabled={faviconUploading}
            />
          </Box>
          <Box flex={1}>
            <Typography variant='caption' color='text.secondary'>
              {t.faviconHint ?? `PNG, ICO o SVG. Máximo ${FAVICON_MAX_MB} MB.`}
            </Typography>
            <Box mt={1} display='flex' gap={1}>
              <Button
                size='small'
                variant='outlined'
                onClick={() => faviconInputRef.current?.click()}
                disabled={faviconUploading}
              >
                {branding.faviconUrl ? (t.change ?? 'Cambiar') : (t.upload ?? 'Subir')}
              </Button>
              {branding.faviconUrl && (
                <Button size='small' color='error' variant='outlined' onClick={() => update('faviconUrl', null)}>
                  {t.remove ?? 'Quitar'}
                </Button>
              )}
            </Box>
          </Box>
        </Box>
        {faviconError && (
          <Alert severity='error' sx={{ mt: 1 }} onClose={() => setFaviconError(null)}>
            {faviconError}
          </Alert>
        )}
      </Box>

      <Box>
        <Typography variant='body2' fontWeight={500} mb={1}>
          {t.primaryColor ?? 'Color primario'}
        </Typography>
        <Box display='flex' gap={2} alignItems='flex-start' flexWrap='wrap'>
          <Box sx={{ '& .react-colorful': { width: 200, height: 160 } }}>
            <HexColorPicker
              color={branding.primaryColor ?? '#0f172a'}
              onChange={handleColorPickerChange}
            />
          </Box>
          <Box flex={1} minWidth={160}>
            <TextField
              fullWidth
              label={t.colorHex ?? 'Hex'}
              value={primaryColorInput}
              onChange={e => handleColorInputChange(e.target.value)}
              onBlur={handleColorInputBlur}
              placeholder='#0f172a'
              size='small'
              inputProps={{ maxLength: 7, style: { fontFamily: 'monospace' } }}
              helperText={t.colorHexHint ?? 'Usa formato #RGB o #RRGGBB'}
              error={primaryColorInput.trim() !== '' && !isValidHex(primaryColorInput.trim())}
            />
            {branding.primaryColor && (
              <Box
                mt={1}
                sx={{
                  width: '100%',
                  height: 32,
                  borderRadius: 1,
                  bgcolor: branding.primaryColor,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              />
            )}
          </Box>
        </Box>
      </Box>

      <Box>
        <Typography variant='body2' fontWeight={500} mb={1}>
          {t.typography ?? 'Tipografía'}
        </Typography>
        <Typography variant='caption' color='text.secondary' display='block' mb={2}>
          {t.typographyHint ?? 'Fuente principal usada en toda la aplicación.'}
        </Typography>
        <Box display='flex' gap={2} flexWrap='wrap'>
          <Box
            component='button'
            type='button'
            onClick={() => update('fontFamily', 'Inter')}
            sx={{
              flex: '1 1 140px',
              minWidth: 140,
              maxWidth: 200,
              p: 2,
              border: '2px solid',
              borderColor: (branding.fontFamily === 'Inter' || branding.fontFamily === null) ? 'primary.main' : 'divider',
              borderRadius: 2,
              cursor: 'pointer',
              bgcolor: 'background.paper',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:hover': { borderColor: 'primary.main', boxShadow: 1 }
            }}
          >
            <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: '1.1rem', fontWeight: 600, mb: 0.5 }}>
              Inter
            </Typography>
            <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: '0.75rem', color: 'text.secondary' }}>
              Aa Bb Cc 0-9
            </Typography>
          </Box>
          <Box
            component='button'
            type='button'
            onClick={() => update('fontFamily', 'Geist')}
            sx={{
              flex: '1 1 140px',
              minWidth: 140,
              maxWidth: 200,
              p: 2,
              border: '2px solid',
              borderColor: branding.fontFamily === 'Geist' ? 'primary.main' : 'divider',
              borderRadius: 2,
              cursor: 'pointer',
              bgcolor: 'background.paper',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:hover': { borderColor: 'primary.main', boxShadow: 1 }
            }}
          >
            <Typography sx={{ fontFamily: 'Geist, sans-serif', fontSize: '1.1rem', fontWeight: 600, mb: 0.5 }}>
              Geist
            </Typography>
            <Typography sx={{ fontFamily: 'Geist, sans-serif', fontSize: '0.75rem', color: 'text.secondary' }}>
              Aa Bb Cc 0-9
            </Typography>
          </Box>
          <Box
            component='button'
            type='button'
            onClick={() => update('fontFamily', 'Plus Jakarta Sans')}
            sx={{
              flex: '1 1 140px',
              minWidth: 140,
              maxWidth: 200,
              p: 2,
              border: '2px solid',
              borderColor: branding.fontFamily === 'Plus Jakarta Sans' ? 'primary.main' : 'divider',
              borderRadius: 2,
              cursor: 'pointer',
              bgcolor: 'background.paper',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:hover': { borderColor: 'primary.main', boxShadow: 1 }
            }}
          >
            <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: '1.1rem', fontWeight: 600, mb: 0.5 }}>
              Plus Jakarta Sans
            </Typography>
            <Typography sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: '0.75rem', color: 'text.secondary' }}>
              Aa Bb Cc 0-9
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default BrandingCard
