import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import type { TenantStatus } from '@/services/tenant-service'

interface TenantStatusBadgeProps {
  status: TenantStatus
  locked?: boolean
}

const statusConfig: Record<TenantStatus, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
  ACTIVE: { color: 'success', label: 'Activo' },
  TRIAL: { color: 'info', label: 'Trial' },
  SUSPENDED: { color: 'warning', label: 'Suspendido' },
  INACTIVE: { color: 'error', label: 'Inactivo' }
}

export default function TenantStatusBadge({ status, locked }: TenantStatusBadgeProps) {
  const config = statusConfig[status] || { color: 'default', label: status }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Chip
        label={config.label}
        color={config.color}
        size='small'
        variant='outlined'
        sx={{ fontWeight: 500 }}
      />
      {locked && (
        <Box
          component='span'
          title='Tenant principal'
          sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', ml: 0.5 }}
        >
          <i className='ri-lock-line' style={{ fontSize: '0.875rem' }} />
        </Box>
      )}
    </Box>
  )
}
