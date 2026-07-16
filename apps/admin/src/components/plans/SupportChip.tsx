import Chip from '@mui/material/Chip'

const SUPPORT_CONFIG: Record<string, { color: 'default' | 'info' | 'success'; label: string }> = {
  email: { color: 'default', label: 'Email' },
  priority: { color: 'info', label: 'Prioridad' },
  dedicated: { color: 'success', label: 'Dedicado' }
}

export default function SupportChip({ level }: { level: string }) {
  const c = SUPPORT_CONFIG[level] ?? { color: 'default', label: level }
  return <Chip label={c.label} color={c.color} size='small' variant='outlined' />
}
