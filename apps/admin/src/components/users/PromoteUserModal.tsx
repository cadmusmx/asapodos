'use client'

import { useState } from 'react'

import { useRouter } from 'next/navigation'

import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Chip from '@mui/material/Chip'

import { toast } from 'react-toastify'

import type { PlatformRole, SearchUserRow } from '@/types/apps/platformUserTypes'

interface PromoteUserModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

const roleOptions: { value: PlatformRole; label: string; description: string }[] = [
  { value: 'super_admin', label: 'Super Admin', description: 'Acceso completo a la plataforma' },
  { value: 'auditor', label: 'Auditor', description: 'Solo lectura de logs de auditoría' }
]

export default function PromoteUserModal({ open, onClose, onSuccess }: PromoteUserModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUserRow[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SearchUserRow | null>(null)
  const [selectedRole, setSelectedRole] = useState<PlatformRole>('auditor')
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    setSearchQuery(value)
    setSelectedUser(null)
    if (searchTimeout) clearTimeout(searchTimeout)

    if (value.length < 2) { setSearchResults([]); 

return }

    setSearchTimeout(setTimeout(async () => {
      setSearchLoading(true)

      try {
        const res = await fetch(`/api/admin/platform-users/search?q=${encodeURIComponent(value)}`)

        if (res.ok) { const data = await res.json();

 setSearchResults(data.users || []) }
      } catch { setSearchResults([]) } finally { setSearchLoading(false) }
    }, 300))
  }

  const handleSelectUser = (user: SearchUserRow) => {
    setSelectedUser(user)
    setSearchQuery(`${user.Usuario} - ${user.Nombre}`)
    setSearchResults([])
  }

  const handleSubmit = async () => {
    if (!selectedUser || !selectedRole) return
    setLoading(true)

    try {
      const res = await fetch('/api/admin/platform-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.UserID, role: selectedRole })
      })

      if (!res.ok) { const result = await res.json();

 throw new Error(result.message?.[0] || 'Failed to assign role') }

      toast.success('Rol asignado exitosamente')
      handleClose()
      onSuccess?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign role')
    } finally { setLoading(false) }
  }

  const handleClose = () => {
    if (!loading) {
      setSearchQuery(''); setSearchResults([]); setSelectedUser(null); setSelectedRole('auditor')
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth='sm' fullWidth PaperProps={{ sx: { p: 4 } }}>
      <DialogTitle sx={{ p: 0, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <i className='ri-user-star-line' style={{ fontSize: '1.5rem', color: 'primary.main' }} />
            Promover Usuario a Plataforma
          </Box>
          <IconButton onClick={handleClose} disabled={loading} size='small'>
            <i className='ri-close-line' />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider sx={{ mb: 2 }} />

      <DialogContent sx={{ p: 1 }}>
        <Typography variant='body2' color='text.secondary' sx={{ mb: 2 }}>
          Busca un usuario existente y asígnale un rol de plataforma.
        </Typography>

        <Box sx={{ mb: 2 }}>
          <TextField
            label='Buscar Usuario'
            placeholder='Escribe nombre, usuario o email...'
            value={searchQuery}
            onChange={handleSearchChange}
            fullWidth
            disabled={loading}
            slotProps={{ input: { endAdornment: searchLoading ? <CircularProgress size={16} /> : null } }}
          />

          {searchResults.length > 0 && !selectedUser && (
            <Box sx={{ mt: 1, maxHeight: 200, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <List dense disablePadding>
                {searchResults.map(user => (
                  <ListItem key={user.UserID} disablePadding divider>
                    <ListItemButton onClick={() => handleSelectUser(user)} disabled={user.hasRole === 1}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {user.Nombre}
                            {user.hasRole === 1 && <Chip label='Ya tiene rol' size='small' color='default' variant='outlined' />}
                          </Box>
                        }
                        secondary={`@${user.Usuario} · ${user.Email || 'sin email'}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && !searchLoading && !selectedUser && (
            <Typography variant='body2' color='text.secondary' sx={{ mt: 1 }}>No se encontraron usuarios</Typography>
          )}
        </Box>

        {selectedUser && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant='caption' color='text.secondary'>Usuario seleccionado</Typography>
            <Typography fontWeight='bold'>{selectedUser.Nombre}</Typography>
            <Typography variant='body2' color='text.secondary'>@{selectedUser.Usuario} · {selectedUser.Email || 'sin email'}</Typography>
          </Box>
        )}

        <TextField select label='Rol de Plataforma' value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as PlatformRole)} fullWidth disabled={loading}>
          {roleOptions.map(option => (
            <MenuItem key={option.value} value={option.value}>
              <Box>
                <Typography variant='body2' fontWeight='bold'>{option.label}</Typography>
                <Typography variant='caption' color='text.secondary'>{option.description}</Typography>
              </Box>
            </MenuItem>
          ))}
        </TextField>
      </DialogContent>

      <DialogActions sx={{ mt: 4, p: 0 }}>
        <Button variant='outlined' onClick={handleClose} disabled={loading}>Cancelar</Button>
        <Button variant='contained' disabled={loading || !selectedUser} onClick={handleSubmit}>
          {loading ? <CircularProgress size={20} color='inherit' /> : 'Asignar Rol'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
