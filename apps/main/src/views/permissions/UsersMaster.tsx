'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';

// MUI Imports
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import TablePagination from '@mui/material/TablePagination';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';

// Third-party Imports
import classnames from 'classnames';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef
} from '@tanstack/react-table';

// Style Imports
import tableStyles from '@core/styles/table.module.css';

// Type Imports
import {
  ALL_DEPTS,
  type AssignableUser,
  type AssignableUsersResponse,
  type DepartmentsResponse,
  type DeptSelection,
  type FilterableDepartment
} from './types';

const columnHelper = createColumnHelper<AssignableUser>();

const PAGE_SIZE = 10;

// Buscador con debounce (TextField MUI directo, como AuditViewer).
const DebouncedSearch = ({
  value: initialValue,
  onChange,
  debounce = 500
}: {
  value: string;
  onChange: (value: string) => void;
  debounce?: number;
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const timeout = setTimeout(() => onChange(value), debounce);

    return () => clearTimeout(timeout);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <TextField size='small' placeholder='Buscar por nombre' value={value} onChange={e => setValue(e.target.value)} />
  );
};

type Props = {
  selectedId: number | null;
  onSelect: (user: AssignableUser) => void;
};

const UsersMaster = ({ selectedId, onSelect }: Props) => {
  // Departamentos filtrables
  const [departments, setDepartments] = useState<FilterableDepartment[]>([]);
  const [dept, setDept] = useState<DeptSelection | null>(null); // null = aún no inicializado

  // Datos de usuarios
  const [rows, setRows] = useState<AssignableUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pageIndex, setPageIndex] = useState(0);
  const [search, setSearch] = useState('');

  // Para forzar refresh manual (botón).
  const [refreshTick, setRefreshTick] = useState(0);

  // 1) Cargar departamentos una vez; preseleccionar el del actor (o el primero).
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch('/api/permissions/departments', { signal: controller.signal });

        if (!res.ok) return;

        const json: DepartmentsResponse = await res.json();

        setDepartments(json.departments);

        // Default: el primer departamento de la lista (o Todos si viene vacía).
        setDept(json.departments[0]?.idDepartamento ?? ALL_DEPTS);
      } catch {
        // silencioso: si falla, el filtro queda en Todos y se listan todos.
        setDept(ALL_DEPTS);
      }
    };

    load();

    return () => controller.abort();
  }, []);

  // 2) Cargar usuarios según dept/search/página/refresh.
  useEffect(() => {
    if (dept === null) return; // espera a que el filtro se inicialice

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          start: String(pageIndex * PAGE_SIZE),
          length: String(PAGE_SIZE),
          search
        });

        if (dept !== ALL_DEPTS) params.set('dept', String(dept));

        const res = await fetch(`/api/permissions/users?${params.toString()}`, { signal: controller.signal });

        if (res.status === 403) throw new Error('No tienes permiso para ver esta lista.');
        if (!res.ok) throw new Error('No se pudo cargar la lista de usuarios.');

        const json: AssignableUsersResponse = await res.json();

        setRows(json.data);
        setTotal(json.recordsTotal);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message);
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [dept, pageIndex, search, refreshTick]);

  // Al cambiar filtro o búsqueda, vuelve a la primera página.
  useEffect(() => {
    setPageIndex(0);
  }, [dept, search]);

  const columns = useMemo<ColumnDef<AssignableUser, any>[]>(
    () => [
      columnHelper.accessor('nombre', {
        header: 'Usuario',
        cell: info => <Typography color='text.primary'>{info.getValue()}</Typography>
      }),
      columnHelper.accessor('departamento', {
        header: 'Departamento',
        cell: info => (
          <Typography color='text.secondary'>
            {info.getValue() ?? info.row.original.idDepartamento ?? '—'}
          </Typography>
        )
      }),
      columnHelper.accessor('puesto', {
        header: 'Puesto',
        cell: info => (
          <Typography color='text.secondary'>
            {info.getValue() ?? info.row.original.idPuesto ?? '—'}
          </Typography>
        )
      }),
      columnHelper.accessor('perfil', {
        header: 'Perfil',
        cell: info => (
          <Typography color='text.secondary'>
            {info.getValue() ?? info.row.original.idPerfil ?? '—'}
          </Typography>
        )
      }),
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: Math.ceil(total / PAGE_SIZE)
  });

  // El select solo tiene sentido si hay más de un depto (privilegiado).
  const showDeptSelect = departments.length > 1;

  return (
    <Card>
      <CardHeader
        title='Usuarios'
        action={
          <div className='flex items-center gap-2 flex-wrap'>
            {showDeptSelect && dept !== null && (
              <TextField
                select
                size='small'
                value={String(dept)}
                onChange={e => setDept(e.target.value === ALL_DEPTS ? ALL_DEPTS : Number(e.target.value))}
                className='min-is-[200px]'
              >
                <MenuItem value={ALL_DEPTS}>Todos</MenuItem>
                {departments.map(d => (
                  <MenuItem key={d.idDepartamento} value={String(d.idDepartamento)}>
                    {d.nombre}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <DebouncedSearch value={search} onChange={setSearch} />
            <Tooltip title='Actualizar'>
              <IconButton onClick={() => setRefreshTick(t => t + 1)}>
                <i className='ri-refresh-line' />
              </IconButton>
            </Tooltip>
          </div>
        }
      />

      {error && (
        <Alert severity='error' className='mli-4 mbe-2'>
          {error}
        </Alert>
      )}

      <div className='overflow-x-auto relative'>
        {loading && (
          <div
            className='absolute inset-0 flex items-center justify-center z-10'
            style={{ background: 'rgba(0,0,0,0.04)' }}
          >
            <CircularProgress size={28} />
          </div>
        )}

        <table className={tableStyles.table}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {!loading && rows.length === 0 && !error ? (
              <tr>
                <td colSpan={columns.length} className='text-center'>
                  <Typography className='p-4'>Sin usuarios.</Typography>
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => {
                const isSelected = row.original.idUsuario === selectedId;

                return (
                  <tr
                    key={row.id}
                    onClick={() => onSelect(row.original)}
                    className={classnames('cursor-pointer', { 'bg-actionHover': isSelected })}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        component='div'
        count={total}
        page={pageIndex}
        onPageChange={(_, page) => setPageIndex(page)}
        rowsPerPage={PAGE_SIZE}
        rowsPerPageOptions={[PAGE_SIZE]}
      />
    </Card>
  );
};

export default UsersMaster;
