'use client';

// React Imports
import { useMemo } from 'react';

// MUI Imports
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';

// Helper Imports (reuso — NO se toca mask-ui.tsx)
import {
  visibleBits,
  isBitEditable,
  toggleBit,
  isProtectedView,
  BIT_LABEL,
  type BitKey,
  type BitState,
  type ViewMasks
} from '../mask-ui';

// Type Imports
import type { DepartmentView } from './types';

type Props = {

  /** Vistas crudas del seam (puede incluir permissions_access; aquí se filtra). */
  views: DepartmentView[];

  /** Máscara de trabajo por vista. Arranca en 0; el público NO la seedea. */
  workingMasks: Record<string, number>;

  /** El grid computa el toggle (mask-ui) y emite la nueva máscara ya canónica/acotada. */
  onMaskChange: (viewCode: string, nextMask: number) => void;

  /** Congela la interacción (p.ej. mientras se previsualiza). */
  disabled?: boolean;
};

const chipVisual = (
  state: BitState
): { color: 'default' | 'primary'; variant: 'filled' | 'outlined'; icon?: React.ReactElement } => {
  switch (state) {
    case 'public':
      // Piso público: activo y no quitable (candado). No cuenta como grant salvo canonicidad.
      return { color: 'default', variant: 'filled', icon: <i className='ri-lock-line' /> };
    case 'assigned':
      // Bit encendido en la máscara de trabajo (se va a otorgar).
      return { color: 'primary', variant: 'filled' };
    case 'assignable':
    default:
      // Dentro de techo, hoy apagado.
      return { color: 'default', variant: 'outlined' };
  }
};

const GROUP_FALLBACK = 'otros';

const PresetViewsGrid = ({ views, workingMasks, onMaskChange, disabled = false }: Props) => {
  // permissions_access (PROTECTED_VIEW): el endpoint la devuelve, el modal la omite.
  const assignable = useMemo(() => views.filter(v => !isProtectedView(v.viewCode)), [views]);

  const groups = useMemo(() => {
    const map = new Map<string, DepartmentView[]>();

    for (const v of assignable) {
      const key = v.menuGroup ?? GROUP_FALLBACK;

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(v);
    }

    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [assignable]);

  // Sin vistas asignables en el plan del tenant (o todo protegido): aviso explícito.
  if (assignable.length === 0) {
    return <Alert severity='info'>No hay vistas asignables en el plan del tenant.</Alert>;
  }

  const handleToggle = (v: DepartmentView, bit: BitKey) => {
    if (disabled) return;

    const masks: ViewMasks = {
      currentMask: workingMasks[v.viewCode] ?? 0,
      ceilingMask: v.ceilingMask,
      publicMask: v.publicMask
    };

    if (!isBitEditable(bit, masks)) return; // público o fuera de techo

    const next = toggleBit(bit, masks.currentMask, masks);

    if (next !== masks.currentMask) onMaskChange(v.viewCode, next);
  };

  return (
    <div className='flex flex-col gap-2'>
      {groups.map(([groupName, groupViews]) => (
        <Accordion key={groupName}>
          <AccordionSummary expandIcon={<i className='ri-arrow-down-s-line' />}>
            <Typography className='font-medium capitalize'>{groupName.replace(/_/g, ' ')}</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <div className='flex flex-col gap-4'>
              {groupViews.map(v => {
                const working = workingMasks[v.viewCode] ?? 0;
                const masks: ViewMasks = { currentMask: working, ceilingMask: v.ceilingMask, publicMask: v.publicMask };
                const bits = visibleBits(masks); // oculta los fuera de techo

                return (
                  <div key={v.viewCode} className='flex items-center justify-between gap-4 flex-wrap'>
                    <Typography color='text.primary'>{v.label}</Typography>
                    <div className='flex items-center gap-2'>
                      {bits.map(({ bit, state }) => {
                        const cv = chipVisual(state);
                        const editable = !disabled && isBitEditable(bit, masks);

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
    </div>
  );
};

export default PresetViewsGrid;
