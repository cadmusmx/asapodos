'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Box from '@mui/material/Box'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import type { PlanDefinition } from '@gaso/shared/types/plan'
import type { PlanFeaturesById, PlanFeature } from '@gaso/shared/types/plan'
import EmptyState from '@/components/shared/EmptyState'
import type { PlanWithFeatures } from './PlansPageClient'

function SupportChip({ level }: { level: string }) {
  const config: Record<string, { color: 'default' | 'info' | 'success'; label: string }> = {
    email: { color: 'default', label: 'Email' },
    priority: { color: 'info', label: 'Prioridad' },
    dedicated: { color: 'success', label: 'Dedicado' }
  }
  const c = config[level] ?? { color: 'default', label: level }
  return <Chip label={c.label} color={c.color} size='small' variant='outlined' />
}

interface PlanTableProps {
  plans: PlanWithFeatures[]
  onEdit: (plan: PlanWithFeatures) => void
  onDeactivate: (plan: PlanWithFeatures) => void
  onActivate: (plan: PlanWithFeatures) => void
}

export default function PlanTable({ plans, onEdit, onDeactivate, onActivate }: PlanTableProps) {
  const router = useRouter()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [menuPlan, setMenuPlan] = useState<PlanWithFeatures | null>(null)

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, plan: PlanWithFeatures) => {
    setAnchorEl(event.currentTarget)
    setMenuPlan(plan)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    setMenuPlan(null)
  }

  const handleEdit = () => {
    if (menuPlan) {
      onEdit(menuPlan)
    }
    handleMenuClose()
  }

  const handleDeactivate = () => {
    if (menuPlan) {
      onDeactivate(menuPlan)
    }
    handleMenuClose()
  }

  const handleActivate = () => {
    if (menuPlan) {
      onActivate(menuPlan)
    }
    handleMenuClose()
  }

  const handleView = () => {
    if (menuPlan) {
      router.push(`/admin/plans/${menuPlan.id}`)
    }
    handleMenuClose()
  }

  const getEnabledModuleCount = (plan: PlanWithFeatures) => {
    return Object.values(plan.featuresById.modules).filter(Boolean).length
  }

  if (plans.length === 0) {
    return (
      <EmptyState
        icon='ri-vip-diamond-line'
        title='No hay planes registrados'
        description='Crea tu primer plan para comenzar'
      />
    )
  }

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Precio mensual</TableCell>
              <TableCell>Usuarios</TableCell>
              <TableCell>Sucursales</TableCell>
              <TableCell>Almacenamiento</TableCell>
              <TableCell>Módulos</TableCell>
              <TableCell>Soporte</TableCell>
              <TableCell>Extras</TableCell>
              <TableCell align='right'>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans.map(plan => {
              const enabledModules = getEnabledModuleCount(plan)

              return (
                <TableRow
                  key={plan.id}
                  hover
                  sx={{ opacity: plan.isActive ? 1 : 0.5 }}
                >
                  <TableCell>
                    <Typography fontWeight='bold'>{plan.displayName}</Typography>
                    <Typography variant='body2' color='text.secondary'>
                      {plan.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight='bold' color='success.main'>
                      ${plan.monthlyPrice.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {plan.limits.maxUsers == null ? (
                      <Typography variant='body2' color='success.main'>Ilimitado</Typography>
                    ) : (
                      <Typography variant='body2'>{plan.limits.maxUsers}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {plan.limits.maxBranches == null ? (
                      <Typography variant='body2' color='success.main'>Ilimitado</Typography>
                    ) : (
                      <Typography variant='body2'>{plan.limits.maxBranches}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {plan.limits.storageMb == null ? (
                      <Typography variant='body2' color='success.main'>Ilimitado</Typography>
                    ) : (
                      <Typography variant='body2'>{plan.limits.storageMb} MB</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`${enabledModules} módulos`}
                      color={enabledModules > 0 ? 'primary' : 'default'}
                      size='small'
                      variant='outlined'
                    />
                  </TableCell>
                  <TableCell>
                    <SupportChip level={plan.supportLevel} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {plan.hasAdvancedReports && (
                        <Chip label='Reports' size='small' color='primary' variant='outlined' />
                      )}
                      {plan.hasBranding && (
                        <Chip label='Branding' size='small' color='primary' variant='outlined' />
                      )}
                      {!plan.hasAdvancedReports && !plan.hasBranding && (
                        <Typography variant='body2' color='text.disabled'>-</Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align='right'>
                    <IconButton
                      size='small'
                      onClick={e => {
                        e.stopPropagation()
                        handleMenuOpen(e, plan)
                      }}
                    >
                      <i className='ri-more-2-line' />
                    </IconButton>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={handleView}>
          <ListItemIcon><i className='ri-eye-line' /></ListItemIcon>
          Ver detalle
        </MenuItem>
        {menuPlan?.isActive && (
          <MenuItem onClick={handleEdit}>
            <ListItemIcon><i className='ri-edit-line' /></ListItemIcon>
            Editar
          </MenuItem>
        )}
        {menuPlan?.isActive ? (
          <MenuItem onClick={handleDeactivate} sx={{ color: 'error.main' }}>
            <ListItemIcon><i className='ri-delete-bin-line' style={{ color: 'inherit' }} /></ListItemIcon>
            Desactivar
          </MenuItem>
        ) : (
          <MenuItem onClick={handleActivate} sx={{ color: 'success.main' }}>
            <ListItemIcon><i className='ri-check-line' style={{ color: 'inherit' }} /></ListItemIcon>
            Activar
          </MenuItem>
        )}
      </Menu>
    </Box>
  )
}
