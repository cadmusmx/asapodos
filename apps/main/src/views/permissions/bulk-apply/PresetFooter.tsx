'use client';

// MUI Imports
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';

// Type Imports
import type { ApplyMode } from './types';

type Props = {
  mode: ApplyMode;
  departamento: string;
  puesto: string | null;
  perfil: string | null;
};

const wildcard = (v: string | null) => (v && v.trim() !== '' ? v : 'cualquiera');

/**
 * Este footer es ESTÁTICO por modo — nombra el riesgo, no lo cuantifica.
 * El conteo real de removals/usersInScope vive en el preview del dryRun.
 */
const PresetFooter = ({ mode, departamento, puesto, perfil }: Props) => {
  const scope = `departamento ${departamento} · perfil ${wildcard(perfil)} · puesto ${wildcard(puesto)}`;

  if (mode === 'OR') {
    return (
      <Alert severity='info'>
        <Typography variant='body2'>
          Otorgará estos permisos a los usuarios que coincidan ({scope}).{' '}
          <strong>No se remueve ningún permiso existente.</strong>
        </Typography>
      </Alert>
    );
  }

  return (
    <Alert severity='warning'>
      <Typography variant='body2'>
        Reemplazará los permisos de las vistas seleccionadas para los usuarios que coincidan ({scope}).{' '}
        <strong>Quienes tengan permisos mayores en esas vistas los perderán.</strong>
      </Typography>
    </Alert>
  );
};

export default PresetFooter;
