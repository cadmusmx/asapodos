'use client'

import { useEffect, useState } from 'react'

import { useRouter } from 'next/navigation'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import CircularProgress from '@mui/material/CircularProgress'
import Snackbar from '@mui/material/Snackbar'
import Typography from '@mui/material/Typography'

import { useTenantSettings } from '@/hooks/useTenantSettings'
import BrandingCard from './BrandingCard'

import type { TenantSettings } from '@/types/tenant-settings'

// import type { Dictionary } from '@/utils/getDictionary'

type Props = {
  dictionary: any
}

const TenantSettingsView = ({ dictionary }: Props) => {
  const router = useRouter()
  const { data, settings, isLoading, isSaving, error, saveSettings, reload } = useTenantSettings()

  const [formSettings, setFormSettings] = useState<TenantSettings>(settings)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    setFormSettings(settings)
  }, [settings])

  const tenantName = data?.tenant.name || data?.tenant.slug || 'Tenant actual'

  const t = dictionary.branding ?? {}

  const handleSave = async () => {
    await saveSettings({ settings: formSettings })
    router.refresh()
    setSuccessMessage(t.savedSuccess ?? 'Configuración guardada correctamente.')
  }

  if (isLoading && !data) {
    return (
      <Card>
        <CardContent>
          <Box className='flex items-center gap-3'>
            <CircularProgress size={22} />
            <Typography>{t.loading ?? 'Cargando...'}</Typography>
          </Box>
        </CardContent>
      </Card>
    )
  }

  return (
    <Box className='flex flex-col gap-6'>
      <Card>
        <CardHeader
          title={t.title ?? 'Branding'}
          subheader={t.subtitle ?? `Configura la apariencia visual de ${tenantName}.`}
        />
        <CardContent>
          <Box className='flex flex-col gap-4'>
            {error ? (
              <Alert
                severity='error'
                action={
                  <Button color='inherit' size='small' onClick={reload}>
                    {t.retry ?? 'Reintentar'}
                  </Button>
                }
              >
                {error}
              </Alert>
            ) : null}

            <BrandingCard
              branding={formSettings.branding}
              tenantName={tenantName}
              dictionary={dictionary}
              onChange={branding => setFormSettings(current => ({ ...current, branding }))}
            />
          </Box>
        </CardContent>
      </Card>

      <Box className='flex justify-end gap-3'>
        <Button variant='outlined' disabled={isSaving} onClick={reload}>
          {t.reload ?? 'Recargar'}
        </Button>

        <Button variant='contained' disabled={isSaving} onClick={handleSave}>
          {isSaving ? (t.saving ?? 'Guardando...') : (t.save ?? 'Guardar configuración')}
        </Button>
      </Box>

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={3500}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity='success' variant='filled' onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default TenantSettingsView
