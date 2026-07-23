'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';

// Next Imports
import { useParams, useRouter } from 'next/navigation';

// MUI Imports
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import TablePagination from '@mui/material/TablePagination';
import Alert from '@mui/material/Alert';

// Third-party Imports
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

// Style Imports
import styles from '@core/styles/table.module.css';

import type { AlmacenRow, ProyectoRow, TipoMaterialRow, CarrierRow, MotivoRow, EstadoFisicoRow } from '@/app/api/warehouses/material-validation/catalogs/route';

interface Catalogs {
  almacenes: Array<AlmacenRow>;
  proyectos: Array<ProyectoRow>;
  tiposMaterial: Array<TipoMaterialRow>;
  carriers: Array<CarrierRow>;
  motivos: Array<MotivoRow>;
  estadosFisicos: Array<EstadoFisicoRow>;
}

interface VMRow {
  Id: number;
  Folio: string;
  Fecha: string;
  Responsable: string;
  Proyecto: string;
  TipoMaterial: string;
  AlmacenDestino: string;
  Carrier: string;
  TotalPiezas: number;
  Status: number;
  Vinculado: number | null;
  ES: boolean;
}

const EMPTY_CATALOGS: Catalogs = {
  almacenes: [], proyectos: [], tiposMaterial: [], carriers: [], motivos: [], estadosFisicos: [],
};

const columnHelper = createColumnHelper<VMRow>();

