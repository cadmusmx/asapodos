'use client'

import { useState } from 'react'
import IconButton from '@mui/material/IconButton'
import Badge from '@mui/material/Badge'
import Popper from '@mui/material/Popper'
import Fade from '@mui/material/Fade'
import Paper from '@mui/material/Paper'
import ClickAwayListener from '@mui/material/ClickAwayListener'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

const notifications = [
  { id: 1, title: 'New tenant registered', time: 'Hace 5 minutos', read: false },
  { id: 2, title: 'Tenant suspended', time: 'Hace 1 hora', read: false },
  { id: 3, title: 'System update completed', time: 'Hace 2 horas', read: true }
]

const NotificationsDropdown = () => {
  const [open, setOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null)
  const unreadCount = notifications.filter(n => !n.read).length

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(e.currentTarget)
    setOpen(prev => !prev)
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <>
      <IconButton onClick={handleToggle} className='!text-textPrimary'>
        <Badge color='error' variant='dot' invisible={unreadCount === 0}>
          <i className='ri-notification-2-line' />
        </Badge>
      </IconButton>
      <Popper open={open} transition placement='bottom-end' anchorEl={anchorEl} className='z-[1]'>
        {({ TransitionProps }) => (
          <Fade {...TransitionProps}>
            <Paper className='shadow-lg min-w-[300px]'>
              <ClickAwayListener onClickAway={handleClose}>
                <Box>
                  <Box className='px-4 py-3 border-b border-divider'>
                    <Typography variant='h6'>Notificaciones</Typography>
                  </Box>
                  <Box className='max-h-[300px] overflow-y-auto'>
                    {notifications.length === 0 ? (
                      <Box className='p-4 text-center'>
                        <Typography color='text.secondary'>No hay notificaciones</Typography>
                      </Box>
                    ) : (
                      notifications.map(notif => (
                        <Box
                          key={notif.id}
                          className={`px-4 py-3 border-b border-divider cursor-pointer hover:bg-actionHover ${
                            !notif.read ? 'bg-action-selected' : ''
                          }`}
                          onClick={handleClose}
                        >
                          <Typography variant='body2' fontWeight={notif.read ? 'normal' : 'medium'}>
                            {notif.title}
                          </Typography>
                          <Typography variant='caption' color='text.secondary'>
                            {notif.time}
                          </Typography>
                        </Box>
                      ))
                    )}
                  </Box>
                </Box>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </>
  )
}

export default NotificationsDropdown
