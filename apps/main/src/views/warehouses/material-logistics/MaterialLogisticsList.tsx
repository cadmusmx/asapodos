'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// Next Imports
import { useParams, useRouter } from 'next/navigation'

// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid2'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import Button from '@mui/material/Button'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import ToggleButton from '@mui/material/ToggleButton'
import TablePagination from '@mui/material/TablePagination'
import Alert from '@mui/material/Alert'

// Third-party Imports
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'

// Style Imports
import styles from '@core/styles/table.module.css'

import type { XdockRow, CarrierRow } from '@/app/api/warehouses/material-logistics/catalogs/route'
import ExportDialog from '@/components/export/ExportDialog'
import OutFolioModal from './components/OutFolioModal'


// Resumen por sitio que devuelve /search (D10-B).
interface SitioResumen {
  id: number
  idSitio: string
  nombreSitio: string
  materialFaltante: boolean
  nIncidencias: number
  nEvidencias: number
  nTarimas: number
}

interface LMRow {
  Id: number
  Folio: string
  Fecha: string
  Responsable: string
  Xdock: string
  IdCarrier: number
  Carrier: string
  EsOtro: boolean
  OtroCarrier: string | null
  UnidadPlaca: string
  NombreOperador: string
  HoraLlegada: string
  HoraInicioDescarga: string
  HoraSalida: string
  FechaCreacion: string
  RE: boolean
  Vinculado: number | null
  Extended: boolean      // [S1] recepción con ≥1 entrega
  Closed: boolean        // [S1] recepción sin sitios pendientes
  EsDerivada: boolean    // [S1] la fila es una entrega
  IdIN: number | null    // [S1] recepción de origen (cuando EsDerivada)
  FolioIN: string | null
  nDocumentos: number
  nEntregas: number
  sitios: SitioResumen[]
}

interface Catalogs {
  xdocks: XdockRow[]
  carriers: CarrierRow[]
}

const EMPTY_CATALOGS: Catalogs = { xdocks: [], carriers: [] }

// Suma un campo numérico del resumen de sitios.
const sumSitios = (sitios: SitioResumen[], key: 'nIncidencias' | 'nEvidencias' | 'nTarimas'): number =>
  sitios.reduce((acc, s) => acc + (s[key] ?? 0), 0)

const carrierLabel = (row: LMRow): string => (row.EsOtro ? row.OtroCarrier ?? '' : row.Carrier)

const fmtFecha = (iso?: string): string => {
  if (!iso) return '—'
  const d = new Date(iso)

  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-MX')
}

const columnHelper = createColumnHelper<LMRow>()

