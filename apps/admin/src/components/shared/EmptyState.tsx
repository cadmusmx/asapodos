'use client'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
}

export default function EmptyState({
  icon = 'ri-inbox-line',
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  onSecondaryAction
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        py: 8,
        px: 4,
        textAlign: 'center'
      }}
    >
      <Box
        sx={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 3
        }}
      >
        <i className={icon} style={{ fontSize: '2rem', color: 'text.secondary' }} />
      </Box>

      <Typography variant='h6' fontWeight='bold' gutterBottom>
        {title}
      </Typography>

      {description && (
        <Typography variant='body2' color='text.secondary' sx={{ maxWidth: 360, mb: 3 }}>
          {description}
        </Typography>
      )}

      <Stack direction='row' spacing={2}>
        {actionLabel && (
          actionHref ? (
            <Button variant='contained' href={actionHref}>
              {actionLabel}
            </Button>
          ) : onAction ? (
            <Button variant='contained' onClick={onAction}>
              {actionLabel}
            </Button>
          ) : null
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button variant='outlined' onClick={onSecondaryAction}>
            {secondaryActionLabel}
          </Button>
        )}
      </Stack>
    </Box>
  )
}
