import { NextResponse } from 'next/server'

import { PERM, withPermission } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { execSp, p, parseSitios, normalizeResumenSitio } from '../_shared'

interface SearchBody {
  re?: boolean | string // 1 = recepción, 0 = entrega
  fechaInicio?: string
  fechaFin?: string
  idUsuario?: number
  idXdock?: number
  idCarrier?: number
}

function toDateOnly(v?: string): string | null {
  if (!v) return null
  const d = new Date(v.trim())

  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10) // YYYY-MM-DD
}

// POST /search — listado filtrado + paginado. POST que LEE (bit R).
// Query: ?pagina=1&limite=10&orden=DESC. Filtros por body (todos opcionales).
// Sitios llega como RESUMEN y se parsea en el server.
export const POST = withPermission(
  'material_logistics',
  async (req: { json: () => Promise<unknown>; url: string | URL }, { tenantId }: { tenantId: string }) => {
    try {
      const body = ((await req.json().catch(() => ({}))) ?? {}) as SearchBody
      const url = new URL(req.url)

      const pagina = Math.max(1, Number(url.searchParams.get('pagina')) || 1)
      const limite = Math.min(100, Math.max(1, Number(url.searchParams.get('limite')) || 10))
      const orden = url.searchParams.get('orden')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

      // RE es tri-estado: undefined = ambos; true/false = filtrar.
      const re = body.re === undefined ? null : body.re === true || body.re === 'true' ? 1 : 0

      const params = [
        p('@TenantID', tenantId),
        p('@IdUsuario', body.idUsuario ?? null),
        p('@IdXdock', body.idXdock ?? null),
        p('@FechaInicio', toDateOnly(body.fechaInicio)),
        p('@FechaFin', toDateOnly(body.fechaFin)),
        p('@RE', re),
        p('@IdCarrier', body.idCarrier ?? null),
        p('@Pagina', pagina),
        p('@Limite', limite),
        p('@Orden', orden),
      ]

      type Row = Record<string, unknown> & { TotalRows?: number | bigint; Sitios?: unknown }

      const rows = await withTenantContext(tenantId, tx =>
        tx.$queryRaw<Row[]>(execSp('dbo.usp_LM_GetList', params)),
      )

      // COUNT(*) OVER() = total del set filtrado ANTES del OFFSET/FETCH.
      const total = rows.length
        ? (typeof rows[0].TotalRows === 'bigint' ? Number(rows[0].TotalRows) : rows[0].TotalRows) ?? 0
        : 0

      const items = rows.map(({ TotalRows, Sitios, ...rest }) => ({
        ...rest,
        sitios: parseSitios<Record<string, unknown>>(Sitios).map(normalizeResumenSitio),
      }))

      return NextResponse.json({ rows: items, total, pagina, limite })
    } catch (e) {
      console.error('[material-logistics/search]', e)

      return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 })
    }
  },
  { bit: PERM.R },
)