const MaterialLogisticsList = ({ canCreate }: { canCreate: boolean }) => {
  const router = useRouter()
  const { lang } = useParams()

  // Todas las vistas se abren en pestaña nueva (regla transversal).
  const detailHref = (folio: string) =>
    `/${lang}/warehouses/material-logistics/${encodeURIComponent(folio)}`

  const goCatalogs = () => router.push(`/${lang}/warehouses/material-logistics/catalogos`)

  // Filtros. RE es el eje principal (recepción vs entrega), igual que el legacy.
  const [re, setRe] = useState(true) // true = recepción, false = entrega
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [xdock, setXdock] = useState('')
  const [carrier, setCarrier] = useState('')

  // Paginación (0-indexed en TanStack la API es 1-indexed).
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(10)

  const [catalogs, setCatalogs] = useState<Catalogs>(EMPTY_CATALOGS)
  const [rows, setRows] = useState<LMRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [outModalOpen, setOutModalOpen] = useState(false)

  const resetToFirst = () => setPageIndex(0)

  // Catálogos de filtro (una vez).
  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/warehouses/material-logistics/catalogs', { signal: controller.signal })
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('No se pudieron cargar los catálogos'))))
      .then((json: { xdocks: XdockRow[]; carriers: CarrierRow[] }) =>
        setCatalogs({ xdocks: json.xdocks ?? [], carriers: json.carriers ?? [] })
      )
      .catch(e => {
        if ((e as Error).name !== 'AbortError') setError((e as Error).message)
      })

    return () => controller.abort()
  }, [])

  // Listado.
  useEffect(() => {
    const controller = new AbortController()

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          pagina: String(pageIndex + 1),
          limite: String(pageSize),
          orden: 'DESC'
        })

        const body: Record<string, unknown> = { re }

        if (fechaInicio) body.fechaInicio = fechaInicio
        if (fechaFin) body.fechaFin = fechaFin
        if (xdock) body.idXdock = Number(xdock)
        if (carrier) body.idCarrier = Number(carrier)

        const res = await fetch(`/api/warehouses/material-logistics/search?${params.toString()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        })

        if (res.status === 403) throw new Error('No tienes permiso para ver este módulo.')
        if (!res.ok) throw new Error('No se pudo cargar el listado.')

        const json = (await res.json()) as { rows: LMRow[]; total: number }

        setRows(json.rows ?? [])
        setTotal(json.total ?? 0)
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          setError((e as Error).message)
          setRows([])
          setTotal(0)
        }
      } finally {
        setLoading(false)
      }
    }

    load()

    return () => controller.abort()
  }, [re, fechaInicio, fechaFin, xdock, carrier, pageIndex, pageSize])

  const columns = useMemo(
    () => [
      columnHelper.accessor('Folio', { header: 'Folio' }),
      columnHelper.accessor('Responsable', { header: 'Responsable', cell: i => i.getValue() || '—' }),
      columnHelper.accessor('Fecha', { header: 'Fecha' }),
      columnHelper.accessor('Xdock', { header: 'XDOCK' }),
      columnHelper.display({
        id: 'carrier',
        header: 'Carrier',
        cell: ({ row }) => {
          const r = row.original
          const label = carrierLabel(r)

          if (!label) return '—'

          return r.EsOtro ? (
            <Tooltip title='Carrier fuera de catálogo'>
              <span className='underline decoration-dotted cursor-help'>{label}</span>
            </Tooltip>
          ) : (
            <span>{label}</span>
          )
        },
      }),
      columnHelper.accessor('UnidadPlaca', { header: 'Unidad / Placa' }),
      columnHelper.accessor('NombreOperador', { header: 'Operador' }),
      columnHelper.accessor('HoraLlegada', { header: 'Llegada' }),
      columnHelper.accessor('HoraInicioDescarga', { header: 'Inicio descarga' }),
      columnHelper.accessor('HoraSalida', { header: 'Salida' }),
      columnHelper.display({
        id: 'sitios',
        header: 'Sitios',
        cell: ({ row }) => row.original.sitios.length,
      }),
      columnHelper.display({
        id: 'faltante',
        header: 'Faltante',
        cell: ({ row }) => {
          const conFaltante = row.original.sitios.filter(s => s.materialFaltante).length

          return conFaltante > 0 ? (
            <Chip size='small' color='warning' variant='tonal' label={`Sí (${conFaltante})`} />
          ) : (
            <Chip size='small' variant='tonal' label='No' />
          )
        },
      }),
      columnHelper.display({
        id: 'incidencias',
        header: 'Incidencias',
        cell: ({ row }) => sumSitios(row.original.sitios, 'nIncidencias'),
      }),
      columnHelper.display({
        id: 'evidencias',
        header: 'Evidencias',
        cell: ({ row }) => sumSitios(row.original.sitios, 'nEvidencias'),
      }),
      columnHelper.accessor('nDocumentos', { header: 'Docs' }),
      columnHelper.display({
        id: 'vinculo',
        header: 'Vínculo',
        cell: ({ row }) =>
          row.original.Vinculado == null ? (
            <Chip size='small' color='warning' variant='tonal' label='No vinculada' />
          ) : (
            <Chip size='small' color='success' variant='tonal' label='Vinculada' />
          ),
      }),
      columnHelper.accessor('FechaCreacion', { header: 'Captura', cell: i => fmtFecha(i.getValue()) }),
      columnHelper.display({
        id: 'estadoEntrega',
        header: 'Entregas',
        cell: ({ row }) => {
          const r = row.original

          if (!r.RE || !r.Extended) return <>—</>

          const n = `${r.nEntregas} ${r.nEntregas === 1 ? 'entrega' : 'entregas'}`

          return (
            <Chip
              size='small'
              variant='tonal'
              color={r.Closed ? 'success' : 'warning'}
              label={r.Closed ? `${n} · Completa` : `${n} · Parcial`}
            />
          )
        },
      }),
      columnHelper.display({
        id: 'acciones',
        header: 'Acciones',
        cell: ({ row }) => {
          const r = row.original

          return (
            <div className='flex items-center gap-2'>
              <Button
                size='small'
                variant='outlined'
                color='info'
                component='a'
                href={detailHref(r.Folio)}
                target='_blank'
                rel='noopener noreferrer'
              >
                Detalle
              </Button>

              {/* Recepción con sitios pendientes → entregar (bit W) */}
              {canCreate && r.RE && !r.Closed && (
                <Button
                  size='small'
                  variant='outlined'
                  component='a'
                  href={`${detailHref(r.Folio)}/out`}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Entregar
                </Button>
              )}

              {/* Entrega derivada → ver recepción de origen */}
              {r.EsDerivada && r.FolioIN && (
                <Button
                  size='small'
                  variant='outlined'
                  color='secondary'
                  component='a'
                  href={detailHref(r.FolioIN)}
                  target='_blank'
                  rel='noopener noreferrer'
                >
                  Ver recepción
                </Button>
              )}
            </div>
          )
        },
      }),
    ],

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    rowCount: total,
    state: { pagination: { pageIndex, pageSize } },
  })

  const exportParams: Record<string, string> = {
    re: String(re),
    ...(xdock ? { idXdock: String(xdock) } : {}),
    ...(carrier ? { idCarrier: String(carrier) } : {}),
  }

  const exportChips = [
    re ? 'Recepciones' : 'Entregas',
    xdock && `XDOCK: ${catalogs.xdocks.find(x => x.Id === Number(xdock))?.Nombre}`,
    carrier && `Carrier: ${catalogs.carriers.find(c => c.Id === Number(carrier))?.Carrier}`,
  ].filter(Boolean) as string[]

  return (
    <>
      <Card>
        <CardHeader
          title='Logística de Material'
          subheader='Varios Sitios, XDOCK, Control de arribo'
          action={
            <div className='flex gap-4'>
              {canCreate && (
                <Button size='small' variant='contained' onClick={() => setOutModalOpen(true)}>
                  Entrega por folio
                </Button>
              )}
              <Button size='small' variant='outlined' color='secondary' onClick={goCatalogs}>Catálogos</Button>
              <Button size='small' variant='outlined' color='success' startIcon={<i className='ri-file-excel-2-line' />} onClick={() => setExportOpen(true)}>
                Exportar
              </Button>
              <ToggleButtonGroup
                exclusive
                size='small'
                value={re}
                onChange={(_, v) => {
                  if (v !== null) {
                    setRe(v)
                    resetToFirst()
                  }
                }}
              >
                <ToggleButton value={true}>Recepción</ToggleButton>
                <ToggleButton value={false}>Entrega</ToggleButton>
              </ToggleButtonGroup>
            </div>
          }
        />
        <CardContent>
          <Grid container spacing={4} className='mbe-4'>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size='small'
                type='date'
                label='Desde'
                slotProps={{ inputLabel: { shrink: true } }}
                value={fechaInicio}
                onChange={e => {
                  setFechaInicio(e.target.value)
                  resetToFirst()
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                fullWidth
                size='small'
                type='date'
                label='Hasta'
                slotProps={{ inputLabel: { shrink: true } }}
                value={fechaFin}
                onChange={e => {
                  setFechaFin(e.target.value)
                  resetToFirst()
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                fullWidth
                size='small'
                label='XDOCK'
                value={xdock}
                onChange={e => {
                  setXdock(e.target.value)
                  resetToFirst()
                }}
              >
                <MenuItem value=''>Todos</MenuItem>
                {catalogs.xdocks.map(x => (
                  <MenuItem key={x.Id} value={String(x.Id)}>
                    {x.Nombre}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <TextField
                select
                fullWidth
                size='small'
                label='Carrier'
                value={carrier}
                onChange={e => {
                  setCarrier(e.target.value)
                  resetToFirst()
                }}
              >
                <MenuItem value=''>Todos</MenuItem>
                {catalogs.carriers.map(c => (
                  <MenuItem key={c.Id} value={String(c.Id)}>
                    {c.Carrier}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {error && (
            <Alert severity='error' className='mbe-4'>
              {error}
            </Alert>
          )}

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
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        exportBaseUrl='/api/warehouses/material-logistics/export/xlsx'
        baseParams={exportParams}
        filterChips={exportChips}
        initialFechaInicio={fechaInicio}
        initialFechaFin={fechaFin}
      />
      <OutFolioModal open={outModalOpen} onClose={() => setOutModalOpen(false)} lang={String(lang)} />
    </>
  )
}

export default MaterialLogisticsList