const MaterialValidationList = ({ canEdit }: { canEdit: boolean }) => {
  const router = useRouter();
  const { lang } = useParams();

  const goToDetail = (folio: string) =>
    router.push(`/${lang}/warehouses/material-validation/${encodeURIComponent(folio)}`);

  const goCatalogs = () => router.push(`/${lang}/warehouses/material-validation/catalogos`);


  // Filtros (cada cambio vuelve a la primera página)
  const [es, setEs] = useState(true); // true = entradas, false = salidas
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [proyecto, setProyecto] = useState('');
  const [tipoMaterial, setTipoMaterial] = useState('');
  const [almacen, setAlmacen] = useState('');
  const [carrier, setCarrier] = useState('');

  // Paginación (0-indexed como TanStack; la API es 1-indexed)
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Datos
  const [catalogs, setCatalogs] = useState<Catalogs>(EMPTY_CATALOGS);
  const [rows, setRows] = useState<VMRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetToFirst = () => setPageIndex(0);

  // Catálogos para los selects (una vez)
  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/warehouses/material-validation/catalogs', { signal: controller.signal })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('No se pudieron cargar los catálogos'))))
      .then((json: Catalogs) => setCatalogs(json))
      .catch(e => {
        if ((e as Error).name !== 'AbortError') setError((e as Error).message)
      });

    return () => controller.abort();
  }, []);

  // Listado
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          pagina: String(pageIndex + 1),
          limite: String(pageSize),
          orden: 'DESC',
        });

        const body: Record<string, unknown> = { es };

        if (fechaInicio) body.fechaInicio = fechaInicio;
        if (fechaFin) body.fechaFin = fechaFin;
        if (proyecto) body.proyecto = Number(proyecto);
        if (tipoMaterial) body.tipoMaterial = Number(tipoMaterial);
        if (almacen) body.almacen = Number(almacen);
        if (carrier) body.carrier = Number(carrier);

        const res = await fetch(`/api/warehouses/material-validation/search?${params.toString()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (res.status === 403) throw new Error('No tienes permiso para ver este módulo.');
        if (!res.ok) throw new Error('No se pudo cargar el listado.');

        const json: { rows: VMRow[]; total: number } = await res.json();

        setRows(json.rows);
        setTotal(json.total);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message);
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => controller.abort();
  }, [es, fechaInicio, fechaFin, proyecto, tipoMaterial, almacen, carrier, pageIndex, pageSize]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('Folio', { header: 'Folio' }),
      columnHelper.accessor('Fecha', {
        header: 'Fecha',
        cell: info => new Date(info.getValue()).toLocaleDateString(),
      }),
      columnHelper.accessor('Proyecto', { header: 'Proyecto' }),
      columnHelper.accessor('TipoMaterial', { header: 'Tipo' }),
      columnHelper.accessor('AlmacenDestino', { header: 'Almacén' }),
      columnHelper.accessor('Carrier', { header: 'Carrier' }),
      columnHelper.accessor('Responsable', { header: 'Responsable' }),
      columnHelper.accessor('TotalPiezas', { header: 'Piezas' }),
      columnHelper.accessor('Status', {
        header: 'Estado',
        cell: info => (
          <Chip
            size='small'
            variant='tonal'
            color={info.getValue() === 0 ? 'warning' : 'success'}
            label={info.getValue() === 0 ? 'Pendiente' : 'Revisado'}
          />
        ),
      }),
      columnHelper.accessor('Vinculado', {
        header: 'Vínculo',
        cell: info => (info.getValue() ? <Chip size='small' variant='tonal' color='info' label='Vinculado' /> : '—'),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button size='small' variant='outlined' color='info' onClick={() => goToDetail(row.original.Folio)}>
            {canEdit ? 'Ver / Editar' : 'Ver'}
          </Button>
        ),
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <Card>
      <CardHeader
        title='Validación de Material'
        action={
          <div className='flex gap-4'>
            <ToggleButtonGroup
              exclusive
              fullWidth
              size='small'
              value={es}
              onChange={(_, v) => {
                if (v !== null) {
                  setEs(v)
                  resetToFirst()
                }
              }}
            >
              <ToggleButton value={true}>Entradas</ToggleButton>
              <ToggleButton value={false}>Salidas</ToggleButton>
            </ToggleButtonGroup>
            <Button fullWidth size='small' variant='outlined' color='secondary' onClick={goCatalogs}>Catálogos</Button>
          </div>
        }
      />
      <CardContent>
        {/* Filtros */}
        <Grid container spacing={2} className='mbe-4'>
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField
              fullWidth size='small' type='date' label='Desde' slotProps={{ inputLabel: { shrink: true } }}
              value={fechaInicio}
              onChange={e => { setFechaInicio(e.target.value); resetToFirst() }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField
              fullWidth size='small' type='date' label='Hasta' slotProps={{ inputLabel: { shrink: true } }}
              value={fechaFin}
              onChange={e => { setFechaFin(e.target.value); resetToFirst() }}
            />
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField fullWidth select size='small' label='Proyecto' value={proyecto}
              onChange={e => { setProyecto(e.target.value); resetToFirst() }}>
              <MenuItem value=''>Todos</MenuItem>
              {catalogs.proyectos.map(p => <MenuItem key={p.Id} value={p.Id}>{p.Proyecto}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField fullWidth select size='small' label='Tipo' value={tipoMaterial}
              onChange={e => { setTipoMaterial(e.target.value); resetToFirst() }}>
              <MenuItem value=''>Todos</MenuItem>
              {catalogs.tiposMaterial.map(t => <MenuItem key={t.Id} value={t.Id}>{t.Tipo}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField fullWidth select size='small' label='Almacén' value={almacen}
              onChange={e => { setAlmacen(e.target.value); resetToFirst() }}>
              <MenuItem value=''>Todos</MenuItem>
              {catalogs.almacenes.map(a => <MenuItem key={a.Id} value={a.Id}>{a.Nombre}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3, md: 2 }}>
            <TextField fullWidth select size='small' label='Carrier' value={carrier}
              onChange={e => { setCarrier(e.target.value); resetToFirst() }}>
              <MenuItem value=''>Todos</MenuItem>
              {catalogs.carriers.map(c => <MenuItem key={c.Id} value={c.Id}>{c.Carrier}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>

        {error && <Alert severity='error' className='mbe-4'>{error}</Alert>}

        <div className='overflow-x-auto'>
          <table className={styles.table}>
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id}>
                  {hg.headers.map(header => (
                    <th key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className='text-center'>
                    {loading ? 'Cargando…' : 'No hay registros para los filtros actuales'}
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
            setPageSize(Number(e.target.value))
            setPageIndex(0)
          }}
        />
      </CardContent>
    </Card>
  );
}

export default MaterialValidationList;
