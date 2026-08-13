'use client';

import { useCallback, useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import type { UserAccountListItem, UsersResponse } from '@/types/users';

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

type StatusAction = 'suspend' | 'reactivate';

type UsersManagerProps = {

  // "Asignar usuario" es un alta → bit W.
  canCreate?: boolean;

  // Suspender/reactivar cuenta → bit U.
  canEdit?: boolean;
};

// Empleo (dominio RH) — solo lectura aquí.
const employmentLabels: Record<string, string> = {
  active: 'Activo',
  inactive: 'Inactivo',
  on_leave: 'Permiso',
  terminated: 'Terminado'
};

const employmentColors: Record<string, 'success' | 'default' | 'warning' | 'error'> = {
  active: 'success',
  inactive: 'default',
  on_leave: 'warning',
  terminated: 'error'
};

// Cuenta (dominio de este módulo). Señal independiente del empleo (D12).
const accountChip = (
  status: string | null
): { label: string; color: 'success' | 'default' | 'warning' | 'error'; variant: 'filled' | 'outlined' } => {
  switch (status) {
    case 'A':
      return { label: 'Activa', color: 'success', variant: 'filled' };
    case 'I':
      return { label: 'Suspendida', color: 'warning', variant: 'outlined' };
    case 'B':
      return { label: 'Baja', color: 'error', variant: 'outlined' };
    default:
      return { label: 'Sin cuenta', color: 'default', variant: 'outlined' };
  }
};

// Sugerencia editable: nombre.apellido, sin acentos ni espacios.
const suggestUsername = (fullName: string): string => {
  const normalized = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  const parts = normalized.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];

  return `${parts[0]}.${parts[parts.length - 1]}`;
};

