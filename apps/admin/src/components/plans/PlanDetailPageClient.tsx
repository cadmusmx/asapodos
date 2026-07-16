'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Collapse from '@mui/material/Collapse'
import CircularProgress from '@mui/material/CircularProgress'
import SupportChip from './SupportChip'
import type { PlanWithFeatures } from './PlansPageClient'
import type { ModuleCatalog } from '@gaso/shared/types/plan'

interface PlanDetailPageClientProps {
  plan: PlanWithFeatures
}

export default function PlanDetailPageClient({ plan }: PlanDetailPageClientProps) {
  const router = useRouter()
  const [catalog, setCatalog] = useState<ModuleCatalog | null>(null)
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch('/api/admin/modules/catalog')
        if (res.ok) {
          const data = await res.json()
          setCatalog(data.modules)
        }
      } finally {
        setLoadingCatalog(false)
      }
    }
    loadCatalog()
  }, [])

  const toggleExpanded = (modId: number) => {
    setExpanded(prev => ({ ...prev, [modId]: !prev[modId] }))
  }

  const isModuleEnabled = (modId: number) => plan.featuresById.modules[modId] === true
  const isSubmoduleEnabled = (smId: number) => plan.featuresById.submodules[smId] === true

  const enabledModuleCount = Object.keys(plan.featuresById.modules).filter(k => plan.featuresById.modules[Number(k)]).length
  const enabledSubmoduleCount = Object.keys(plan.featuresById.submodules).filter(k => plan.featuresById.submodules[Number(k)]).length

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={() => router.push('/admin/plans')} size='small'>
          <i className='ri-arrow-left-line' />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant='h4' fontWeight='bold'>
              {plan.displayName}
            </Typography>
            <Chip
              label={plan.name.toUpperCase()}
              color='primary'
              size='small'
              variant='outlined'
            />
            {!plan.isActive && (
              <Chip label='Inactivo' color='error' size='small' />
            )}
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>Precio</Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant='h3' fontWeight='bold' color='primary.main'>
                ${plan.monthlyPrice}
                <Typography component='span' variant='body1' color='text.secondary'>
                  /mes
                </Typography>
              </Typography>
              {plan.description && (
                <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>
                  {plan.description}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>Límites del Plan</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Typography variant='body2' color='text.secondary'>Usuarios</Typography>
                  <Typography variant='h6' fontWeight='bold'>
                    {plan.limits.maxUsers == null ? (
                      <Chip label='Ilimitado' color='success' size='small' />
                    ) : plan.limits.maxUsers}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant='body2' color='text.secondary'>Sucursales</Typography>
                  <Typography variant='h6' fontWeight='bold'>
                    {plan.limits.maxBranches == null ? (
                      <Chip label='Ilimitado' color='success' size='small' />
                    ) : plan.limits.maxBranches}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant='body2' color='text.secondary'>Almacenamiento</Typography>
                  <Typography variant='h6' fontWeight='bold'>
                    {plan.limits.storageMb == null ? (
                      <Chip label='Ilimitado' color='success' size='small' />
                    ) : `${plan.limits.storageMb} MB`}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant='h6'>Módulos y Submódulos Habilitados</Typography>
                <Chip
                  label={`${enabledModuleCount} módulos`}
                  color='primary'
                  size='small'
                  variant='outlined'
                />
              </Box>
              <Divider sx={{ mb: 2 }} />

              {loadingCatalog ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : !catalog || catalog.length === 0 ? (
                <Typography variant='body2' color='text.secondary'>
                  No hay módulos disponibles en el catálogo.
                </Typography>
              ) : (
                <List dense disablePadding>
                  {catalog.map(mod => {
                    const modEnabled = isModuleEnabled(mod.idModulo)
                    const isExpanded = expanded[mod.idModulo] ?? false
                    const hasSubmodules = mod.submodules.length > 0

                    return (
                      <Box key={mod.idModulo}>
                        <ListItem
                          disablePadding
                          sx={{ py: 0.5 }}
                          secondaryAction={
                            hasSubmodules ? (
                              <IconButton
                                size='small'
                                onClick={() => toggleExpanded(mod.idModulo)}
                              >
                                <i className={isExpanded ? 'ri-arrow-up-s-line' : 'ri-arrow-down-s-line'} />
                              </IconButton>
                            ) : undefined
                          }
                        >
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            {modEnabled ? (
                              <i className='ri-checkbox-circle-fill' style={{ color: 'var(--mui-palette-success-main)' }} />
                            ) : (
                              <i className='ri-close-circle-fill' style={{ color: 'var(--mui-palette-text-disabled)' }} />
                            )}
                          </ListItemIcon>
                          <ListItemText
                            primary={mod.nombreModulo}
                            primaryTypographyProps={{
                              variant: 'body2',
                              fontWeight: 'medium',
                              color: modEnabled ? 'text.primary' : 'text.disabled'
                            }}
                            onClick={() => hasSubmodules && toggleExpanded(mod.idModulo)}
                            sx={{ cursor: hasSubmodules ? 'pointer' : 'default', py: 0.5 }}
                          />
                        </ListItem>

                        {hasSubmodules && (
                          <Collapse in={isExpanded}>
                            <List disablePadding sx={{ pl: 4 }}>
                              {mod.submodules.map(sm => {
                                const smEnabled = isSubmoduleEnabled(sm.idSubModulo)
                                return (
                                  <ListItem key={sm.idSubModulo} disablePadding sx={{ py: 0.25 }}>
                                    <ListItemIcon sx={{ minWidth: 32 }}>
                                      {smEnabled ? (
                                        <i className='ri-checkbox-circle-fill' style={{ color: 'var(--mui-palette-success-main)', fontSize: 16 }} />
                                      ) : (
                                        <i className='ri-close-circle-fill' style={{ color: 'var(--mui-palette-text-disabled)', fontSize: 16 }} />
                                      )}
                                    </ListItemIcon>
                                    <ListItemText
                                      primary={sm.nombreSubModulo}
                                      primaryTypographyProps={{
                                        variant: 'body2',
                                        color: smEnabled ? 'text.primary' : 'text.disabled'
                                      }}
                                    />
                                  </ListItem>
                                )
                              })}
                            </List>
                          </Collapse>
                        )}
                      </Box>
                    )
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant='h6' gutterBottom>Características Adicionales</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>Reportes Avanzados</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    {plan.hasAdvancedReports ? (
                      <>
                        <i className='ri-checkbox-circle-fill' style={{ color: 'var(--mui-palette-success-main)' }} />
                        <Typography variant='body2'>Incluido</Typography>
                      </>
                    ) : (
                      <>
                        <i className='ri-close-circle-fill' style={{ color: 'var(--mui-palette-text-disabled)' }} />
                        <Typography variant='body2' color='text.disabled'>No incluido</Typography>
                      </>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>Branding Personalizado</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    {plan.hasBranding ? (
                      <>
                        <i className='ri-checkbox-circle-fill' style={{ color: 'var(--mui-palette-success-main)' }} />
                        <Typography variant='body2'>Incluido</Typography>
                      </>
                    ) : (
                      <>
                        <i className='ri-close-circle-fill' style={{ color: 'var(--mui-palette-text-disabled)' }} />
                        <Typography variant='body2' color='text.disabled'>No incluido</Typography>
                      </>
                    )}
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>Nivel de Soporte</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <SupportChip level={plan.supportLevel} />
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant='body2' color='text.secondary'>Orden de Visualización</Typography>
                  <Typography variant='body1' fontWeight='medium'>{plan.sortOrder}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
