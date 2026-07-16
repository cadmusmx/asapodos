'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';

// MUI Imports
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

// Local Imports
import { usePresetApply } from './usePresetApply';
import PresetViewsGrid from './PresetViewsGrid';
import PresetFooter from './PresetFooter';
import PresetPreviewPanel from './PresetPreviewPanel';

// Type Imports
import type { DepartmentsResponse, FilterableDepartment } from '../types';

type Props = {
  open: boolean;
  onClose: () => void;
};

const PresetApplyContent = ({ onClose }: { onClose: () => void }) => {
  const m = usePresetApply();
  const { setDepartamento } = m;

  const [departments, setDepartments] = useState<FilterableDepartment[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);

  // Departamentos del alcance del actor. Preselecciona el primero (patrón UsersMaster).
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setDeptLoading(true);

      try {
        const res = await fetch('/api/permissions/departments', { signal: controller.signal });

        if (!res.ok) return;

        const json: DepartmentsResponse = await res.json();

        setDepartments(json.departments);

        if (json.departments[0]) setDepartamento(json.departments[0].idDepartamento);
      } catch {
        /* silencioso: sin departamentos el grid queda vacío */
      } finally {
        setDeptLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [setDepartamento]);

  const deptName =
    departments.find(d => d.idDepartamento === m.idDepartamento)?.nombre ??
    (m.idDepartamento !== null ? String(m.idDepartamento) : '—');

  // viewCode -> label, mismo origen que el grid; el preview solo trae viewCode.
  const viewLabels = useMemo(() => Object.fromEntries(m.views.map(v => [v.viewCode, v.label])), [m.views]);

  const puestoName =
    m.idPuesto !== null ? m.puestos.find(p => p.idPuesto === m.idPuesto)?.nombre ?? String(m.idPuesto) : null;

  const perfilName =
    m.idPerfil !== null ? m.perfiles.find(p => p.idPerfil === m.idPerfil)?.nombre ?? String(m.idPerfil) : null;

  const busy = m.previewLoading || m.committing;
  const done = m.applied !== null;

  return (
    <>
      <DialogTitle>Aplicar permisos en bloque</DialogTitle>

      <DialogContent dividers>
        <div className='flex flex-col gap-4'>
          {/* Alcance: departamento + ejes AND independientes puesto/perfil (comodín = "Cualquiera"). */}
          <div className='flex items-start gap-3 flex-wrap'>
            <TextField
              select
              size='small'
              label='Departamento'
              value={m.idDepartamento !== null ? String(m.idDepartamento) : ''}
              onChange={e => setDepartamento(Number(e.target.value))}
              disabled={deptLoading || busy || done}
              className='min-is-[200px]'
            >
              {departments.map(d => (
                <MenuItem key={d.idDepartamento} value={String(d.idDepartamento)}>
                  {d.nombre}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size='small'
              label='Puesto'
              value={m.idPuesto !== null ? String(m.idPuesto) : ''}
              onChange={e => m.setPuesto(e.target.value === '' ? null : Number(e.target.value))}
              disabled={m.facetsLoading || busy || done}
              className='min-is-[160px]'
            >
              <MenuItem value=''>Cualquiera</MenuItem>
              {m.puestos.map(p => (
                <MenuItem key={p.idPuesto} value={String(p.idPuesto)}>
                  {p.nombre}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size='small'
              label='Perfil'
              value={m.idPerfil !== null ? String(m.idPerfil) : ''}
              onChange={e => m.setPerfil(e.target.value === '' ? null : Number(e.target.value))}
              disabled={m.facetsLoading || busy || done}
              className='min-is-[160px]'
            >
              <MenuItem value=''>Cualquiera</MenuItem>
              {m.perfiles.map(p => (
                <MenuItem key={p.idPerfil} value={String(p.idPerfil)}>
                  {p.nombre}
                </MenuItem>
              ))}
            </TextField>
          </div>

          <Divider />

          {/* Vistas del departamento */}
          {m.viewsLoading ? (
            <div className='flex items-center justify-center min-bs-[160px]'>
              <CircularProgress size={28} />
            </div>
          ) : m.viewsError ? (
            <Alert severity='error'>{m.viewsError}</Alert>
          ) : (
            <PresetViewsGrid
              views={m.views}
              workingMasks={m.workingMasks}
              onMaskChange={m.setMask}
              disabled={busy || done}
            />
          )}

          {/* Modo: OR por default; SET es opt-in. */}
          <FormControlLabel
            control={
              <Checkbox
                checked={m.mode === 'SET'}
                onChange={e => m.setMode(e.target.checked ? 'SET' : 'OR')}
                disabled={busy || done}
              />
            }
            label='Sobrescribir permisos existentes'
          />

          {/* Footer dinámico según modo + alcance resuelto */}
          {m.idDepartamento !== null && (
            <PresetFooter mode={m.mode} departamento={deptName} puesto={puestoName} perfil={perfilName} />
          )}

          {/* Errores */}
          {m.error && <Alert severity='error'>{m.error}</Alert>}
          {m.fieldErrors.length > 0 && (
            <Alert severity='error'>
              <div className='flex flex-col'>
                {m.fieldErrors.map((fe, i) => (
                  <Typography key={i} variant='body2'>
                    {fe.field}: {fe.message}
                  </Typography>
                ))}
              </div>
            </Alert>
          )}

          {/* Resultado del commit */}
          {done && m.applied && (
            <Alert severity='success'>
              Aplicado: {m.applied.inserts} nuevos · {m.applied.updates} actualizados · {m.applied.deletes} eliminados.
            </Alert>
          )}

          {/* Resumen de impacto (obligatorio antes de confirmar) */}
          {m.preview && (
            <>
              <Divider />
              {m.isPreviewStale && !done && (
                <Alert severity='info'>La configuración cambió. Vuelve a previsualizar para confirmar.</Alert>
              )}
              <PresetPreviewPanel preview={m.preview} mode={m.mode} labels={viewLabels} />
            </>
          )}
        </div>
      </DialogContent>

      <DialogActions>
        <Button variant='outlined' color='secondary' onClick={onClose} disabled={busy}>
          {done ? 'Cerrar' : 'Cancelar'}
        </Button>

        {done ? (
          <Button variant='contained' color='primary' onClick={m.resetGrants}>
            Aplicar otro
          </Button>
        ) : (
          <>
            <Button
              variant='outlined'
              color='info'
              onClick={m.runPreview}
              disabled={!m.canPreview}
              startIcon={m.previewLoading ? <CircularProgress size={16} color='inherit' /> : undefined}
            >
              Previsualizar
            </Button>
            <Button
              variant='contained'
              color={m.mode === 'SET' ? 'warning' : 'primary'}
              onClick={m.runCommit}
              disabled={!m.canCommit}
              startIcon={m.committing ? <CircularProgress size={16} color='inherit' /> : undefined}
            >
              Aplicar
            </Button>
          </>
        )}
      </DialogActions>
    </>
  );
};

/**
 * El contenido se monta solo con `open` => cada apertura reinicia el hook (alcance, grants, preview, resultado).
 * Sin estado colgado entre sesiones.
 */
const PresetApplyDialog = ({ open, onClose }: Props) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth='md'>
    {open && <PresetApplyContent onClose={onClose} />}
  </Dialog>
);

export default PresetApplyDialog;
