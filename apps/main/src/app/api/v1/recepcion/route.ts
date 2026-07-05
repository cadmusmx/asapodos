import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse, requireTenantId, setTenantContextForRequest } from '@/lib/api-utils'

export async function POST(req: Request) {
  try {
    const tenantId = requireTenantId(req)

    await setTenantContextForRequest(req)
    const body = await req.json()
    const { type } = body

    if (type === 'recepcionMaterial') {
      const {
        idUsuario,
        folio,
        idProyecto,
        idTipoMaterial,
        fecha,
        aspNombre,
        nombreContacto,
        idRegion,
        idAlmacen,
        numTarimas,
        notas,
        fotoRecibido,
        firmaBase64
      } = body

      await queryRaw`
        INSERT INTO GASOAL_Recepcion (IdUsuario, Folio, IdProyecto, IdTipoMaterial, Fecha, AspNombre, NombreContacto, IdRegion, IdAlmacen, NumTarimas, Notas, FotoRecibido, FirmaReceptor, FechaCaptura, TenantID)
        VALUES (${idUsuario}, ${folio}, ${idProyecto}, ${idTipoMaterial}, ${fecha}, ${aspNombre}, ${nombreContacto}, ${idRegion}, ${idAlmacen}, ${numTarimas}, ${notas}, ${fotoRecibido}, ${firmaBase64}, GETDATE(), ${tenantId})`

      return NextResponse.json({ success: true })
    }

    if (type === 'getRecepciones') {
      const { folio, idUsuario, fechaInicioFin } = body
      const filters = [`R.TenantID = '${tenantId}'`]

      if (folio) filters.push(`R.Folio LIKE '%${folio}%'`)
      if (idUsuario) filters.push(`R.IdUsuario = ${idUsuario}`)

      const where = `WHERE ${filters.join(' AND ')}`

      const data = await queryRaw`
        SELECT R.*, U.NombreUsuario, P.ProyectoNombre
        FROM GASOAL_Recepcion R
        LEFT JOIN GASOCO_Cat_Usuarios U ON R.IdUsuario = U.IdUsuario
        LEFT JOIN GASOCO_Cat_Proyectos P ON R.IdProyecto = P.Id
        ${where}
        ORDER BY R.FechaCaptura DESC`

      return serversideResponse(data)
    }

    if (type === 'getRecepcionByFolio') {
      const { folio } = body
      const data = await queryRaw`SELECT * FROM GASOAL_Recepcion WHERE Folio = ${folio} AND TenantID = '${tenantId}'`

      return NextResponse.json({ result: data })
    }

    return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
  } catch (e: any) {
    if (e.name === 'TenantError') {
      return NextResponse.json({ message: e.message }, { status: 403 })
    }

    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}
