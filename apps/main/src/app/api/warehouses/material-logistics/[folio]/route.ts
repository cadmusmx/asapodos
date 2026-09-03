import { NextResponse } from 'next/server'

import { withPermission } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import type { Sitio, SitioEdit, Documento } from '../_shared'
import {
  execSp, isMissing, p, parseSitios,
  validateSitio, validateSitioEdit, validateDocumentos, checkSitiosDuplicados,
} from '../_shared'

type RouteCtx = { params: Promise<{ folio: string }> }

// GET /[folio] — detalle jerárquico (bit R). Sitios completo, parseado (D11).
export const GET = withPermission<RouteCtx>(
  'material_logistics',
  async (_req, { tenantId }, routeCtx) => {
    try {
      const { folio } = await routeCtx.params

      if (!folio || !folio.trim()) {
        return NextResponse.json({ message: 'El folio es requerido' }, { status: 400 })
      }

      const rows = await withTenantContext(tenantId, tx =>
        tx.$queryRaw<Array<Record<string, unknown>>>(
          execSp('dbo.usp_LM_GetByFolio', [p('@TenantID', tenantId), p('@Folio', folio.trim())]),
        ),
      )

      if (rows.length === 0) {
        return NextResponse.json({ message: 'Registro no encontrado' }, { status: 404 })
      }

      const { Sitios, Documentos, Entregas, ...cabecera } = rows[0]

      return NextResponse.json({
        ...cabecera,
        sitios: parseSitios(Sitios),
        documentos: parseSitios(Documentos), // mismo parser: string JSON -> array
        entregas: parseSitios(Entregas), // [S1] entregas de la recepción (1..N)
      })
    } catch (e) {
      console.error('[material-logistics/[folio] GET]', e)

      return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 })
    }
  },
)

interface UpdateBody {
  fecha?: string
  idXdock?: number
  nombreResponsable?: string // '' = limpiar (usar nombre de usuario) undefined = sin cambio
  unidadPlaca?: string
  nombreOperador?: string
  horaLlegada?: string
  horaInicioDescarga?: string
  horaSalida?: string
  idCarrier?: number
  otroCarrier?: string
  documentos?: Documento[] // reemplazo completo: [] limpia, ausente = sin cambio
  sitiosDel?: number[]
  sitiosAdd?: Sitio[]
  sitiosEdit?: SitioEdit[]
}

