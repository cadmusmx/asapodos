'use client'

import { useCallback, useEffect, useState } from 'react'

import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'

type Contact = {
  contactId: number
  name: string
  phone: string | null
  relationshipId: number | null
  relationshipName: string | null
  esPrioritario: boolean
}

type Relationship = {
  id: number
  name: string
}

type FeedbackState = {
  type: 'success' | 'error'
  message: string
} | null

type FormState = {
  name: string
  phone: string
  relationshipId: string
  esPrioritario: boolean
}

type ContactsTabProps = {
  employeeId: number
  canCreate?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

const emptyForm: FormState = {
  name: '',
  phone: '',
  relationshipId: '',
  esPrioritario: false
}

const ContactsTab = ({ employeeId, canCreate = false, canEdit = false, canDelete = false }: ContactsTabProps) => {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState>(null)

  // Alta / edición
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [dialogError, setDialogError] = useState<string | null>(null)

  // Baja
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadContacts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/human-capital/employees/${employeeId}/contacts`)
      const data = (await response.json().catch(() => null)) as { data?: Contact[]; message?: string } | null

      if (!response.ok || !data?.data) {
        throw new Error(data && data.message ? data.message : 'No se pudieron cargar los contactos.')
      }

      setContacts(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar contactos.')
    } finally {
      setLoading(false)
    }
  }, [employeeId])

  const loadRelationships = useCallback(async () => {
    try {
      const response = await fetch('/api/human-capital/catalogs/contact-relationships')
      const data = (await response.json().catch(() => null)) as { data?: Relationship[] } | null

      if (response.ok && data?.data) setRelationships(data.data)
    } catch {
      // El Select quedará vacío; el form lo bloquea igualmente.
    }
  }, [])

  useEffect(() => {
    loadContacts()
    loadRelationships()
  }, [loadContacts, loadRelationships])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm)
    setDialogError(null)
    setDialogOpen(true)
  }

  const openEdit = (contact: Contact) => {
    setEditingId(contact.contactId)
    setForm({
      name: contact.name,
      phone: contact.phone ?? '',
      relationshipId: contact.relationshipId ? String(contact.relationshipId) : '',
      esPrioritario: contact.esPrioritario
    })
    setDialogError(null)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    if (saving) return
    setDialogOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setDialogError(null)
  }

  const submitDialog = async () => {
    if (!form.name.trim()) {
      setDialogError('El nombre es obligatorio.')

      return
    }

    if (!form.relationshipId) {
      setDialogError('El parentesco es obligatorio.')

      return
    }

    setSaving(true)
    setDialogError(null)

    const body = {
      name: form.name.trim(),
      phone: form.phone.trim() || null,
      relationshipId: Number(form.relationshipId),
      esPrioritario: form.esPrioritario
    }

    try {
      const url = editingId
        ? `/api/human-capital/employees/${employeeId}/contacts/${editingId}`
        : `/api/human-capital/employees/${employeeId}/contacts`

      const response = await fetch(url, {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(data && data.message ? data.message : 'No se pudo guardar el contacto.')
      }

      setDialogOpen(false)
      setEditingId(null)
      setForm(emptyForm)
      setFeedback({ type: 'success', message: editingId ? 'Contacto actualizado.' : 'Contacto agregado.' })

      await loadContacts()
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Error al guardar el contacto.')
    } finally {
      setSaving(false)
    }
  }

  const submitDelete = async () => {
    if (!deleteTarget) return

    const target = deleteTarget

    setDeleting(true)

    try {
      const response = await fetch(`/api/human-capital/employees/${employeeId}/contacts/${target.contactId}`, {
        method: 'DELETE'
      })

      const data = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new Error(data && data.message ? data.message : 'No se pudo eliminar el contacto.')
      }

      setDeleteTarget(null)
      setFeedback({ type: 'success', message: `Contacto "${target.name}" eliminado.` })

      await loadContacts()
    } catch (err) {
      setFeedback({ type: 'error', message: err instanceof Error ? err.message : 'Error al eliminar el contacto.' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Stack spacing={3}>
      {feedback ? (
        <Alert severity={feedback.type} onClose={() => setFeedback(null)}>
          {feedback.message}
        </Alert>
      ) : null}

      {canCreate ? (
        <Stack direction='row' justifyContent='flex-end'>
          <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={openCreate}>
            Agregar contacto
          </Button>
        </Stack>
      ) : null}

      {loading ? (
        <Stack alignItems='center' sx={{ py: 4 }}>
          <CircularProgress />
        </Stack>
      ) : error ? (
        <Alert severity='error'>{error}</Alert>
      ) : contacts.length === 0 ? (
        <Typography variant='body2' color='text.secondary' sx={{ py: 2 }}>
          Sin contactos registrados.
        </Typography>
      ) : (
        <TableContainer component={Paper} variant='outlined'>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Parentesco</TableCell>
                {canEdit || canDelete ? <TableCell align='right'>Acciones</TableCell> : null}
                <TableCell></TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {contacts.map(contact => (
                <TableRow key={contact.contactId} hover>
                  <TableCell>{contact.name}</TableCell>
                  <TableCell>{contact.phone ?? '—'}</TableCell>
                  <TableCell>{contact.relationshipName ?? '—'}</TableCell>
                  {canEdit || canDelete ? (
                    <TableCell align='right'>
                      {canEdit ? (
                        <Tooltip title='Editar'>
                          <IconButton onClick={() => openEdit(contact)}>
                            <i className='ri-pencil-line' />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                      {canDelete ? (
                        <Tooltip title='Eliminar'>
                          <IconButton color='error' onClick={() => setDeleteTarget(contact)}>
                            <i className='ri-delete-bin-line' />
                          </IconButton>
                        </Tooltip>
                      ) : null}
                    </TableCell>
                  ) : null}
                  <TableCell>
                    {contact.esPrioritario ? <Chip label='Prioritario' color='primary' size='small' /> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth='xs' fullWidth>
        <DialogTitle>{editingId ? 'Editar contacto' : 'Agregar contacto'}</DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {dialogError ? <Alert severity='error'>{dialogError}</Alert> : null}

            <TextField
              label='Nombre'
              value={form.name}
              onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
              fullWidth
              required
              disabled={saving}
            />

            <TextField
              label='Teléfono'
              value={form.phone}
              onChange={event => setForm(prev => ({ ...prev, phone: event.target.value }))}
              fullWidth
              disabled={saving}
            />

            <FormControl fullWidth required disabled={saving}>
              <InputLabel id='relationship-label'>Parentesco</InputLabel>
              <Select
                labelId='relationship-label'
                label='Parentesco'
                value={form.relationshipId}
                onChange={event => setForm(prev => ({ ...prev, relationshipId: String(event.target.value) }))}
              >
                {relationships.map(rel => (
                  <MenuItem key={rel.id} value={String(rel.id)}>
                    {rel.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={form.esPrioritario}
                  onChange={event => setForm(prev => ({ ...prev, esPrioritario: event.target.checked }))}
                  disabled={saving}
                />
              }
              label='Contacto prioritario'
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            onClick={submitDialog}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={18} color='inherit' /> : null}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => (deleting ? null : setDeleteTarget(null))}
        maxWidth='xs'
        fullWidth
      >
        <DialogTitle>Eliminar contacto</DialogTitle>

        <DialogContent>
          <Typography variant='body2'>
            ¿Eliminar el contacto <strong>{deleteTarget?.name}</strong>?
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            color='error'
            onClick={submitDelete}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={18} color='inherit' /> : null}
          >
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default ContactsTab
