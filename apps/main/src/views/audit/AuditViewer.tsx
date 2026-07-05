'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react';

import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

// MUI Imports
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Alert from '@mui/material/Alert';
import TablePagination from '@mui/material/TablePagination';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';

import { Button } from '@mui/material';

import tableStyles from '@core/styles/table.module.css';

import { AUDIT_ACTION_LABELS, ACTION_OTHER, AUDIT_ORIGINS, ORIGIN_NONE, type AuditActionCode } from '@/lib/audit/catalog';
import AuditDetailDialog from './AuditDetailDialog';

export type AuditRow = {
  AuditID: number;
  TenantID: string;
  UserID: number | null;
  TableName: string;
  Action: string;
  OldData: string | null;
  NewData: string | null;
  ChangedAt: string;
  AppUser: string | null;
  IdOrigin: number | null;
  Origin: string | null;
}

type AuditApiResponse = {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: AuditRow[];
}

const columnHelper = createColumnHelper<AuditRow>();

const columns = [
  columnHelper.accessor('ChangedAt', {
    header: 'Fecha (UTC)',
    cell: info => {
      const v = info.getValue();
      // ChangedAt llega como ISO string. Lo formateamos legible.
      return v ? new Date(v).toLocaleString('es-MX', { timeZone: 'UTC' }) : '—';
    }
  }),
  columnHelper.accessor('Action', {
    header: 'Acción',
    cell: info => {
      const code = info.getValue();
      // Etiqueta legible si la conocemos; si no, el código crudo (caso "OTHER").
      const label = AUDIT_ACTION_LABELS[code as keyof typeof AUDIT_ACTION_LABELS] ?? code;
      return <Chip size='small' variant='tonal' label={label} />
    }
  }),
  columnHelper.accessor('AppUser', {
    header: 'Usuario',
    cell: info => info.getValue() ?? '—'
  }),
  columnHelper.accessor('TableName', {
    header: 'Entidad',
    cell: info => info.getValue()
  }),
  columnHelper.accessor('Origin', {
    header: 'Origen',
    cell: info => info.getValue() ?? '—'
  }),
  columnHelper.accessor('UserID', {
    header: 'User ID',
    cell: info => info.getValue() ?? '—'
  }),
  columnHelper.display({
    id: 'detail',
    header: 'Detalle',
    cell: ({ row, table }) => {
      const r = row.original
      const hasOld = r.OldData != null && r.OldData !== ''
      const hasNew = r.NewData != null && r.NewData !== ''

      if (!hasOld && !hasNew) return '—' // sin datos

      // Etiqueta según el caso: diff si ambos, "ver datos" si uno solo.
      const label = hasOld && hasNew ? 'Ver cambios' : 'Ver datos'

      return (
        <Button
          size='small'
          variant='contained'
          onClick={() => (table.options.meta as { openDetail: (r: AuditRow) => void }).openDetail(r)}
        >
          {label}
        </Button>
      )
    }
  })
];

