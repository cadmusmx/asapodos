'use client';

import { useCallback, useEffect, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';

type EmployeeHeader = {
  employeeId: number;
  employeeNumber: string | null;
  fullName: string;
  email: string | null;
  employmentStatus: string | null;
  isActive: boolean;
};

type EmployeeExpedienteProps = {
  employeeId: number;
};

const EmployeeExpediente = ({ employeeId }: EmployeeExpedienteProps) => {
  const [employee, setEmployee] = useState<EmployeeHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  const loadEmployee = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/human-capital/employees/${employeeId}`);
      const data = (await response.json().catch(() => null)) as { data?: EmployeeHeader; message?: string } | null;

      if (!response.ok || !data?.data) {
        throw new Error(data && data.message ? data.message : 'No se pudo cargar el empleado.');
      }

      setEmployee(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el empleado.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadEmployee();
  }, [loadEmployee]);

  return (
    <Box>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          {loading ? (
            <Stack alignItems='center' sx={{ py: 4 }}>
              <CircularProgress />
            </Stack>
          ) : employee ? (
            <Stack direction='row' spacing={2} alignItems='center' justifyContent='space-between'>
              <Stack spacing={0.5}>
                <Typography variant='h5'>Expediente · {employee.fullName}</Typography>
                <Typography variant='body2' color='text.secondary'>
                  {employee.employeeNumber ? `No. ${employee.employeeNumber}` : 'Sin número'}
                  {employee.email ? ` · ${employee.email}` : ''}
                </Typography>
              </Stack>
              <Chip
                label={employee.isActive ? 'Activo' : 'Inactivo'}
                color={employee.isActive ? 'success' : 'default'}
                size='small'
                variant={employee.isActive ? 'filled' : 'outlined'}
              />
            </Stack>
          ) : (
            <Typography variant='body2' color='error'>
              {error ?? 'Empleado no disponible.'}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card>
        <Tabs
          value={tab}
          onChange={(_event, value) => setTab(value)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label='Contactos' />
          <Tab label='Datos extra' />
          <Tab label='Documentos' />
        </Tabs>

        <CardContent>
          {tab === 0 ? (
            <Typography variant='body2' color='text.secondary'>
              Contactos — próximamente (C1).
            </Typography>
          ) : null}
          {tab === 1 ? (
            <Typography variant='body2' color='text.secondary'>
              Datos extra — próximamente (C2).
            </Typography>
          ) : null}
          {tab === 2 ? (
            <Typography variant='body2' color='text.secondary'>
              Documentos — próximamente (C3).
            </Typography>
          ) : null}
        </CardContent>
      </Card>
    </Box>
  );
};

export default EmployeeExpediente;
