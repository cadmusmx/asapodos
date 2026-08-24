'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';

// Next Imports
import { useParams } from 'next/navigation';

// MUI Imports
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TablePagination from '@mui/material/TablePagination';
import Alert from '@mui/material/Alert';

// Third-party Imports
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

// Style Imports
import styles from '@core/styles/table.module.css';

// Type Imports
import type {
  ConductorOption,
  DepartamentoOption,
  EstatusOption,
} from '@/app/api/fleets/vehicles/filters/route';

import VehiclesStatCards, { type VehicleStats } from './components/VehiclesStatCards';
import VehicleDocumentsModal from './components/VehicleDocumentsModal';

// Fila del listado (proyección del cliente; Fleet no está en Prisma).
interface VehicleRow {
  IdAuto: number;
  Placa: string | null;
  NoEconomico: string | null;
  Modelo: string | null;
  Marca: string | null;
  Estatus: string | null;
  Aseguradora: string | null;
  Propietario: string | null;
  Departamento: string | null;
  Conductor: string | null;
  Kilometraje: number;
  FechaVencimientoPoliza: string | null;
  FechaVencimientoTarjeta: string | null;
  FechaProximaVerificacion: string | null;
  VigenciaPoliza: 'VIGENTE' | 'VENCIDA' | null;
  VigenciaTarjeta: 'VIGENTE' | 'VENCIDA' | null;
  VerificacionDiasRestantes: number | null;
  DocumentCount: number;
}

interface FilterOptions {
  estatuses: EstatusOption[];
  departamentos: DepartamentoOption[];
  conductores: ConductorOption[];
}

const EMPTY_OPTIONS: FilterOptions = { estatuses: [], departamentos: [], conductores: [] };

const columnHelper = createColumnHelper<VehicleRow>();

// Badge de vigencia VIGENTE/VENCIDA/—.
const VigenciaChip = ({ value }: { value: 'VIGENTE' | 'VENCIDA' | null }) => {
  if (value === null) return <>—</>;

  return (
    <Chip
      size='small'
      variant='tonal'
      color={value === 'VENCIDA' ? 'error' : 'success'}
      label={value === 'VENCIDA' ? 'Vencida' : 'Vigente'}
    />
  );
};

// Badge de verificación por días restantes: 0 = vencida, ≤30 = próxima, resto = ok.
const VerificacionChip = ({ dias }: { dias: number | null }) => {
  if (dias === null) return <>—</>;

  if (dias === 0) return <Chip size='small' variant='tonal' color='error' label='Vencida' />;
  if (dias <= 30) return <Chip size='small' variant='tonal' color='warning' label={`${dias} días`} />;

  return <Chip size='small' variant='tonal' color='success' label={`${dias} días`} />;
};