const UsersManager = ({ canCreate = false, canEdit = false }: UsersManagerProps) => {
  const [rows, setRows] = useState<UserAccountListItem[]>([]);

  // Lo que ve el input (inmediato) vs. lo que dispara la búsqueda (con debounce).
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  // Modal "Asignar usuario"
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<UserAccountListItem | null>(null);
  const [assignUsername, setAssignUsername] = useState('');
  const [assignPassword, setAssignPassword] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Confirmación suspender/reactivar
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusTarget, setStatusTarget] = useState<UserAccountListItem | null>(null);
  const [statusAction, setStatusAction] = useState<StatusAction | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setFeedback(null);

    try {
      const params = new URLSearchParams();

      params.set('page', String(page + 1));
      params.set('pageSize', String(pageSize));

      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`/api/users?${params.toString()}`);

      const data = (await response.json().catch(() => null)) as (UsersResponse & { message?: string }) | null;

      if (!response.ok || !data) {
        throw new Error(data && data.message ? data.message : 'No se pudo cargar el listado.');
      }

      setRows(data.data);
      setTotal(data.total);
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al cargar usuarios.'
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 1000);

    return () => clearTimeout(handle);
  }, [searchInput]);

  // Asignar usuario
  const openAssign = (row: UserAccountListItem) => {
    setAssignTarget(row);
    setAssignUsername(suggestUsername(row.fullName));
    setAssignPassword('');
    setAssignError(null);
    setAssignOpen(true);
  };

  const closeAssign = () => {
    if (assignSaving) return;

    setAssignOpen(false);
    setAssignTarget(null);
    setAssignUsername('');
    setAssignPassword('');
    setAssignError(null);
  };

  const submitAssign = async () => {
    if (!assignTarget) return;

    setAssignSaving(true);
    setAssignError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: assignTarget.employeeId,
          username: assignUsername.trim(),
          password: assignPassword
        })
      });

      const data = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(data && data.message ? data.message : 'No se pudo asignar el usuario.');
      }

      const label = assignUsername.trim();
      const name = assignTarget.fullName;

      setAssignOpen(false);
      setAssignTarget(null);
      setAssignUsername('');
      setAssignPassword('');
      setFeedback({ type: 'success', message: `Usuario "${label}" asignado a ${name}.` });

      await loadUsers();
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : 'Error al asignar usuario.');
    } finally {
      setAssignSaving(false);
    }
  };

  // Suspender / reactivar cuenta
  const openStatus = (row: UserAccountListItem) => {
    setStatusTarget(row);
    setStatusAction(row.accountStatus === 'A' ? 'suspend' : 'reactivate');
    setStatusError(null);
    setStatusOpen(true);
  };

  const closeStatus = () => {
    if (statusSaving) return;

    setStatusOpen(false);
    setStatusTarget(null);
    setStatusAction(null);
    setStatusError(null);
  };

  const submitStatus = async () => {
    if (!statusTarget || statusTarget.userId === null || !statusAction) return;

    const target = statusTarget;
    const action = statusAction;
    const nextEstatus = action === 'suspend' ? 'I' : 'A';

    setStatusSaving(true);
    setStatusError(null);

    try {
      const response = await fetch(`/api/users/${target.userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estatus: nextEstatus })
      });

      const data = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(data && data.message ? data.message : 'No se pudo cambiar el estado.');
      }

      setStatusOpen(false);
      setStatusTarget(null);
      setStatusAction(null);
      setFeedback({
        type: 'success',
        message:
          action === 'suspend'
            ? `Cuenta de ${target.fullName} suspendida.`
            : `Cuenta de ${target.fullName} reactivada.`
      });

      await loadUsers();
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Error al cambiar el estado.');
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <Box>
      <Card>
        <CardContent>
          <Stack spacing={4}>
            {feedback ? (
              <Alert severity={feedback.type} onClose={() => setFeedback(null)}>
                {feedback.message}
              </Alert>
            ) : null}

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 4 }}>
                <TextField
                  label='Buscar'
                  placeholder='Nombre, número o usuario'
                  value={searchInput}
                  onChange={event => setSearchInput(event.target.value)}
                  size='small'
                  fullWidth
                />
              </Grid>
            </Grid>

            <Divider />

            <TableContainer component={Paper} variant='outlined'>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Empleado / Usuario</TableCell>
                    <TableCell>Puesto / Departamento</TableCell>
                    <TableCell>Estatus empleado</TableCell>
                    <TableCell>Estado de cuenta</TableCell>
                    <TableCell align='right'>Acciones</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Stack alignItems='center' spacing={2} sx={{ py: 6 }}>
                          <CircularProgress />
                          <Typography variant='body2' color='text.secondary'>
                            Cargando...
                          </Typography>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography variant='body2' color='text.secondary' align='center' sx={{ py: 6 }}>
                          No hay registros para mostrar.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map(row => {
                      const account = accountChip(row.accountStatus);

                      return (
                        <TableRow key={row.employeeId} hover>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography fontWeight={600}>
                                {row.employeeNumber ? row.employeeNumber : 'S/N'} - {row.fullName}
                              </Typography>
                              {row.hasAccount ? (
                                <Stack direction='row' spacing={0.5} alignItems='center'>
                                  <i className='ri-user-3-line' style={{ fontSize: 14 }} />
                                  <Typography variant='body2'>{row.username}</Typography>
                                </Stack>
                              ) : (
                                <Typography variant='caption' color='text.disabled'>
                                  Sin usuario
                                </Typography>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Stack spacing={0.5}>
                              <Typography variant='body2'>{row.positionName ?? 'Sin puesto'}</Typography>
                              <Typography variant='caption' color='text.secondary'>
                                {row.departmentName ?? 'Sin departamento'}
                              </Typography>
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={
                                row.employmentStatus
                                  ? employmentLabels[row.employmentStatus] ?? row.employmentStatus
                                  : '—'
                              }
                              color={
                                row.employmentStatus ? employmentColors[row.employmentStatus] ?? 'default' : 'default'
                              }
                              size='small'
                              variant={row.isActive ? 'filled' : 'outlined'}
                            />
                          </TableCell>

                          <TableCell>
                            <Chip label={account.label} color={account.color} size='small' variant={account.variant} />
                          </TableCell>

                          <TableCell align='right'>
                            {!row.hasAccount ? (
                              canCreate ? (
                                <Tooltip title={row.isActive ? 'Asignar usuario' : 'Empleado inactivo'}>
                                  <span>
                                    <IconButton
                                      color='primary'
                                      onClick={() => openAssign(row)}
                                      disabled={!row.isActive}
                                    >
                                      <i className='ri-user-add-line' />
                                    </IconButton>
                                  </span>
                                </Tooltip>
                              ) : null
                            ) : canEdit ? (
                              row.accountStatus === 'A' ? (
                                <Tooltip title='Suspender cuenta'>
                                  <IconButton color='warning' onClick={() => openStatus(row)}>
                                    <i className='ri-pause-circle-line' />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                <Tooltip title='Reactivar cuenta'>
                                  <IconButton color='success' onClick={() => openStatus(row)}>
                                    <i className='ri-play-circle-line' />
                                  </IconButton>
                                </Tooltip>
                              )
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component='div'
              count={total}
              page={page}
              rowsPerPage={pageSize}
              rowsPerPageOptions={[10, 25, 50, 100]}
              onPageChange={(_event, value) => setPage(value)}
              onRowsPerPageChange={event => {
                setPageSize(Number(event.target.value));
                setPage(0);
              }}
            />
          </Stack>
        </CardContent>
      </Card>

      {/* Asignar usuario */}
      <Dialog open={assignOpen} onClose={closeAssign} maxWidth='xs' fullWidth>
        <DialogTitle>Asignar usuario</DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            {assignTarget ? (
              <Typography variant='body2' color='text.secondary'>
                {assignTarget.employeeNumber ? `${assignTarget.employeeNumber} - ` : ''}
                {assignTarget.fullName}
              </Typography>
            ) : null}

            {assignError ? <Alert severity='error'>{assignError}</Alert> : null}

            <TextField
              label='Usuario'
              value={assignUsername}
              onChange={event => setAssignUsername(event.target.value)}
              fullWidth
              disabled={assignSaving}
              autoComplete='off'
            />

            <TextField
              label='Contraseña'
              value={assignPassword}
              onChange={event => setAssignPassword(event.target.value)}
              type='password'
              fullWidth
              disabled={assignSaving}
              autoComplete='new-password'
              helperText='Mínimo 8 caracteres. Se guarda en texto plano (pendiente de hashing).'
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeAssign} disabled={assignSaving}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            onClick={submitAssign}
            disabled={assignSaving}
            startIcon={assignSaving ? <CircularProgress size={18} color='inherit' /> : null}
          >
            {assignSaving ? 'Asignando...' : 'Asignar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Suspender / reactivar cuenta */}
      <Dialog open={statusOpen} onClose={closeStatus} maxWidth='xs' fullWidth>
        <DialogTitle>{statusAction === 'suspend' ? 'Suspender cuenta' : 'Reactivar cuenta'}</DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {statusError ? <Alert severity='error'>{statusError}</Alert> : null}

            {statusTarget ? (
              <Typography variant='body2'>
                Cuenta de <strong>{statusTarget.fullName}</strong>
                {statusTarget.username ? ` (usuario ${statusTarget.username})` : ''}.
              </Typography>
            ) : null}

            <Typography variant='body2' color='text.secondary'>
              {statusAction === 'suspend'
                ? 'Al suspenderla, el usuario no podrá iniciar sesión. No afecta su situación laboral.'
                : 'Al reactivarla, el usuario podrá iniciar sesión de nuevo.'}
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={closeStatus} disabled={statusSaving}>
            Cancelar
          </Button>
          <Button
            variant='contained'
            color={statusAction === 'suspend' ? 'warning' : 'success'}
            onClick={submitStatus}
            disabled={statusSaving}
            startIcon={statusSaving ? <CircularProgress size={18} color='inherit' /> : null}
          >
            {statusSaving ? 'Guardando...' : statusAction === 'suspend' ? 'Suspender' : 'Reactivar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersManager;
