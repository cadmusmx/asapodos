import Chip from '@mui/material/Chip'
import type { TenantSubscriptionStatus } from '@gaso/shared/types/plan'

interface SubscriptionStatusBadgeProps {
  status: TenantSubscriptionStatus
}

const statusConfig: Record<TenantSubscriptionStatus, { color: 'success' | 'warning' | 'error' | 'info' | 'default'; label: string }> = {
  ACTIVE: { color: 'success', label: 'Activo' },
  TRIAL: { color: 'info', label: 'Trial' },
  EXPIRED: { color: 'warning', label: 'Expirado' },
  CANCELLED: { color: 'error', label: 'Cancelado' }
}

export default function SubscriptionStatusBadge({ status }: SubscriptionStatusBadgeProps) {
  const config = statusConfig[status] ?? { color: 'default', label: status }

  return (
    <Chip
      label={config.label}
      color={config.color}
      size='small'
      variant='outlined'
      sx={{ fontWeight: 500 }}
    />
  )
}