// PUT /[folio] — edición (bit U). D6: SOLO EL DUEÑO edita (la guardia vive en el SP,
// que resuelve por TenantID + IdUsuario y lanza 50010 si no coincide -> 404 aquí).
// D12: la URL trae folio el SP recibe IdLogistica, así que se resuelve folio->Id
// dentro de la misma tx antes del EXEC.
export const PUT = withPermission<RouteCtx>(
  'material_logistics',
  async (req, { auth, tenantId }, routeCtx) => {
    try {
      const { folio } = await routeCtx.params

      if (!folio || !folio.trim()) {
        return NextResponse.json({ message: 'El folio es requerido' }, { status: 400 })
      }

      const b = (await req.json().catch(() => null)) as UpdateBody | null

      if (!b) return NextResponse.json({ message: 'Cuerpo inválido' }, { status: 400 })

      // Validación de sitios que se agregan (encabezado + hijos completos).
      const sitiosAdd = Array.isArray(b.sitiosAdd) ? b.sitiosAdd : []

      for (const s of sitiosAdd) {
        const err = validateSitio(s)

        if (err) return NextResponse.json({ message: err }, { status: 400 })
      }

      if (sitiosAdd.length > 0 && checkSitiosDuplicados(sitiosAdd)) {
        return NextResponse.json({ message: 'Hay sitios duplicados (idSitio + nombreSitio)' }, { status: 400 })
      }

      // Validación de sitios editados (id + encabezado hijos van como diff).
      const sitiosEdit = Array.isArray(b.sitiosEdit) ? b.sitiosEdit : []

      for (const s of sitiosEdit) {
        const err = validateSitioEdit(s)

        if (err) return NextResponse.json({ message: err }, { status: 400 })
      }

      // Documentos (DA3): reemplazo completo. Ausente = sin cambio [] = limpiar.
      // Solo se valida si el cliente los envió (undefined -> no se toca la columna).
      if (b.documentos !== undefined) {
        const docErr = validateDocumentos(b.documentos)

        if (docErr) return NextResponse.json({ message: docErr }, { status: 400 })
      }

      // Carrier "Otro" (si cambia): validar por catálogo.
      if (b.idCarrier !== undefined) {
        const esOtro = await withTenantContext(tenantId, async tx => {
          const r = await tx.$queryRaw<Array<{ EsOtro: boolean }>>`
            SELECT EsOtro FROM dbo.Cat_Carriers WHERE Id = ${b.idCarrier}`

          return r[0]?.EsOtro ?? null
        })

        if (esOtro === null) return NextResponse.json({ message: 'El carrier no existe' }, { status: 400 })

        if (esOtro && isMissing(b.otroCarrier)) {
          return NextResponse.json({ message: 'Falta el carrier (Otro)' }, { status: 400 })
        }
      }

      const outcome = await withTenantContext(tenantId, async tx => {
        // D12: resolver folio -> Id dentro de la misma tx (RLS ya acota al tenant).
        const found = await tx.$queryRaw<Array<{ Id: number }>>`
          SELECT Id FROM dbo.GASOAL_LM WHERE TenantID = ${tenantId} AND Folio = ${folio.trim()}`

        if (found.length === 0) return { status: 404 as const, message: 'Registro no encontrado' }
        const idLogistica = found[0].Id

        // EXEC usp_LM_Update. La guardia de dueño (D6) y la de XDOCK viven en el SP.
        const params = [
          p('@TenantID', tenantId),
          p('@IdLogistica', idLogistica),
          p('@IdUsuario', auth.userId),
          p('@Fecha', b.fecha ?? null),
          p('@IdXdock', b.idXdock ?? null),
          p('@NombreResponsable', b.nombreResponsable ?? null),
          p('@UnidadPlaca', b.unidadPlaca ?? null),
          p('@NombreOperador', b.nombreOperador ?? null),
          p('@HoraLlegada', b.horaLlegada ?? null),
          p('@HoraInicioDescarga', b.horaInicioDescarga ?? null),
          p('@HoraSalida', b.horaSalida ?? null),
          p('@IdCarrier', b.idCarrier ?? null),
          p('@OtroCarrier', b.otroCarrier ?? null),

          // undefined -> null = sin cambio; array (incl. []) -> JSON = reemplazo/limpieza
          p('@Documentos', b.documentos === undefined ? null : JSON.stringify(b.documentos)),
          p('@SitiosDel', b.sitiosDel ? JSON.stringify(b.sitiosDel) : null),
          p('@SitiosAdd', sitiosAdd.length ? JSON.stringify(sitiosAdd) : null),
          p('@SitiosEdit', sitiosEdit.length ? JSON.stringify(sitiosEdit) : null),
        ]

        await tx.$executeRaw(execSp('dbo.usp_LM_Update', params))

        return { status: 200 as const }
      })

      if (outcome.status !== 200) {
        return NextResponse.json({ message: outcome.message }, { status: outcome.status })
      }

      return NextResponse.json({ success: true })
    } catch (e) {
      return mapUpdateError(e)
    }
  },
)

// Traduce THROW de usp_LM_Update. 50010 (no dueño/no existe) -> 404
// 50021 (XDOCK) / 50022 (carrier) -> 400.
function mapUpdateError(e: unknown): NextResponse {
  const msg = e instanceof Error ? e.message : String(e)

  if (msg.includes('50010')) return NextResponse.json({ message: 'Registro no encontrado' }, { status: 404 })
  if (msg.includes('50021')) return NextResponse.json({ message: 'El XDOCK no existe o no pertenece al tenant' }, { status: 400 })
  if (msg.includes('50022')) return NextResponse.json({ message: 'El carrier no existe' }, { status: 400 })
  if (msg.includes('50024')) return NextResponse.json({ message: 'Documentos no es un JSON válido' }, { status: 400 })

  console.error('[material-logistics/[folio] PUT]', msg)

  return NextResponse.json({ success: false, message: 'Ha ocurrido un error inesperado' }, { status: 500 })
}
