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
import Tooltip from '@mui/material/Tooltip';
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
  collectChanges,
  hasPendingChanges,
  isProtectedView,
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

// Respuesta del batch: éxito o error de dominio.
type BatchOk = {
  ok: true;
  target: number;
  results: Array<{ viewCode: string; old: number | null; new: number }>;
};
type BatchDomainError = { ok: false; code: string; failedViewCode?: string; message: string };

const chipVisual = (
  state: BitState
): { color: 'default' | 'primary'; variant: 'filled' | 'outlined'; icon?: React.ReactElement } => {
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

const codeToMessage = (code: string, failedViewCode?: string): string => {
  const where = failedViewCode ? ` (${failedViewCode})` : '';

  switch (code) {
    case 'PROTECTED_VIEW':
      return `Esa vista no puede editarse${where}.`;
    case 'INVALID_MASK':
      return `Combinación de permisos inválida${where}.`;
    case 'UNKNOWN_VIEW':
      return `Vista desconocida${where}.`;
    case 'PERMISSION_DENIED':
      return `Permiso denegado${where}.`;
    default:
      return `No se pudo guardar${where}.`;
  }
};

const PermissionsDetail = ({ user, canEdit }: Props) => {
  const [views, setViews] = useState<AssignableView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Máscaras: original (de la última carga/guardado) y editada. viewCode -> mask cruda.
  const [originals, setOriginals] = useState<Record<string, number>>({});
  const [edited, setEdited] = useState<Record<string, number>>({});

  const [saving, setSaving] = useState(false);
  const [failedView, setFailedView] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setViews([]);
      setOriginals({});
      setEdited({});
      setError(null);
      setFailedView(null);

      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      setFailedView(null);

      try {
        const res = await fetch(`/api/permissions/user/${user.idUsuario}`, { signal: controller.signal });

        if (res.status === 403) throw new Error('No tienes permiso para ver los permisos de este usuario.');
        if (res.status === 404) throw new Error('Usuario no encontrado.');
        if (!res.ok) throw new Error('No se pudieron cargar los permisos.');

        const json: UserPermissionsResponse = await res.json();
        const base = Object.fromEntries(json.views.map(v => [v.viewCode, v.currentMask]));

        setViews(json.views);
        setOriginals(base);
        setEdited(base);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message);
        setViews([]);
        setOriginals({});
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

  const dirty = useMemo(() => hasPendingChanges(originals, edited), [originals, edited]);

  const handleToggle = (v: AssignableView, bit: BitKey) => {
    const masks = { currentMask: v.currentMask, ceilingMask: v.ceilingMask, publicMask: v.publicMask };

    if (!canEdit || isProtectedView(v.viewCode) || !isBitEditable(bit, masks)) return;

    setFailedView(null);
    setEdited(prev => ({
      ...prev,
      [v.viewCode]: toggleBit(bit, prev[v.viewCode] ?? v.currentMask, masks)
    }));
  };

  const handleSaveAll = async () => {
    if (!user) return;

    const changes = collectChanges(originals, edited);

    if (changes.length === 0) return;

    setSaving(true);
    setError(null);
    setFailedView(null);

    try {
      const res = await fetch('/api/permissions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetIdUsuario: user.idUsuario, changes })
      });

      const json = (await res.json()) as BatchOk | BatchDomainError;

      if (!res.ok || json.ok === false) {
        // (a) Error de dominio estructurado: marca la vista ofensora.
        if (json && 'code' in json) {
          setFailedView(json.failedViewCode ?? null);
          setError(codeToMessage(json.code, json.failedViewCode));
        } else {
          // (b) Error de forma del HOF: solo message.
          setError((json as { message?: string })?.message ?? 'No se pudieron guardar los cambios.');
        }

        // Rollback total en servidor => la UI conserva lo editado para reintentar.
        return;
      }

      // Éxito: confirma con lo que devolvió el servidor (fuente de verdad).
      const applied = json.results;

      setViews(prev =>
        prev.map(x => {
          const r = applied.find(a => a.viewCode === x.viewCode);

          return r ? { ...x, currentMask: r.new } : x;
        })
      );
      setOriginals(prev => {
        const next = { ...prev };

        for (const r of applied) next[r.viewCode] = r.new;

        return next;
      });
      setEdited(prev => {
        const next = { ...prev };

        for (const r of applied) next[r.viewCode] = r.new;

        return next;
      });
      setToast('Permisos actualizados.');
    } catch {
      setError('No se pudo contactar el servidor.');
    } finally {
      setSaving(false);
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
        action={
          canEdit ? (
            <Tooltip title={dirty ? '' : 'No has realizado cambios'}>
              <span>
                <Button
                  variant='contained'
                  disabled={!dirty || saving}
                  onClick={handleSaveAll}
                  startIcon={saving ? <CircularProgress size={16} color='inherit' /> : undefined}
                >
                  Guardar cambios
                </Button>
              </span>
            </Tooltip>
          ) : undefined
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
              <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />}>
                <Typography className='font-medium capitalize'>{groupName.replace(/_/g, ' ')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <div className='flex flex-col gap-4'>
                  {groupViews.map(v => {
                    const masks = { currentMask: v.currentMask, ceilingMask: v.ceilingMask, publicMask: v.publicMask };
                    const editedMask = edited[v.viewCode] ?? v.currentMask;
                    const bits = visibleBits({ ...masks, currentMask: editedMask });
                    const protectedView = isProtectedView(v.viewCode);
                    const isFailed = failedView === v.viewCode;

                    return (
                      <div
                        key={v.viewCode}
                        className={isFailed ? 'flex items-center justify-between gap-4 flex-wrap p-2 rounded' : 'flex items-center justify-between gap-4 flex-wrap'}
                        style={isFailed ? { outline: '1px solid var(--mui-palette-error-main)' } : undefined}
                      >
                        <div className='flex items-center gap-2'>
                          <Typography color='text.primary'>{v.label}</Typography>
                          {protectedView && (
                            <Tooltip title='Se administra por aprovisionamiento; no editable aquí.'>
                              <Chip size='small' variant='outlined' label='Solo lectura' icon={<i className='ri-lock-line' />} />
                            </Tooltip>
                          )}
                        </div>
                        <div className='flex items-center gap-2'>
                          {bits.map(({ bit, state }) => {
                            const cv = chipVisual(state);
                            const editable = canEdit && !protectedView && isBitEditable(bit, masks);

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