const VehiclesList = ({ canEdit, canCreate }: { canEdit: boolean; canCreate: boolean }) => {
  const { lang } = useParams();

  // Filtros
  const [q, setQ] = useState('');
  const [estatus, setEstatus] = useState('');
  const [departamento, setDepartamento] = useState('');
  const [conductor, setConductor] = useState('');
  const [docModal, setDocModal] = useState<{ id: number; title: string } | null>(null);

  // Paginación (0-indexed como TanStack; la API es 1-indexed)
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Datos
  const [options, setOptions] = useState<FilterOptions>(EMPTY_OPTIONS);
  const [rows, setRows] = useState<VehicleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetToFirst = () => setPageIndex(0);

  // Cuerpo de filtros compartido por /search y /stats.
  const filterBody = useMemo(() => {
    const body: Record<string, unknown> = {};

    if (q) body.q = q;
    if (estatus) body.estatus = Number(estatus);
    if (departamento) body.departamento = Number(departamento);
    if (conductor) body.conductor = Number(conductor);

    return body;
  }, [q, estatus, departamento, conductor]);

  // Opciones de filtro (una vez).
  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/fleets/vehicles/filters', { signal: controller.signal })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('No se pudieron cargar los filtros'))))
      .then((json: FilterOptions) => setOptions(json))
      .catch(e => {
        if ((e as Error).name !== 'AbortError') setError((e as Error).message);
      });

    return () => controller.abort();
  }, []);

  // Listado (depende de página + filtros).
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          pagina: String(pageIndex + 1),
          limite: String(pageSize),
          orden: 'ASC',
          sort: 'placa',
        });

        const res = await fetch(`/api/fleets/vehicles/search?${params.toString()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filterBody),
          signal: controller.signal,
        });

        if (res.status === 403) throw new Error('No tienes permiso para ver este módulo.');
        if (!res.ok) throw new Error('No se pudo cargar el listado.');

        const json = (await res.json()) as { rows: VehicleRow[]; total: number };

        setRows(json.rows);
        setTotal(json.total);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [pageIndex, pageSize, filterBody]);

  // Stats (dependen SOLO de filtros; no de la página).
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setStatsLoading(true);

      try {
        const res = await fetch('/api/fleets/vehicles/stats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(filterBody),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error('stats');

        setStats((await res.json()) as VehicleStats);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setStats(null);
      } finally {
        setStatsLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [filterBody]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('Placa', { header: 'Placa', cell: info => info.getValue() ?? '—' }),
      columnHelper.accessor('NoEconomico', { header: 'No. Económico', cell: info => info.getValue() ?? '—' }),
      columnHelper.display({
        id: 'marcaModelo',
        header: 'Marca / Modelo',
        cell: ({ row }) => {
          const { Marca, Modelo } = row.original;

          return [Marca, Modelo].filter(Boolean).join(' · ') || '—';
        },
      }),
      columnHelper.accessor('Estatus', {
        header: 'Estatus',
        cell: info => (info.getValue() ? <Chip size='small' variant='tonal' label={info.getValue()} /> : '—'),
      }),
      columnHelper.accessor('Conductor', { header: 'Conductor', cell: info => info.getValue() ?? 'Sin asignar' }),
      columnHelper.accessor('Departamento', { header: 'Departamento', cell: info => info.getValue() ?? '—' }),
      columnHelper.accessor('VigenciaPoliza', {
        header: 'Póliza',
        cell: info => <VigenciaChip value={info.getValue()} />,
      }),
      columnHelper.accessor('VigenciaTarjeta', {
        header: 'Tarjeta',
        cell: info => <VigenciaChip value={info.getValue()} />,
      }),
      columnHelper.accessor('VerificacionDiasRestantes', {
        header: 'Verificación',
        cell: info => <VerificacionChip dias={info.getValue()} />,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className='flex gap-2'>
            <Button
              size='small'
              variant='outlined'
              color='info'
              component='a'
              href={`/${lang}/fleets/vehicles/${row.original.IdAuto}`}
              target='_blank'
              rel='noopener noreferrer'
            >
              {canEdit ? 'Ver / Editar' : 'Ver'}
            </Button>
            {row.original.DocumentCount > 0 && (
              <Button
                size='small'
                variant='outlined'
                color='secondary'
                startIcon={<i className='ri-attachment-2' />}
                onClick={() =>
                  setDocModal({ id: row.original.IdAuto, title: row.original.Placa ?? `#${row.original.IdAuto}` })
                }
              >
                Documentos
              </Button>
            )}
          </div>
        ),
      }),
    ],
    [canEdit, lang],
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
    state: { pagination: { pageIndex, pageSize } },
  });

  return (
    <>
      <VehiclesStatCards stats={stats} loading={statsLoading} />
      <Card>
        <CardHeader
          title='Gestión Vehicular'
          subheader='Flotilla del tenant'
          action={
            <div className='flex gap-4'>
              {canCreate ? (
                <Button
                  variant='contained'
                  startIcon={<i className='ri-add-line' />}
                  component='a'
                  href={`/${lang}/fleets/vehicles/new`}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Nuevo vehículo
                </Button>
              ) : null}
              <Button
                size='small'
                variant='outlined'
                color='secondary'
                component='a'
                href={`/${lang}/fleets/vehicles/catalogs`}
                target='_blank'
                rel='noopener noreferrer'
              >
                Catálogos
              </Button>
            </div>
          }
        />
        <CardContent>
          {/* Filtros */}
          <Grid container spacing={2} className='mbe-4'>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <TextField
                fullWidth
                size='small'
                label='Buscar'
                placeholder='Placa, económico, modelo, VIN, línea'
                value={q}
                onChange={e => {
                  setQ(e.target.value);
                  resetToFirst();
                }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3, md: 2 }}>
              <TextField
                select
                fullWidth
                size='small'
                label='Estatus'
                value={estatus}
                onChange={e => {
                  setEstatus(e.target.value);
                  resetToFirst();
                }}
              >
                <MenuItem value=''>Todos</MenuItem>
                {options.estatuses.map(o => (
                  <MenuItem key={o.Id} value={String(o.Id)}>
                    {o.Nombre}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {options.departamentos.length > 0 && (
              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <TextField
                  select
                  fullWidth
                  size='small'
                  label='Departamento'
                  value={departamento}
                  onChange={e => {
                    setDepartamento(e.target.value);
                    resetToFirst();
                  }}
                >
                  <MenuItem value=''>Todos</MenuItem>
                  {options.departamentos.map(o => (
                    <MenuItem key={o.Id} value={String(o.Id)}>
                      {o.Nombre}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}

            {/* Conductor: se oculta hasta que haya asignaciones (Slice 2). */}
            {options.conductores.length > 0 && (
              <Grid size={{ xs: 6, sm: 3, md: 2 }}>
                <TextField
                  select
                  fullWidth
                  size='small'
                  label='Conductor'
                  value={conductor}
                  onChange={e => {
                    setConductor(e.target.value);
                    resetToFirst();
                  }}
                >
                  <MenuItem value=''>Todos</MenuItem>
                  {options.conductores.map(o => (
                    <MenuItem key={o.Id} value={String(o.Id)}>
                      {o.Nombre}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
          </Grid>

          {error && (
            <Alert severity='error' className='mbe-4'>
              {error}
            </Alert>
          )}

          <div className='overflow-x-auto'>
            <table className={styles.table}>
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className='text-center'>
                      {loading ? 'Cargando…' : 'No hay vehículos para los filtros actuales'}
                    </td>
                  </tr>
                ) : (
                  table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            component='div'
            rowsPerPageOptions={[10, 25, 50, 100]}
            count={total}
            rowsPerPage={pageSize}
            page={pageIndex}
            onPageChange={(_, page) => setPageIndex(page)}
            onRowsPerPageChange={e => {
              setPageSize(Number(e.target.value));
              setPageIndex(0);
            }}
          />
        </CardContent>
      </Card>
      <VehicleDocumentsModal
        vehicleId={docModal?.id ?? null}
        title={docModal?.title}
        open={!!docModal}
        onClose={() => setDocModal(null)}
      />
    </>
  );
};

export default VehiclesList;
