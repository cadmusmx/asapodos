'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';

// MUI Imports
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Snackbar from '@mui/material/Snackbar';

// Helper Imports
import {
  visibleBits,
  viewHasAccess,
  isBitEditable,
  toggleBit,
  isDirty,
  BIT_LABEL,
  type BitKey,
  type BitState
} from './mask-ui';

// Type Imports
import type { AssignableUser, AssignableView, UserPermissionsResponse } from './types';

type Props = {
  user: AssignableUser | null;
  canEdit: boolean;
};

// Estado visual del chip según el estado del bit y si estamos editando.
const chipVisual = (
  state: BitState
): { color: 'default' | 'primary' | 'success'; variant: 'filled' | 'outlined'; icon?: React.ReactElement } => {
  switch (state) {
    case 'public':
      return { color: 'default', variant: 'filled', icon: <i className='ri-lock-line' /> };
    case 'assigned':
      return { color: 'primary', variant: 'filled' };
    case 'assignable':
    default:
      return { color: 'default', variant: 'outlined' };
  }
};

const PermissionsDetail = ({ user, canEdit }: Props) => {
  const [views, setViews] = useState<AssignableView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Máscara CRUDA editada por vista (viewCode -> mask). Arranca en currentMask.
  const [edited, setEdited] = useState<Record<string, number>>({});
  // Vistas guardándose (viewCode -> true) para deshabilitar su botón.
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setViews([]);
      setEdited({});
      setError(null);

      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/permissions/user/${user.idUsuario}`, { signal: controller.signal });

        if (res.status === 403) throw new Error('No tienes permiso para ver los permisos de este usuario.');
        if (res.status === 404) throw new Error('Usuario no encontrado.');
        if (!res.ok) throw new Error('No se pudieron cargar los permisos.');

        const json: UserPermissionsResponse = await res.json();

        setViews(json.views);
        // Inicializa el estado editable con las máscaras crudas actuales.
        setEdited(Object.fromEntries(json.views.map(v => [v.viewCode, v.currentMask])));
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message);
        setViews([]);
        setEdited({});
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [user]);

  const groups = useMemo(() => {
    const map = new Map<string, AssignableView[]>();

    for (const v of views) {
      const key = v.menuGroup ?? 'otros';

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }

    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [views]);

  const summary = useMemo(() => {
    const withAccess = views.filter(v =>
      viewHasAccess({ currentMask: v.currentMask, ceilingMask: v.ceilingMask, publicMask: v.publicMask })
    ).length;

    return { withAccess, total: views.length };
  }, [views]);

  const handleToggle = (v: AssignableView, bit: BitKey) => {
    const masks = { currentMask: v.currentMask, ceilingMask: v.ceilingMask, publicMask: v.publicMask };

    if (!canEdit || !isBitEditable(bit, masks)) return;

    setEdited(prev => ({
      ...prev,
      [v.viewCode]: toggleBit(bit, prev[v.viewCode] ?? v.currentMask, masks)
    }));
  };

  const handleSave = async (v: AssignableView) => {
    if (!user) return;

    const newMask = edited[v.viewCode] ?? v.currentMask;

    setSaving(prev => ({ ...prev, [v.viewCode]: true }));
    setError(null);

    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetIdUsuario: user.idUsuario, viewCode: v.viewCode, mask: newMask })
      });

      if (!res.ok) {
        const msg =
          res.status === 403
            ? 'Permiso denegado por el servidor.'
            : res.status === 400
              ? 'La combinación de permisos no es válida.'
              : 'No se pudo guardar el cambio.';

        throw new Error(msg);
      }

      const json: { ok: boolean; old: number; new: number } = await res.json();

      // Confirma con lo que el servidor devolvió (fuente de verdad).
      setViews(prev => prev.map(x => (x.viewCode === v.viewCode ? { ...x, currentMask: json.new } : x)));
      setEdited(prev => ({ ...prev, [v.viewCode]: json.new }));
      setToast(`"${v.label}" actualizado.`);
    } catch (e) {
      // Revertir el toggle visual al estado guardado.
      setEdited(prev => ({ ...prev, [v.viewCode]: v.currentMask }));
      setError((e as Error).message);
    } finally {
      setSaving(prev => ({ ...prev, [v.viewCode]: false }));
    }
  };

  if (!user) {
    return (
      <Card className='bs-full'>
        <CardContent>
          <div className='flex items-center justify-center bs-full min-bs-[200px]'>
            <Typography color='text.secondary'>Selecciona un usuario de la lista.</Typography>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='bs-full'>
      <CardHeader
        title={user.nombre}
        subheader={
          <>
            <Typography variant='body2' color='text.secondary'>
              Departamento: {user.departamento ?? user.idDepartamento ?? '—'}
            </Typography>
            {!loading && !error && (
              <Typography variant='body2' color='text.secondary'>
                {summary.withAccess} de {summary.total} vistas con acceso
              </Typography>
            )}
            {/* Paso 5b: aquí irá "Reglas aplicadas: ..." */}
          </>
        }
      />
      <Divider />

      <CardContent>
        {loading && (
          <div className='flex items-center justify-center min-bs-[160px]'>
            <CircularProgress size={28} />
          </div>
        )}

        {error && (
          <Alert severity='error' className='mbe-4'>
            {error}
          </Alert>
        )}

        {!loading && !error && views.length === 0 && (
          <Typography color='text.secondary'>Este usuario no tiene vistas asignables en su departamento.</Typography>
        )}

        {!loading &&
          !error &&
          groups.map(([groupName, groupViews]) => (
            <Accordion key={groupName}>
              <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />} >
                <Typography className='font-medium capitalize'>{groupName.replace(/_/g, ' ')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <div className='flex flex-col gap-4'>
                  {groupViews.map(v => {
                    const masks = { currentMask: v.currentMask, ceilingMask: v.ceilingMask, publicMask: v.publicMask };
                    const editedMask = edited[v.viewCode] ?? v.currentMask;
                    // Bits a pintar según la máscara EDITADA (refleja los toggles en vivo).
                    const bits = visibleBits({ ...masks, currentMask: editedMask });
                    const dirty = isDirty(v.currentMask, editedMask);
                    const isSaving = saving[v.viewCode] ?? false;

                    return (
                      <div key={v.viewCode} className='flex items-center justify-between gap-4 flex-wrap'>
                        <Typography color='text.primary'>{v.label}</Typography>
                        <div className='flex items-center gap-2'>
                          {bits.map(({ bit, state }) => {
                            const cv = chipVisual(state);
                            const editable = canEdit && isBitEditable(bit, masks);

                            return (
                              <Chip
                                key={bit}
                                size='small'
                                label={BIT_LABEL[bit]}
                                color={cv.color}
                                variant={cv.variant}
                                icon={cv.icon}
                                onClick={editable ? () => handleToggle(v, bit) : undefined}
                                className={editable ? 'cursor-pointer' : undefined}
                              />
                            );
                          })}

                          {canEdit && dirty && (
                            <Button
                              size='small'
                              variant='contained'
                              disabled={isSaving}
                              onClick={() => handleSave(v)}
                              startIcon={isSaving ? <CircularProgress size={14} color='inherit' /> : undefined}
                            >
                              Guardar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionDetails>
            </Accordion>
          ))}
      </CardContent>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Card>
  );
};

export default PermissionsDetail;
