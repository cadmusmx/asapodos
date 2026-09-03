'use client'

// React Imports
import { useCallback, useEffect, useState } from 'react'

// MUI Imports
import Card from '@mui/material/Card'
import CardHeader from '@mui/material/CardHeader'
import CardContent from '@mui/material/CardContent'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import TextField from '@mui/material/TextField'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'

// Third-party Imports
import { toast } from 'react-toastify'

// Style Imports
import styles from '@core/styles/table.module.css'

// Opción A: el único catálogo gestionable de LM es XDOCK (Cat_LMXdocks).
const BASE = '/api/warehouses/material-logistics/catalogs'
const TIPO = 'xdocks'
const SINGULAR = 'XDOCK'

interface CatalogRow {
  Id: number
  Nombre: string
  TenantID: string | null
  Activo: boolean
  EsGlobal: boolean
}

interface DialogState {
  open: boolean
  mode: 'create' | 'edit'
  id: number | null
  nombre: string
}

const CLOSED_DIALOG: DialogState = { open: false, mode: 'create', id: null, nombre: '' }

interface Props {
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

const MaterialLogisticsCatalogs = ({ canCreate, canEdit, canDelete }: Props) => {
  const [rows, setRows] = useState<CatalogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [dialog, setDialog] = useState<DialogState>(CLOSED_DIALOG)

  // El POST puede chocar con una fila INACTIVA homónima -> 409 + { inactivo }.
  // En vez de error seco, se ofrece reactivar.
  const [reactivar, setReactivar] = useState<{ id: number; nombre: string } | null>(null)

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${BASE}/${TIPO}`, { signal })

      if (res.status === 403) throw new Error('No tienes permiso para ver los catálogos.')
      if (!res.ok) throw new Error('No se pudo cargar el catálogo.')

      const json: { rows: CatalogRow[] } = await res.json()

      setRows(json.rows)
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      setError((e as Error).message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    load(controller.signal)

    return () => controller.abort()
  }, [load])

  const openCreate = () => setDialog({ open: true, mode: 'create', id: null, nombre: '' })
  const openEdit = (row: CatalogRow) => setDialog({ open: true, mode: 'edit', id: row.Id, nombre: row.Nombre })
  const closeDialog = () => setDialog(CLOSED_DIALOG)

  const submitDialog = async () => {
    const nombre = dialog.nombre.trim()

    if (!nombre) {
      toast.error('El nombre es requerido')

      return
    }

    setSaving(true)

    try {
      const isCreate = dialog.mode === 'create'

      const res = await fetch(isCreate ? `${BASE}/${TIPO}` : `${BASE}/${TIPO}/${dialog.id}`, {
        method: isCreate ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      })

      const payload = await res.json().catch(() => ({}))

      // 409 con fila inactiva homónima -> ofrecer reactivar.
      if (res.status === 409 && payload?.inactivo) {
        closeDialog()
        setReactivar(payload.inactivo)

        return
      }

      if (!res.ok) throw new Error(payload?.message ?? 'No se pudo guardar')

      toast.success(isCreate ? `${SINGULAR} creado` : 'Cambios guardados')
      closeDialog()
      await load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // Reactivar = PUT { activo: true } (bit U). Desactivar = DELETE lógico (bit D).
  const setActivo = async (row: CatalogRow, activo: boolean) => {
    setSaving(true)

    try {
      const res = activo
        ? await fetch(`${BASE}/${TIPO}/${row.Id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activo: true }),
        })
        : await fetch(`${BASE}/${TIPO}/${row.Id}`, { method: 'DELETE' })

      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'No se pudo actualizar' }))

        throw new Error(message)
      }

      toast.success(activo ? `${SINGULAR} reactivado` : `${SINGULAR} desactivado`)
      await load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const confirmReactivar = async () => {
    if (!reactivar) return
    const target = reactivar

    setReactivar(null)
    await setActivo({ Id: target.id, Nombre: target.nombre, TenantID: '', Activo: false, EsGlobal: false }, true)
  }

  return (
    <Card>
      <CardHeader
        title='Catálogos · Logística de Material'
        subheader='Centros XDOCK del tenant (los globales son de solo lectura)'
        action={
          canCreate ? (
            <Button variant='contained' onClick={openCreate} disabled={saving}>
              Nuevo XDOCK
            </Button>
          ) : undefined
        }
      />
      <CardContent>
        {error && (
          <Alert severity='error' className='mbe-4'>
            {error}
          </Alert>
        )}

        {loading ? (
          <div className='flex justify-center' style={{ padding: 40 }}>
            <CircularProgress />
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Origen</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className='text-center'>
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  rows.map(row => (
                    <tr key={row.Id} style={{ opacity: row.Activo ? 1 : 0.55 }}>
                      <td>{row.Nombre}</td>
                      <td>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={row.EsGlobal ? 'secondary' : 'info'}
                          label={row.EsGlobal ? 'Global' : 'Propio'}
                        />
                      </td>
                      <td>
                        <Chip
                          size='small'
                          variant='tonal'
                          color={row.Activo ? 'success' : 'secondary'}
                          label={row.Activo ? 'Activo' : 'Inactivo'}
                        />
                      </td>
                      <td>
                        {row.EsGlobal ? (
                          <Tooltip title='Catálogo global: solo lectura'>
                            <span>
                              <IconButton size='small' disabled>
                                <i className='ri-lock-line' />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : (
                          <div className='flex gap-1'>
                            {canEdit && (
                              <Tooltip title='Editar'>
                                <IconButton size='small' onClick={() => openEdit(row)} disabled={saving}>
                                  <i className='ri-edit-line' />
                                </IconButton>
                              </Tooltip>
                            )}
                            {row.Activo
                              ? canDelete && (
                                <Tooltip title='Desactivar'>
                                  <IconButton size='small' color='error' onClick={() => setActivo(row, false)} disabled={saving}>
                                    <i className='ri-forbid-2-line' />
                                  </IconButton>
                                </Tooltip>
                              )
                              : canEdit && (
                                <Tooltip title='Reactivar'>
                                  <IconButton size='small' color='success' onClick={() => setActivo(row, true)} disabled={saving}>
                                    <i className='ri-check-line' />
                                  </IconButton>
                                </Tooltip>
                              )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Alta / edición */}
      <Dialog open={dialog.open} onClose={closeDialog} fullWidth maxWidth='xs'>
        <DialogTitle>{dialog.mode === 'create' ? `Nuevo ${SINGULAR}` : `Editar ${SINGULAR}`}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label='Nombre'
            className='mbs-2'
            value={dialog.nombre}
            onChange={e => setDialog(d => ({ ...d, nombre: e.target.value }))}
            onKeyDown={e => {
              if (e.key === 'Enter' && !saving) submitDialog()
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={closeDialog} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            onClick={submitDialog}
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : undefined}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmación de reactivación (409 con fila inactiva homónima) */}
      <Dialog open={!!reactivar} onClose={() => setReactivar(null)} fullWidth maxWidth='xs'>
        <DialogTitle>Ya existe inactivo</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Ya hay un {SINGULAR} inactivo con el nombre «{reactivar?.nombre}». ¿Quieres reactivarlo en lugar de crear
            uno nuevo?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setReactivar(null)}>
            Cancelar
          </Button>
          <Button variant='contained' onClick={confirmReactivar} disabled={!canEdit}>
            Reactivar
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  )
}

export default MaterialLogisticsCatalogs