const AuditViewer = () => {
  // Estado de filtros - Cada uno restablece pageIndex a 0
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [action, setAction] = useState(''); // '' = todas | código | ACTION_OTHER
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [origin, setOrigin] = useState('') // '' = todos | id como string
  const [tenantOverride, setTenantOverride] = useState(''); // solo SaaS admin

  // Estado de paginación (0-indexed, como TanStack)
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  // Estado de datos
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [detailRow, setDetailRow] = useState<AuditRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
    state: { pagination: { pageIndex, pageSize } },
    meta: {
      openDetail: (row: AuditRow) => setDetailRow(row),
    }
  })

  // Debounce del search box - espera sin teclear antes de consultar.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPageIndex(0); // al cambiar la búsqueda, volver a la primera página
    }, 700);

    return () => clearTimeout(t);
  }, [search]);

  // Opciones del dropdown de acción, derivadas del catálogo compartido.
  const actionOptions = useMemo(
    () => Object.entries(AUDIT_ACTION_LABELS) as [AuditActionCode, string][],
    []
  );

  // Fetch a /api/audit ante cualquier cambio de filtro/página
  useEffect(() => {
    // AbortController - para cancelar fetch
    const controller = new AbortController();

    const fetchAudit = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        params.set('start', String(pageIndex * pageSize));
        params.set('length', String(pageSize));

        if (debouncedSearch) params.set('search', debouncedSearch);
        if (action) params.set('action', action);
        if (dateFrom) params.set('dateFrom', dateFrom);
        if (dateTo) params.set('dateTo', dateTo);
        if (origin) params.set('origin', origin);

        const res = await fetch(`/api/audit?${params.toString()}`, { signal: controller.signal });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));

          throw new Error(body?.message ?? `Error ${res.status}`);
        }

        const json: AuditApiResponse = await res.json();

        setRows(json.data);
        setTotal(json.recordsTotal);
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return; // cancelado, normal
        setError(e instanceof Error ? e.message : 'Error al cargar la auditoría');
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }

    fetchAudit();

    return () => controller.abort();
  }, [pageIndex, pageSize, debouncedSearch, action, origin, dateFrom, dateTo, tenantOverride]);

  return (
    <Card>
      <CardHeader title='Visor de auditoría' subheader='Eventos registrados del sistema' />
      <CardContent>
        {/* Filtros */}
        <Grid container spacing={4} className='mbe-4'>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <TextField
              fullWidth
              size='small'
              label='Buscar (usuario, acción, entidad)'
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField
              select
              fullWidth
              size='small'
              label='Acción'
              value={action}
              onChange={e => {
                setAction(e.target.value)
                setPageIndex(0)
              }}
            >
              <MenuItem value=''>Todas</MenuItem>
              {actionOptions.map(([code, label]) => (
                <MenuItem key={code} value={code}>
                  {label}
                </MenuItem>
              ))}
              <MenuItem value={ACTION_OTHER}>Otras (no catalogadas)</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField
              select
              fullWidth
              size='small'
              label='Origen'
              value={origin}
              onChange={e => {
                setOrigin(e.target.value);
                setPageIndex(0);
              }}
            >
              <MenuItem value=''>TODOS</MenuItem>
              {AUDIT_ORIGINS.map(o => (
                <MenuItem key={o.id} value={String(o.id)}>
                  {o.nombre}
                </MenuItem>
              ))}
              <MenuItem value={ORIGIN_NONE}>SIN ORIGEN</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField
              fullWidth
              size='small'
              type='date'
              label='Desde'
              slotProps={{ inputLabel: { shrink: true } }}
              value={dateFrom}
              onChange={e => {
                setDateFrom(e.target.value)
                setPageIndex(0)
              }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField
              fullWidth
              size='small'
              type='date'
              label='Hasta'
              slotProps={{ inputLabel: { shrink: true } }}
              value={dateTo}
              onChange={e => {
                setDateTo(e.target.value)
                setPageIndex(0)
              }}
            />
          </Grid>
        </Grid>

        {/* Estados */}
        {error && (
          <Alert severity='error' className='mbe-4'>
            {error}
          </Alert>
        )}

        {/* Tabla */}
        <div className='overflow-x-auto relative'>
          {/* Overlay de carga: no desmonta la tabla, solo la atenúa */}
          {loading && (
            <div
              className='absolute inset-0 flex items-center justify-center'
              style={{ background: 'rgba(var(--mui-palette-background-paperChannel) / 0.6)', zIndex: 1 }}
            >
              <CircularProgress size={28} />
            </div>
          )}
          <table className={tableStyles.table}>
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
                    {loading ? 'Cargando…' : 'No hay eventos para los filtros actuales'}
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
        {/* El TablePagination está conectado al estado, no al de TanStack */}
        <TablePagination
          component='div'
          rowsPerPageOptions={[10, 25, 50, 100]}
          count={total} // viene de la API
          rowsPerPage={pageSize}
          page={pageIndex}
          onPageChange={(_, page) => setPageIndex(page)}
          onRowsPerPageChange={e => {
            setPageSize(Number(e.target.value))
            setPageIndex(0)
          }}
        />
      </CardContent>
      <AuditDetailDialog
        open={detailRow !== null}
        onClose={() => setDetailRow(null)}
        oldData={detailRow?.OldData ?? null}
        newData={detailRow?.NewData ?? null}
      />
    </Card>
  )
}

export default AuditViewer;
