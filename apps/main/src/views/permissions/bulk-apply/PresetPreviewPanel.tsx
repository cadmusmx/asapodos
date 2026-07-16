'use client';

// MUI Imports
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';

// Type Imports
import type { ApplyMode, ApplyPreview, PreviewPerUserRow } from './types';

type Props = {
  preview: ApplyPreview;
  mode: ApplyMode;

  /** viewCode -> label (de m.views, mismo origen que el grid). Fallback: el propio code. */
  labels?: Record<string, string>;
};

const Stat = ({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) => (
  <Box>
    <Typography variant='h5' color={danger && value > 0 ? 'error.main' : 'text.primary'}>
      {value}
    </Typography>
    <Typography variant='body2' color='text.secondary'>
      {label}
    </Typography>
  </Box>
);

// Máscaras ya vienen como strings ("-", "R|W"): se pintan directo.
const MaskFlow = ({ current, nuevo }: { current: string; nuevo: string }) => (
  <span className='flex items-center gap-1'>
    <code>{current}</code>
    <i className='ri-arrow-right-line text-textSecondary' />
    <code>{nuevo}</code>
  </span>
);

const UserId = ({ id }: { id: number }) => (
  <Typography component='span' variant='caption' color='text.secondary'>
    #{id}
  </Typography>
);

const losesSomething = (u: PreviewPerUserRow) => u.changes.some(c => c.removedMask !== null);

const PresetPreviewPanel = ({ preview, mode, labels }: Props) => {
  const { totals, perView, perUser } = preview;

  const viewLabel = (code: string) => labels?.[code] ?? code;

  // Solo en SET puede haber pérdidas; se listan aparte y primero (parte crítica).
  const losers = mode === 'SET' ? perUser.filter(losesSomething) : [];

  return (
    <div className='flex flex-col gap-4'>
      {/* Radio de impacto: usersInScope como número héroe (la lección de los 72). */}
      <Box className='flex items-end gap-6 flex-wrap'>
        <Box>
          <Typography variant='h3' color='primary.main'>
            {totals.usersInScope}
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            usuarios en alcance
          </Typography>
        </Box>
        <Stat label='con cambios' value={totals.usersWithWrites} />
        <Stat label='escrituras' value={totals.writes} />
        <Stat label='pierden permisos' value={totals.removals} danger />
      </Box>

      {totals.removals > 0 && (
        <Alert severity='warning'>
          {totals.removals === 1
            ? '1 usuario perderá permisos con esta aplicación.'
            : `${totals.removals} usuarios perderán permisos con esta aplicación.`}
        </Alert>
      )}

      {/* Qué se escribe por vista. */}
      <div>
        <Typography variant='subtitle2' className='mbe-2'>
          Por vista
        </Typography>
        <div className='flex flex-col gap-1'>
          {perView.map(v => (
            <div key={v.viewCode} className='flex items-center justify-between gap-2 flex-wrap'>
              <span className='flex items-center gap-2'>
                <Typography color='text.primary'>{viewLabel(v.viewCode)}</Typography>
                <Chip size='small' variant='outlined' label={v.grantedMask} />
              </span>
              <Typography variant='body2' color='text.secondary'>
                {v.writes} escrituras · {v.removals} pierden · {v.unchanged} sin cambio
              </Typography>
            </div>
          ))}
        </div>
      </div>

      {/* Quién pierde qué (SET): destacado y arriba — se perdería entre 72 filas. */}
      {losers.length > 0 && (
        <div>
          <Typography variant='subtitle2' color='error.main' className='mbe-2'>
            Pierden permisos
          </Typography>
          <div className='flex flex-col gap-2 overflow-auto' style={{ maxHeight: 200 }}>
            {losers.map(u => (
              <div key={u.idUsuario} className='flex flex-col'>
                <Typography variant='body2' color='text.primary'>
                  {u.nombre} <UserId id={u.idUsuario} />
                </Typography>
                {u.changes
                  .filter(c => c.removedMask !== null)
                  .map(c => (
                    <span key={c.viewCode} className='flex items-center gap-2 pis-2'>
                      <Typography variant='caption' color='text.secondary'>
                        {viewLabel(c.viewCode)}
                      </Typography>
                      <MaskFlow current={c.current} nuevo={c.nuevo} />
                      <Chip size='small' color='error' variant='outlined' label={`pierde ${c.removedMask}`} />
                    </span>
                  ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <Divider />

      {/* Detalle completo por usuario (solo quienes cambian; los "unchanged" no vienen). */}
      <div>
        <Typography variant='subtitle2' className='mbe-2'>
          Detalle ({perUser.length} {perUser.length === 1 ? 'usuario' : 'usuarios'})
        </Typography>
        {perUser.length === 0 ? (
          <Typography variant='body2' color='text.secondary'>
            Nadie cambia con esta configuración.
          </Typography>
        ) : (
          <div className='flex flex-col gap-2 overflow-auto' style={{ maxHeight: 280 }}>
            {perUser.map(u => (
              <div key={u.idUsuario} className='flex flex-col'>
                <Typography variant='body2' color='text.primary'>
                  {u.nombre} <UserId id={u.idUsuario} />
                </Typography>
                {u.changes.map(c => (
                  <span key={c.viewCode} className='flex items-center gap-2 pis-2'>
                    <Typography variant='caption' color='text.secondary'>
                      {viewLabel(c.viewCode)}
                    </Typography>
                    <MaskFlow current={c.current} nuevo={c.nuevo} />
                    {c.removedMask !== null && (
                      <Chip size='small' color='error' variant='outlined' label={`pierde ${c.removedMask}`} />
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PresetPreviewPanel;
