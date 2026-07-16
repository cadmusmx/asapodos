'use client'

import { useState } from 'react'

import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'

const DOMAIN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/

function validateDomain(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  const parts = trimmed.split('.')
  if (parts.length < 2) return false
  return DOMAIN_REGEX.test(trimmed)
}

interface TenantFormProps {
  tenantId?: string
  initialData?: {
    companyName: string
    dominio: string
    region: string
  }
  onSuccess?: (tenantId: string) => void
  onCancel?: () => void
}

export default function TenantForm({ tenantId, initialData, onSuccess, onCancel }: TenantFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dominioError, setDominioError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setDominioError(null)

    const formData = new FormData(e.currentTarget)
    const dominio = String(formData.get('dominio') || '').trim()

    if (!validateDomain(dominio)) {
      setDominioError('Ingresa un dominio válido (ej. empresa.com)')
      setLoading(false)
      return
    }

    const data = {
      companyName: formData.get('companyName'),
      dominio,
      region: formData.get('region') || undefined
    }

    try {
      const isEdit = Boolean(tenantId)
      const url = isEdit ? `/api/admin/tenants/${tenantId}` : '/api/admin/tenants'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.message?.[0] || `Failed to ${isEdit ? 'update' : 'create'} tenant`)
      }

      const result = await res.json()
      onSuccess?.(result.tenantId)
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${tenantId ? 'update' : 'create'} tenant`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent>
        <Typography variant='h6' fontWeight='bold' gutterBottom>
          {tenantId ? 'Editar Tenant' : 'Crear Nuevo Tenant'}
        </Typography>

        {error && (
          <Alert severity='error' sx={{ mb: 3 }} role='alert'>
            {error}
          </Alert>
        )}

        <Box
          component='form'
          onSubmit={handleSubmit}
          sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
        >
          <TextField
            name='companyName'
            label='Nombre de la Empresa'
            placeholder='Mi Empresa S.A. de C.V.'
            required
            fullWidth
            defaultValue={initialData?.companyName ?? ''}
            inputProps={{ maxLength: 200 }}
            slotProps={{
              input: {
                'aria-label': 'Nombre de la empresa'
              }
            }}
          />

          <TextField
            name='dominio'
            label='Dominio'
            placeholder='miempresa.com'
            required
            fullWidth
            defaultValue={initialData?.dominio ?? ''}
            error={Boolean(dominioError)}
            helperText={dominioError || 'Dominio principal sin https://'}
            inputProps={{ maxLength: 255 }}
            onChange={() => dominioError && setDominioError(null)}
            slotProps={{
              input: {
                'aria-label': 'Dominio del tenant',
                'aria-describedby': dominioError ? 'dominio-error' : undefined
              }
            }}
          />

          <TextField
            name='region'
            label='Región'
            placeholder='México, USA, etc.'
            fullWidth
            defaultValue={initialData?.region ?? ''}
            slotProps={{
              input: {
                'aria-label': 'Región del tenant'
              }
            }}
          />

          <Stack direction='row' spacing={2} justifyContent='flex-end'>
            <Button
              variant='outlined'
              onClick={onCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type='submit' variant='contained' disabled={loading}>
              {loading ? <CircularProgress size={20} color='inherit' /> : tenantId ? 'Guardar Cambios' : 'Crear Tenant'}
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  )
}
