'use client';

// React Imports
import { useCallback, useEffect, useState } from 'react';

// MUI Imports
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

// Third-party Imports
import { toast } from 'react-toastify';

// Style Imports
import styles from '@core/styles/table.module.css';

const BASE = '/api/warehouses/material-validation/catalogs';

const CATALOG_TABS = [
  { key: 'almacenes', label: 'Almacenes', singular: 'almacén' },
  { key: 'proyectos', label: 'Proyectos', singular: 'proyecto' },
  { key: 'tipos-material', label: 'Tipos de material', singular: 'tipo de material' },
] as const;

type CatalogKey = (typeof CATALOG_TABS)[number]['key'];

interface CatalogRow {
  Id: number;
  Nombre: string;
  TenantID: string | null;
  Activo: boolean;
  EsGlobal: boolean;
}

interface DialogState {
  open: boolean;
  mode: 'create' | 'edit';
  id: number | null;
  nombre: string;
}

const CLOSED_DIALOG: DialogState = { open: false, mode: 'create', id: null, nombre: '' };

interface Props {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const MaterialValidationCatalogs = ({ canCreate, canEdit, canDelete }: Props) => {
  const [tab, setTab] = useState<CatalogKey>('almacenes');
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [dialog, setDialog] = useState<DialogState>(CLOSED_DIALOG);

  // Cuando el POST choca con un nombre ya usado por una fila INACTIVA, la API
  // devuelve 409 + { inactivo }. En vez de un error seco, se ofrece reactivar.
  const [reactivar, setReactivar] = useState<{ id: number; nombre: string } | null>(null);

  const current = CATALOG_TABS.find(t => t.key === tab)!;

  const load = useCallback(async (key: CatalogKey, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${BASE}/${key}`, { signal });

      if (res.status === 403) throw new Error('No tienes permiso para ver los catálogos.');
      if (!res.ok) throw new Error('No se pudo cargar el catálogo.');

      const json: { rows: CatalogRow[] } = await res.json();

      setRows(json.rows);
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setError((e as Error).message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    load(tab, controller.signal);

    return () => controller.abort();
  }, [tab, load]);

  const openCreate = () => setDialog({ open: true, mode: 'create', id: null, nombre: '' });
  const openEdit = (row: CatalogRow) => setDialog({ open: true, mode: 'edit', id: row.Id, nombre: row.Nombre });
  const closeDialog = () => setDialog(CLOSED_DIALOG);

  const submitDialog = async () => {
    const nombre = dialog.nombre.trim();

    if (!nombre) {
      toast.error('El nombre es requerido');

      return;
    }

    setSaving(true);

    try {
      const isCreate = dialog.mode === 'create';

      const res = await fetch(isCreate ? `${BASE}/${tab}` : `${BASE}/${tab}/${dialog.id}`, {
        method: isCreate ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre }),
      });

      const payload = await res.json().catch(() => ({}));

      if (res.status === 409 && payload?.inactivo) {
        closeDialog();
        setReactivar(payload.inactivo);

        return;
      }

      if (!res.ok) throw new Error(payload?.message ?? 'No se pudo guardar');

      toast.success(isCreate ? `${current.singular} creado` : 'Cambios guardados');
      closeDialog();
      await load(tab);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // Reactivar = PUT { activo: true } (bit U). Desactivar = DELETE lógico (bit D).
  const setActivo = async (row: CatalogRow, activo: boolean) => {
    setSaving(true);

    try {
      const res = activo
        ? await fetch(`${BASE}/${tab}/${row.Id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activo: true }),
        })
        : await fetch(`${BASE}/${tab}/${row.Id}`, { method: 'DELETE' });

      if (!res.ok) {
        const { message } = await res.json().catch(() => ({ message: 'No se pudo actualizar' }));

        throw new Error(message);
      }

      toast.success(activo ? 'Reactivado' : 'Desactivado');
      await load(tab);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const confirmReactivar = async () => {
    if (!reactivar) return;

    const target = rows.find(r => r.Id === reactivar.id);

    setReactivar(null);
    await setActivo(target ?? ({ Id: reactivar.id } as CatalogRow), true);
  };

  return (
    <Card>
      <CardHeader
        title='Catálogos de Validación de Material'
        subheader='Las filas globales son compartidas por la plataforma y no se pueden modificar.'
        action={
          canCreate ? (
            <Button variant='contained' startIcon={<i className='ri-add-line' />} onClick={openCreate}>
              Nuevo
            </Button>
          ) : null
        }
      />
      <CardContent>
        <Tabs value={tab} onChange={(_, v) => setTab(v as CatalogKey)} className='mbe-4'>
          {CATALOG_TABS.map(t => <Tab key={t.key} value={t.key} label={t.label} />)}
        </Tabs>

        {error && <Alert severity='error' className='mbe-4'>{error}</Alert>}

        {loading ? (
          <div className='flex items-center justify-center min-bs-[200px]'><CircularProgress /></div>
        ) : (
          <div className='overflow-x-auto'>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Origen</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={4} className='text-center'>Sin registros</td></tr>
                ) : (
                  rows.map(row => (
                    <tr key={row.Id} style={{ opacity: row.Activo ? 1 : 0.55 }}>
                      <td>{row.Nombre}</td>
                      <td>
                        <Chip
                          size='small' variant='tonal'
                          color={row.EsGlobal ? 'secondary' : 'info'}
                          label={row.EsGlobal ? 'Global' : 'Propio'}
                        />
                      </td>
                      <td>
                        <Chip
                          size='small' variant='tonal'
                          color={row.Activo ? 'success' : 'secondary'}
                          label={row.Activo ? 'Activo' : 'Inactivo'}
                        />
                      </td>
                      <td>
                        {row.EsGlobal ? (
                          <Tooltip title='Catálogo global: solo lectura'>
                            <span><IconButton size='small' disabled><i className='ri-lock-line' /></IconButton></span>
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
        <DialogTitle>
          {dialog.mode === 'create' ? `Nuevo ${current.singular}` : `Editar ${current.singular}`}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth label='Nombre' className='mbs-2'
            value={dialog.nombre}
            onChange={e => setDialog(d => ({ ...d, nombre: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter' && !saving) submitDialog(); }}
          />
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={closeDialog} disabled={saving}>Cancelar</Button>
          <Button
            variant='contained' onClick={submitDialog} disabled={saving}
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
            Ya hay un {current.singular} inactivo con el nombre «{reactivar?.nombre}». ¿Quieres reactivarlo
            en lugar de crear uno nuevo?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button color='secondary' onClick={() => setReactivar(null)}>Cancelar</Button>
          <Button variant='contained' onClick={confirmReactivar} disabled={!canEdit}>Reactivar</Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
};

export default MaterialValidationCatalogs;
