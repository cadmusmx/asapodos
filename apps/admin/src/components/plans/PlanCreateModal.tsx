'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import ModuleTreeSelector from './ModuleTreeSelector'
import { toast } from 'react-toastify'

interface PlanCreateModalProps {
  open: boolean
  onClose: () => void
}

export default function PlanCreateModal({ open, onClose }: PlanCreateModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [moduleIds, setModuleIds] = useState<number[]>([])
  const [submoduleIds, setSubmoduleIds] = useState<number[]>([])
  const [form, setForm] = useState({
    name: '',
    displayName: '',
    description: '',
    monthlyPrice: '',
    maxUsers: '',
    maxBranches: '',
    storageMb: '',
    supportLevel: 'email',
    hasAdvancedReports: false,
    hasBranding: false
  })

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleModulesChange = (payload: { moduleIds: number[]; submoduleIds: number[] }) => {
    setModuleIds(payload.moduleIds)
    setSubmoduleIds(payload.submoduleIds)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    if (!form.name || !form.displayName || !form.monthlyPrice) {
      toast.error('Los campos nombre, nombre para mostrar y precio son obligatorios')
      setLoading(false)
      return
    }

    const data = {
      name: form.name.toLowerCase().replace(/\s+/g, '_'),
      displayName: form.displayName,
      description: form.description || undefined,
      monthlyPrice: Number(form.monthlyPrice),
      maxUsers: form.maxUsers ? Number(form.maxUsers) : null,
      maxBranches: form.maxBranches ? Number(form.maxBranches) : null,
      storageMb: form.storageMb ? Number(form.storageMb) : null,
      supportLevel: form.supportLevel,
      hasAdvancedReports: form.hasAdvancedReports,
      hasBranding: form.hasBranding,
      moduleIds,
      submoduleIds,
    }

    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (!res.ok) {
        const result = await res.json()
        throw new Error(result.message || 'Error al crear el plan')
      }

      toast.success('Plan creado exitosamente')
      setForm({
        name: '', displayName: '', description: '', monthlyPrice: '',
        maxUsers: '', maxBranches: '', storageMb: '', supportLevel: 'email',
        hasAdvancedReports: false, hasBranding: false
      })
      setModuleIds([])
      setSubmoduleIds([])
      onClose()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear el plan')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth='md' fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        Nuevo Plan
        <IconButton onClick={onClose} size='small'>
          <i className='ri-close-line' />
        </IconButton>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label='Nombre interno'
                value={form.name}
                onChange={handleChange('name')}
                fullWidth
                helperText='Ej: basic, professional, enterprise'
                size='small'
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label='Nombre para mostrar'
                value={form.displayName}
                onChange={handleChange('displayName')}
                fullWidth
                required
                size='small'
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label='Descripción'
                value={form.description}
                onChange={handleChange('description')}
                fullWidth
                multiline
                rows={2}
                size='small'
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label='Precio mensual (USD)'
                value={form.monthlyPrice}
                onChange={handleChange('monthlyPrice')}
                fullWidth
                required
                type='number'
                inputProps={{ min: 0, step: 0.01 }}
                size='small'
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label='Límite de usuarios'
                value={form.maxUsers}
                onChange={handleChange('maxUsers')}
                fullWidth
                type='number'
                inputProps={{ min: 1 }}
                helperText='Vacío = ilimitado'
                size='small'
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label='Límite de sucursales'
                value={form.maxBranches}
                onChange={handleChange('maxBranches')}
                fullWidth
                type='number'
                inputProps={{ min: 1 }}
                helperText='Vacío = ilimitado'
                size='small'
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label='Almacenamiento (MB)'
                value={form.storageMb}
                onChange={handleChange('storageMb')}
                fullWidth
                type='number'
                inputProps={{ min: 1 }}
                helperText='Vacío = ilimitado'
                size='small'
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label='Nivel de soporte'
                value={form.supportLevel}
                onChange={handleChange('supportLevel')}
                fullWidth
                select
                size='small'
              >
                <MenuItem value='email'>Email</MenuItem>
                <MenuItem value='priority'>Prioridad</MenuItem>
                <MenuItem value='dedicated'>Dedicado</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.hasAdvancedReports}
                    onChange={handleChange('hasAdvancedReports')}
                  />
                }
                label='Reportes avanzados'
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.hasBranding}
                    onChange={handleChange('hasBranding')}
                  />
                }
                label='Branding personalizado'
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <ModuleTreeSelector
            selectedModuleIds={moduleIds}
            selectedSubmoduleIds={submoduleIds}
            onChange={handleModulesChange}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type='submit' variant='contained' disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Crear Plan'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
