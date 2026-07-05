'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import type { TransactionLogEntry } from '@gaso/shared'
import { AUDIT_ACTION_LABELS, type AuditActionCode } from '@gaso/shared'
import EmptyState from '@/components/shared/EmptyState'

interface TenantAuditTimelineProps {
  entries: TransactionLogEntry[]
}

const actionColors: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  TEN_CR: 'success',
  TEN_UP: 'info',
  TEN_ACT: 'success',
  TEN_SUSP: 'warning',
  TEN_DEA: 'error'
}

function safeJsonParse(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string' || !value) return null
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return null
  }
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getChangedFields(oldData: Record<string, unknown> | null, newData: Record<string, unknown> | null): Array<{ key: string; oldVal: unknown; newVal: unknown }> {
  if (!oldData && !newData) return []
  const changes: Array<{ key: string; oldVal: unknown; newVal: unknown }> = []
  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})])
  for (const key of allKeys) {
    const oldVal = oldData?.[key]
    const newVal = newData?.[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ key, oldVal, newVal })
    }
  }
  return changes
}

function DiffView({ oldData, newData }: { oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null }) {
  const changes = getChangedFields(oldData, newData)
  if (changes.length === 0) return null

  return (
    <Box
      sx={{
        bgcolor: 'grey.50',
        p: 1.5,
        borderRadius: 1,
        fontSize: '0.75rem',
        fontFamily: 'monospace'
      }}
    >
      {changes.map(({ key, oldVal, newVal }) => (
        <Box key={key} sx={{ mb: 1 }}>
          <Typography variant='caption' color='text.secondary' sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
            {key}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.25 }}>
            {oldVal !== undefined && (
              <Box sx={{ color: 'error.main', textDecoration: oldData ? 'none' : 'line-through' }}>
                <Typography variant='caption' component='span'>- </Typography>
                <Typography variant='caption' component='span'>{String(oldVal ?? '(vacío)')}</Typography>
              </Box>
            )}
            {newVal !== undefined && (
              <Box sx={{ color: 'success.main' }}>
                <Typography variant='caption' component='span'>+ </Typography>
                <Typography variant='caption' component='span'>{String(newVal ?? '(vacío)')}</Typography>
              </Box>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  )
}

export default function TenantAuditTimeline({ entries }: TenantAuditTimelineProps) {
  if (!entries.length) {
    return (
      <EmptyState
        icon='ri-file-history-line'
        title='Sin historial de cambios'
        description='Los cambios en este tenant aparecerán aquí.'
      />
    )
  }

  return (
    <Stack spacing={1.5}>
      {entries.map((entry, index) => {
        const label = AUDIT_ACTION_LABELS[entry.action as AuditActionCode] || entry.action
        const color = actionColors[entry.action] || 'default'
        const oldData = safeJsonParse(entry.oldData)
        const newData = safeJsonParse(entry.newData)
        const key = entry.changedAt ? String(entry.changedAt) : `entry-${index}`

        return (
          <Paper key={key} variant='outlined' sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip
                  label={label}
                  color={color}
                  size='small'
                  variant='outlined'
                />
                <Box>
                  <Typography variant='caption' color='text.secondary'>
                    {entry.changedAt ? formatDate(entry.changedAt) : 'Fecha desconocida'}
                    {entry.appUser && ` • ${entry.appUser}`}
                  </Typography>
                </Box>
              </Box>
              <Typography variant='caption' color='text.secondary' sx={{ fontFamily: 'monospace' }}>
                {entry.action}
              </Typography>
            </Box>

            <DiffView oldData={oldData} newData={newData} />
          </Paper>
        )
      })}
    </Stack>
  )
}
