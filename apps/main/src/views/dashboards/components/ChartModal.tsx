'use client'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  t?: (key: string) => string
}

const ChartModal = ({ open, onClose, title, children, t }: Props) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='lg'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          p: 1
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 2 }}>
        <Typography
          component='span'
          variant='subtitle1'
          sx={{ fontWeight: 700, color: 'var(--mui-palette-text-primary)' }}
        >
          {title}
        </Typography>
        <IconButton onClick={onClose} size='small' sx={{ color: 'var(--mui-palette-text-secondary)' }}>
          <i className='ri-close-line' style={{ fontSize: '1.25rem' }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: '16px !important' }}>
        <div style={{ width: '100%', minHeight: 400 }}>{children}</div>
      </DialogContent>
      <DialogActions sx={{ p: '16px 24px !important' }}>
        <Button
          onClick={onClose}
          variant='outlined'
          sx={{
            borderRadius: '10px',
            borderColor: 'var(--mui-palette-divider)',
            color: 'var(--mui-palette-text-secondary)',
            '&:hover': {
              borderColor: 'var(--mui-palette-action-hover)',
              background: 'var(--mui-palette-action-hover)'
            }
          }}
        >
          {t ? t('filters.close') : 'Cerrar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ChartModal
