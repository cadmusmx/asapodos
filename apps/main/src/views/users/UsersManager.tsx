// apps/main/src/views/users/UsersManager.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
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
import Typography from '@mui/material/Typography';

/**
 * Fila del roster, anclado en Employees (LEFT JOIN Users). `hasAccount` false =
 * empleado sin usuario (ordenado primero por el API). Inline por ahora; se
 * extrae a `@/types/users` cuando Fase 2 lo comparta con el alta.
 */
type UserAccountListItem = {
  employeeId: number;
  employeeNumber: string | null;
  fullName: string;
  positionName: string | null;
  departmentName: string | null;
  employmentStatus: string | null;
  isActive: boolean;
  hasAccount: boolean;
  userId: number | null;
  username: string | null;
  accountStatus: string | null;
};

type UsersResponse = {
  data: UserAccountListItem[];
  total: number;
  page: number;
  pageSize: number;
};

type FeedbackState = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

type UsersManagerProps = {

  // Reservado para Fase 2+ (gatea "Asignar usuario" / "Suspender"). Sin uso aún.
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const UsersManager = ({ canEdit: _canEdit = false }: UsersManagerProps) => {
  const [rows, setRows] = useState<UserAccountListItem[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

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
                  value={search}
                  onChange={event => {
                    setSearch(event.target.value);
                    setPage(0);
                  }}
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
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={4}>
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
                      <TableCell colSpan={4}>
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
                              <Typography fontWeight={600}>{row.employeeNumber ? row.employeeNumber : 'S/N'} - {row.fullName}</Typography>
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
    </Box>
  );
};

export default UsersManager;
