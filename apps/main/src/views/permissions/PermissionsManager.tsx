'use client';

// React Imports
import { useState } from 'react';

// MUI Imports
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';

// Hook Imports
import { useMe } from '@/hooks/useMe';

// Component Imports
import UsersMaster from './UsersMaster';
import PermissionsDetail from './PermissionsDetail';

// Type Imports
import type { AssignableUser } from './types';

/**
 * Administración de permisos (Paso 8) — contenedor maestro-detalle.
 *
 * Maestro (izq): lista de usuarios administrables (GET /api/permissions/users).
 * Detalle (der): permisos del usuario seleccionado (GET /api/permissions/user/[id]).
 *
 * `canEdit` (permissions_access:U) viene de la página; decide si el detalle
 * se muestra editable o en solo-lectura. El servidor revalida en cada escritura.
 */
const PermissionsManager = ({ canEdit }: { canEdit: boolean }) => {
  const [selectedUser, setSelectedUser] = useState<AssignableUser | null>(null);
  const { data: me } = useMe();

  // Depto del actor para preseleccionar el filtro del maestro.
  // Ajusta la ruta según dónde exponga /api/me el departamento del usuario.
  const actorDept = me?.user.departament ?? null;

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Typography variant='h4' className='mbe-1'>
          Administración de permisos
        </Typography>
        <Typography>
          Selecciona un usuario para ver y {canEdit ? 'ajustar' : 'consultar'} sus permisos por vista.
          {!canEdit && ' (solo lectura)'}
        </Typography>
      </Grid>

      {/* Maestro */}
      <Grid size={{ xs: 12, md: 5 }}>
        <UsersMaster selectedId={selectedUser?.idUsuario ?? null} onSelect={setSelectedUser} actorDept={actorDept} />
      </Grid>

      {/* Detalle */}
      <Grid size={{ xs: 12, md: 7 }}>
        <PermissionsDetail user={selectedUser} canEdit={canEdit} />
      </Grid>
    </Grid>
  );
};

export default PermissionsManager;
