import { after, NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { withPermission, PERM } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import { piezasValues, safeIds, type Pieza, type PiezaEdit } from '../_shared'
import { onValidacionGuardada } from '../_notify'
import { getVMDetail } from '../_detail'

type RouteCtx = { params: Promise<{ folio: string }> }

// Cabecera editable por el DUEÑO (app).
// Folio NO va aquí: su rename se maneja en el bloque explícito (con trim y guardia de diferencia).
// ES y Fecha también se tratan aparte por conversión de tipo.
const FIELD_MAP_FULL: Record<string, string> = {
  qr: 'Qr',
  idProyecto: 'IdProyecto',
  idTipoMaterial: 'IdTipoMaterial',
  nombreSitio: 'NombreSitio',
  idSitio: 'IdSitio',
  cuentaCliente: 'CuentaCliente',
  aspNombre: 'AspNombre',
  firmaBase64: 'AspFirma',
  nombreContacto: 'NombreContacto',
  idCarrier: 'IdCarrier',
  carrier: 'OtroCarrier',
  idRegion: 'IdRegion',
  idAlmacenDestino: 'IdAlmacenDestino',
  totalPiezas: 'TotalPiezas',
  placasTransporte: 'PlacasTransporte',
  fotoMaterialTransporte: 'MaterialEnTransporteFoto',
  fotoDescargado: 'MaterialDescargadoFoto',
  fotoTransporte: 'TransporteFoto',
  fotoPlacas: 'PlacasFoto',
  materialDocumentos: 'MaterialDocumentos',
  notas: 'Notas',
  numTarimas: 'NumTarimas',
  tarimas: 'Tarimas'
}

// Subconjunto editable por un NO dueño con bit U (edición web/revisión).
// Sin fotos, firma, piezas, tarimas, totalPiezas, región, ES ni Qr. Fecha se permite aparte.
const FIELD_MAP_WEB: Record<string, string> = {
  idProyecto: 'IdProyecto',
  idTipoMaterial: 'IdTipoMaterial',
  nombreSitio: 'NombreSitio',
  idSitio: 'IdSitio',
  cuentaCliente: 'CuentaCliente',
  nombreContacto: 'NombreContacto',
  idCarrier: 'IdCarrier',
  carrier: 'OtroCarrier',
  idAlmacenDestino: 'IdAlmacenDestino',
  notas: 'Notas',
  materialDocumentos: 'MaterialDocumentos'
}

// GET · detalle
export const GET = withPermission<RouteCtx>('material_validation', async (req, { tenantId }, routeCtx) => {
  try {
    const { folio } = await routeCtx.params // conserva tu extracción actual del param

    const record = await getVMDetail(tenantId, folio)

    if (!record) return NextResponse.json({ message: 'Registro no encontrado' }, { status: 404 })

    return NextResponse.json(record)
  } catch (e) {
    console.error('[material-validation/[folio] GET]', e)

    return NextResponse.json({ message: 'Ha ocurrido un error inesperado' }, { status: 500 })
  }
})

// PUT · edición (bit U)
// Modo por pertenencia: DUEÑO -> edición completa (campos + piezas).
// NO DUEÑO con bit U -> edición restringida (subset web, sin piezas) y sella IdUsuarioEditorWeb.
// Diff parcial: solo llegan campos cambiados. No re-valida reglas de negocio.
export const PUT = withPermission<RouteCtx>(
  'material_validation',
  async (req, { auth, tenantId }, routeCtx) => {
    try {
      const { folio } = await routeCtx.params

      if (!folio || !folio.trim()) {
        return NextResponse.json({ message: 'El folio es requerido' }, { status: 400 })
      }

      const b = (await req.json().catch(() => null)) as Record<string, unknown> | null

      if (!b) return NextResponse.json({ message: 'Cuerpo inválido' }, { status: 400 })

      // Fecha (si viene) validada fuera de la transacción.
      let fecha: Date | null = null

      if (b.fecha !== undefined) {
        fecha = new Date(String(b.fecha))

        if (isNaN(fecha.getTime())) {
          return NextResponse.json({ message: 'Fecha inválida' }, { status: 400 })
        }
      }

      const outcome = await withTenantContext(tenantId, async tx => {
        const found = await tx.$queryRaw<Array<{ Id: number; IdUsuario: number; Status: number; Extended: number; Derived: number }>>`
          SELECT VMES.Id, VMES.IdUsuario, VMES.Status,
                (CASE WHEN EXISTS (
                    SELECT 1 FROM dbo.GASOAL_VMOut WHERE TenantID = ${tenantId} AND FolioIN = ${folio}
                  ) THEN 1 ELSE 0 END) AS Extended,
                (CASE WHEN EXISTS (
                    SELECT 1 FROM dbo.GASOAL_VMOut vo WHERE vo.TenantID = ${tenantId} AND vo.IdOut = VMES.Id
                  ) THEN 1 ELSE 0 END) AS Derived
            FROM dbo.GASOAL_VMES VMES
          WHERE VMES.TenantID = ${tenantId} AND VMES.Folio = ${folio}`

        if (found.length === 0) return { status: 404, message: 'Registro no encontrado' }
        const rec = found[0]

        if (rec.Status !== 0) return { status: 409, message: 'El registro no es editable' }
        if (rec.Extended) return { status: 409, message: 'No se puede editar una entrada que ya tiene salida' }
        if (rec.Derived) return { status: 409, message: 'No se puede editar una salida generada desde una entrada' }
        const idVM = rec.Id
        const isOwner = rec.IdUsuario === auth.userId

        // 2) UPDATE de cabecera. Dueño: set completo + ES + piezas. No dueño (con bit U):
        //    subset web, sin ES ni piezas, y sella IdUsuarioEditorWeb.
        const fieldMap = isOwner ? FIELD_MAP_FULL : FIELD_MAP_WEB

        if (!isOwner) {
          const hasWebField = b.fecha !== undefined || Object.keys(FIELD_MAP_WEB).some(k => b[k] !== undefined)

          if (!hasWebField) return { status: 400, message: 'No se enviaron campos para actualizar' }
        }

        const sets: Prisma.Sql[] = [Prisma.sql`FechaEdicion = getdate()`]

        for (const [key, col] of Object.entries(fieldMap)) {
          if (b[key] !== undefined) sets.push(Prisma.sql`${Prisma.raw(col)} = ${b[key] as never}`)
        }

        if (isOwner && b.es !== undefined) sets.push(Prisma.sql`ES = ${b.es === true || b.es === 'true' ? 1 : 0}`)
        if (fecha) sets.push(Prisma.sql`Fecha = ${fecha}`)

        // Folio: editable SOLO por el dueño (Opción A).
        // El registro se resolvió por el folio viejo de la URL; aquí se aplica el nuevo. UNIQUE(TenantID,Folio) -> 409.
        if (isOwner && typeof b.folio === 'string' && b.folio.trim() && b.folio.trim() !== folio) {
          sets.push(Prisma.sql`Folio = ${b.folio.trim()}`)
        }

        if (!isOwner) sets.push(Prisma.sql`IdUsuarioEditorWeb = ${auth.userId}`)

        await tx.$executeRaw`UPDATE dbo.GASOAL_VMES SET ${Prisma.join(sets, ', ')} WHERE Id = ${idVM}`

        // 3) Piezas — solo el dueño. TODA operación acotada por IdVM (cierre Opción A escritura).
        if (isOwner) {
          const mAdd = Array.isArray(b.piezasMotivoAdd) ? (b.piezasMotivoAdd as Pieza[]) : []
          const eAdd = Array.isArray(b.piezasEstadoFAdd) ? (b.piezasEstadoFAdd as Pieza[]) : []

          if (mAdd.length) {
            await tx.$executeRaw`INSERT INTO dbo.GASOAL_VMPiezasMotivo (IdVM, Clave, Piezas) VALUES ${piezasValues(idVM, mAdd, false)}`
          }

          if (eAdd.length) {
            await tx.$executeRaw`INSERT INTO dbo.GASOAL_VMPiezasEstadoF (IdVM, Clave, Piezas) VALUES ${piezasValues(idVM, eAdd, true)}`
          }

          const mDel = safeIds(b.piezasMotivoDel)
          const eDel = safeIds(b.piezasEstadoFDel)

          if (mDel.length) {
            await tx.$executeRaw`DELETE FROM dbo.GASOAL_VMPiezasMotivo WHERE IdVM = ${idVM} AND Id IN (${Prisma.join(mDel)})`
          }

          if (eDel.length) {
            await tx.$executeRaw`DELETE FROM dbo.GASOAL_VMPiezasEstadoF WHERE IdVM = ${idVM} AND Id IN (${Prisma.join(eDel)})`
          }

          const mEdit = Array.isArray(b.piezasMotivoEdit) ? (b.piezasMotivoEdit as PiezaEdit[]) : []
          const eEdit = Array.isArray(b.piezasEstadoFEdit) ? (b.piezasEstadoFEdit as PiezaEdit[]) : []

          for (const p of mEdit) {
            await tx.$executeRaw`UPDATE dbo.GASOAL_VMPiezasMotivo SET Clave = ${Number(p.cl)}, Piezas = ${String(p.pzs)} WHERE Id = ${Number(p.id)} AND IdVM = ${idVM}`
          }

          for (const p of eEdit) {
            await tx.$executeRaw`UPDATE dbo.GASOAL_VMPiezasEstadoF SET Clave = ${String(p.cl)}, Piezas = ${String(p.pzs)} WHERE Id = ${Number(p.id)} AND IdVM = ${idVM}`
          }
        }

        return { status: 200 as const }
      })

      if (outcome.status !== 200) {
        return NextResponse.json({ message: outcome.message }, { status: outcome.status })
      }

      after(() => onValidacionGuardada(tenantId, folio))

      return NextResponse.json({ success: true })
    } catch (e) {
      const msg = String((e as Error)?.message ?? '')

      if (msg.includes('GASOAL_VMES_UQ_Folio') || (/unique/i.test(msg) && /folio/i.test(msg))) {
        return NextResponse.json({ message: 'El folio ya existe para este tenant' }, { status: 409 })
      }

      console.error('[material-validation/[folio] PUT]', e)

      return NextResponse.json({ success: false, message: 'Ha ocurrido un error inesperado' }, { status: 500 })
    }
  },
  { bit: PERM.U }
)
