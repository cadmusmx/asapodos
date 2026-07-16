'use client'

import { useState, useEffect, useCallback } from 'react'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Checkbox from '@mui/material/Checkbox'
import FormHelperText from '@mui/material/FormHelperText'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Stack from '@mui/material/Stack'
import LinearProgress from '@mui/material/LinearProgress'
import type { ModuleCatalog } from '@gaso/shared/types/plan'

const MODULE_ICONS: Record<string, string> = {
  d_principal: 'ri-dashboard-line',
  almacen: 'ri-community-line',
  capital_humano: 'ri-user-line',
  proyectos: 'ri-briefcase-line',
  administracion: 'ri-settings-line',
  gastos_operacion: 'ri-money-dollar-circle-line',
  cotizaciones: 'ri-file-list-3-line',
  proveedores: 'ri-truck-line',
  flotillas: 'ri-car-line',
}

interface ModuleTreeSelectorProps {
  selectedModuleIds: number[]
  selectedSubmoduleIds: number[]
  onChange: (payload: { moduleIds: number[]; submoduleIds: number[] }) => void
}

export default function ModuleTreeSelector({
  selectedModuleIds,
  selectedSubmoduleIds,
  onChange,
}: ModuleTreeSelectorProps) {
  const [catalog, setCatalog] = useState<ModuleCatalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  const [localModuleIds, setLocalModuleIds] = useState<Set<number>>(new Set())
  const [localSubmoduleIds, setLocalSubmoduleIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    setLocalModuleIds(new Set(selectedModuleIds))
  }, [selectedModuleIds])

  useEffect(() => {
    setLocalSubmoduleIds(new Set(selectedSubmoduleIds))
  }, [selectedSubmoduleIds])

  const fetchCatalog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/modules/catalog')
      if (!res.ok) throw new Error('Error loading module catalog')
      const data = await res.json()
      setCatalog(data.modules)
      const allExpanded: Record<number, boolean> = {}
      for (const mod of data.modules) {
        allExpanded[mod.idModulo] = false
      }
      setExpanded(allExpanded)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading module catalog')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCatalog()
  }, [fetchCatalog])

  const toggleModule = (modId: number, submodIds: number[]) => {
    const newModuleIds = new Set(localModuleIds)
    const newSubmoduleIds = new Set(localSubmoduleIds)

    if (newModuleIds.has(modId)) {
      newModuleIds.delete(modId)
      for (const smId of submodIds) {
        newSubmoduleIds.delete(smId)
      }
    } else {
      newModuleIds.add(modId)
      for (const smId of submodIds) {
        newSubmoduleIds.add(smId)
      }
    }

    setLocalModuleIds(newModuleIds)
    setLocalSubmoduleIds(newSubmoduleIds)
    onChange({ moduleIds: Array.from(newModuleIds), submoduleIds: Array.from(newSubmoduleIds) })
  }

  const toggleSubmodule = (modId: number, smId: number, submodIds: number[]) => {
    const newModuleIds = new Set(localModuleIds)
    const newSubmoduleIds = new Set(localSubmoduleIds)

    if (newSubmoduleIds.has(smId)) {
      newSubmoduleIds.delete(smId)
      newModuleIds.delete(modId)
    } else {
      newSubmoduleIds.add(smId)
      const allSelected = submodIds.every(id => newSubmoduleIds.has(id))
      if (allSelected) {
        newModuleIds.add(modId)
      }
    }

    setLocalModuleIds(newModuleIds)
    setLocalSubmoduleIds(newSubmoduleIds)
    onChange({ moduleIds: Array.from(newModuleIds), submoduleIds: Array.from(newSubmoduleIds) })
  }

  const getModuleState = (modId: number, submodIds: number[]): 'checked' | 'unchecked' | 'indeterminate' => {
    if (submodIds.length === 0) {
      return localModuleIds.has(modId) ? 'checked' : 'unchecked'
    }
    const allSelected = submodIds.every(id => localSubmoduleIds.has(id))
    const someSelected = submodIds.some(id => localSubmoduleIds.has(id))
    if (allSelected) return 'checked'
    if (someSelected) return 'indeterminate'
    return 'unchecked'
  }

  const getEnabledSubmoduleCount = (modId: number, submodIds: number[]) => {
    return submodIds.filter(id => localSubmoduleIds.has(id)).length
  }

  const toggleExpanded = (modId: number) => {
    setExpanded(prev => ({ ...prev, [modId]: !prev[modId] }))
  }

  const selectAll = () => {
    if (!catalog) return
    const allModuleIds: number[] = []
    const allSubmodIds: number[] = []
    for (const mod of catalog) {
      allModuleIds.push(mod.idModulo)
      for (const sm of mod.submodules) {
        allSubmodIds.push(sm.idSubModulo)
      }
    }
    setLocalModuleIds(new Set(allModuleIds))
    setLocalSubmoduleIds(new Set(allSubmodIds))
    onChange({ moduleIds: allModuleIds, submoduleIds: allSubmodIds })
  }

  const clearAll = () => {
    setLocalModuleIds(new Set())
    setLocalSubmoduleIds(new Set())
    onChange({ moduleIds: [], submoduleIds: [] })
  }

  const totalModules = catalog?.length ?? 0
  const enabledModules = catalog?.filter(m => localModuleIds.has(m.idModulo)).length ?? 0
  const totalSubmodules = catalog?.reduce((acc, m) => acc + m.submodules.length, 0) ?? 0
  const enabledSubmodules = localSubmoduleIds.size

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={24} />
      </Box>
    )
  }

  if (error) {
    return <Alert severity='error'>{error}</Alert>
  }

  if (!catalog || catalog.length === 0) {
    return (
      <Alert severity='warning'>
        No hay módulos disponibles. Asegúrate de que la tabla dbo.Cat_Modulos tenga datos.
      </Alert>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant='subtitle2' fontWeight='medium'>
          Módulos y submódulos
        </Typography>
        <Stack direction='row' spacing={1}>
          <Button size='small' variant='outlined' onClick={selectAll}>
            Seleccionar todo
          </Button>
          <Button size='small' variant='outlined' onClick={clearAll}>
            Limpiar
          </Button>
        </Stack>
      </Box>

      <Card variant='outlined' sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant='body2' color='text.secondary'>
                Resumen de selección
              </Typography>
              <Typography variant='h6' fontWeight='bold'>
                {enabledModules} de {totalModules} módulos
                {totalSubmodules > 0 && ` • ${enabledSubmodules} de ${totalSubmodules} submódulos`}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                size='small'
                label={`${enabledModules} módulos`}
                color={enabledModules === totalModules ? 'success' : 'default'}
                variant='outlined'
              />
            </Box>
          </Box>
          {totalModules > 0 && (
            <LinearProgress
              variant='determinate'
              value={(enabledModules / totalModules) * 100}
              sx={{ mt: 1.5, borderRadius: 1 }}
            />
          )}
        </CardContent>
      </Card>

      <Divider sx={{ mb: 2 }} />

      {catalog.map(mod => {
        const submodIds = mod.submodules.map(sm => sm.idSubModulo)
        const moduleState = getModuleState(mod.idModulo, submodIds)
        const isExpanded = expanded[mod.idModulo] ?? false
        const hasSubmodules = mod.submodules.length > 0
        const enabledSmCount = getEnabledSubmoduleCount(mod.idModulo, submodIds)
        const iconClass = MODULE_ICONS[mod.variable] || 'ri-checkbox-circle-line'

        return (
          <Card
            key={mod.idModulo}
            variant='outlined'
            sx={{
              mb: 1.5,
              borderColor: moduleState === 'checked' ? 'primary.main' : undefined,
              borderWidth: moduleState === 'checked' ? 2 : 1,
              transition: 'all 0.2s ease',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5 }}>
              <Checkbox
                checked={moduleState === 'checked'}
                indeterminate={moduleState === 'indeterminate'}
                onChange={() => toggleModule(mod.idModulo, submodIds)}
                size='small'
              />
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: moduleState === 'checked' ? 'primary.main' : 'action.hover',
                  color: moduleState === 'checked' ? 'primary.contrastText' : 'text.secondary',
                  mr: 1.5,
                  transition: 'all 0.2s ease',
                }}
              >
                <i className={iconClass} style={{ fontSize: 18 }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant='body2' fontWeight='medium'>
                  {mod.nombreModulo}
                </Typography>
                {hasSubmodules && (
                  <Typography variant='caption' color='text.secondary'>
                    {mod.submodules.length} submódulo{mod.submodules.length !== 1 ? 's' : ''}
                    {moduleState === 'indeterminate' && (
                      <Chip
                        label={`${enabledSmCount} activo${enabledSmCount !== 1 ? 's' : ''}`}
                        size='small'
                        color='warning'
                        sx={{ ml: 1, height: 16, fontSize: '0.65rem' }}
                      />
                    )}
                  </Typography>
                )}
              </Box>
              {hasSubmodules && (
                <Tooltip title={isExpanded ? 'Colapsar' : 'Expandir'}>
                  <IconButton
                    size='small'
                    onClick={() => toggleExpanded(mod.idModulo)}
                  >
                    <i className={isExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>

            {hasSubmodules && (
              <Collapse in={isExpanded}>
                <Divider />
                <Box sx={{ px: 2, py: 1.5, backgroundColor: 'action.hover' }}>
                  <Stack spacing={0.5}>
                    {mod.submodules.map(sm => {
                      const isSmEnabled = localSubmoduleIds.has(sm.idSubModulo)
                      return (
                        <Box
                          key={sm.idSubModulo}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <Checkbox
                            checked={isSmEnabled}
                            onChange={() => toggleSubmodule(mod.idModulo, sm.idSubModulo, submodIds)}
                            size='small'
                            sx={{ py: 0.25 }}
                          />
                          <Typography
                            variant='body2'
                            color={isSmEnabled ? 'primary.dark' : 'text.primary'}
                            sx={{ flex: 1 }}
                          >
                            {sm.nombreSubModulo}
                          </Typography>
                          {isSmEnabled && (
                            <i className='ri-check-line' style={{ color: 'var(--mui-palette-success-main)', fontSize: 14 }} />
                          )}
                        </Box>
                      )
                    })}
                  </Stack>
                </Box>
              </Collapse>
            )}
          </Card>
        )
      })}

      <FormHelperText sx={{ mt: 2 }}>
        Activa un módulo para habilitar todas sus vistas. También puedes activar submódulos individualmente.
      </FormHelperText>
    </Box>
  )
}
