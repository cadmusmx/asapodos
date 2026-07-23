'use client';

// React Imports
import { useState } from 'react';

// MUI Imports
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import { Button, Tooltip } from '@mui/material';

// Component Imports
import UsersMaster from './UsersMaster';
import PermissionsDetail from './PermissionsDetail';
import PresetApplyDialog from './bulk-apply/PresetApplyDialog';

// Type Imports
import type { AssignableUser } from './types';

/**
 * Administración de permisos — contenedor maestro-detalle.
 *
 * Maestro (izq): lista de usuarios administrables (GET /api/permissions/users).
 * Detalle (der): permisos del usuario seleccionado (GET /api/permissions/user/[id]).
 *
 * `canEdit` (permissions_access:U) viene de la página;
 * decide si el detalle se muestra editable o en solo-lectura, y si la aplicación en bloque (que ESCRIBE) está disponible.
 * El servidor revalida en cada escritura.
 */
const PermissionsManager = ({ canEdit }: { canEdit: boolean }) => {
  const [selectedUser, setSelectedUser] = useState<AssignableUser | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <div className='flex items-center justify-between is-full'>
          <div>
            <Typography variant='h4' className='mbe-1'>
              Permisos y Accesos
            </Typography>
            <Typography>
              Selecciona un usuario para ver y {canEdit ? 'ajustar' : 'consultar'} sus permisos por vista o aplica permisos en bloque a un conjunto de usuarios.
              {!canEdit && ' (solo lectura)'}
            </Typography>
          </div>
          <Tooltip title={canEdit ? 'Aplica permisos a varios usuarios por departamento (y, próximamente, puesto/perfil)' : 'Requiere permiso de asignación'}>
            <span>
              <Button variant='contained' startIcon={<i className="ri-group-line"></i>} onClick={() => setPresetOpen(true)} disabled={!canEdit}>
                Aplicar en bloque
              </Button>
            </span>
          </Tooltip>
        </div>
      </Grid>

      {/* Maestro */}
      <Grid size={{ xs: 12, md: 7 }}>
        <UsersMaster selectedId={selectedUser?.idUsuario ?? null} onSelect={setSelectedUser} />
      </Grid>

      {/* Detalle */}
      <Grid size={{ xs: 12, md: 5 }}>
        <PermissionsDetail user={selectedUser} canEdit={canEdit} />
      </Grid>

      {canEdit && <PresetApplyDialog open={presetOpen} onClose={() => setPresetOpen(false)} />}
    </Grid>
  );
};

export default PermissionsManager;
