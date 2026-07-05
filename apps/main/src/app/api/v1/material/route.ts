import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse, requireTenantId, setTenantContextForRequest } from '@/lib/api-utils'

export async function GET(req: Request) {
      try {
            const tenantId = requireTenantId(req)

            await setTenantContextForRequest(req)
            const { searchParams } = new URL(req.url)
            const type = searchParams.get('type') ?? ''

            if (type === 'almacenes') {
                  const data = await queryRaw`SELECT * FROM GASOAL_Almacenes WHERE Estatus = 1 AND TenantID = '${tenantId}'`

                  return NextResponse.json({ result: data })
            }

            if (type === 'vmProyectos') {
                  const data = await queryRaw`SELECT * FROM GASOCO_Cat_Proyectos WHERE Estatus = 1 AND TenantID = '${tenantId}'`

                  return NextResponse.json({ result: data })
            }

            if (type === 'vmMotivos') {
                  const data = await queryRaw`SELECT * FROM GASOAL_Cat_Motivos WHERE TenantID = '${tenantId}'`

                  return NextResponse.json({ result: data })
            }

            if (type === 'vmEstadosF') {
                  const data = await queryRaw`SELECT * FROM GASOAL_Cat_EstadoFactura WHERE TenantID = '${tenantId}'`

                  return NextResponse.json({ result: data })
            }

            if (type === 'vmTiposMaterial') {
                  const data = await queryRaw`SELECT * FROM GASOAL_Cat_TipoMaterial WHERE TenantID = '${tenantId}'`

                  return NextResponse.json({ result: data })
            }

            if (type === 'vmCarrier') {
                  const data = await queryRaw`SELECT * FROM GASOAL_Cat_Carrier WHERE TenantID = '${tenantId}'`

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

export async function POST(req: Request) {
      try {
            const tenantId = requireTenantId(req)

            await setTenantContextForRequest(req)
            const body = await req.json()
            const { type } = body

            if (type === 'materialEntradaSalida') {
                  const {
                        es,
                        idUsuario,
                        folio,
                        idProyecto,
                        idTipoMaterial,
                        nombreSitio,
                        idSitio,
                        cuentaCliente,
                        fecha,
                        aspNombre,
                        nombreContacto,
                        idCarrier,
                        idRegion,
                        idAlmacenDestino,
                        totalPiezas,
                        placasTransporte
                  } = body

                  await queryRaw`
        INSERT INTO GASOAL_Material (IdUsuario, Folio, IdProyecto, IdTipoMaterial, NombreSitio, IdSitio, CuentaCliente, Fecha, AspNombre, NombreContacto, IdCarrier, IdRegion, IdAlmacenDestino, TotalPiezas, PlacasTransporte, TipoMovimiento, FechaCaptura, TenantID)
        VALUES (${idUsuario}, ${folio}, ${idProyecto}, ${idTipoMaterial}, ${nombreSitio}, ${idSitio}, ${cuentaCliente}, ${fecha}, ${aspNombre}, ${nombreContacto}, ${idCarrier}, ${idRegion}, ${idAlmacenDestino}, ${totalPiezas}, ${placasTransporte}, ${es ? 'E' : 'S'}, GETDATE(), ${tenantId})`

                  return NextResponse.json({ success: true })
            }

            if (type === 'getMaterialEntradaSalida') {
                  const { folio, idUsuario, fechaInicioFin } = body
                  const filters = [`M.TenantID = '${tenantId}'`]

                  if (folio) filters.push(`M.Folio LIKE '%${folio}%'`)
                  if (idUsuario) filters.push(`M.IdUsuario = ${idUsuario}`)

                  const where = `WHERE ${filters.join(' AND ')}`

                  const data = await queryRaw`
        SELECT M.*, U.NombreUsuario, P.ProyectoNombre
        FROM GASOAL_Material M
        LEFT JOIN GASOCO_Cat_Usuarios U ON M.IdUsuario = U.IdUsuario
        LEFT JOIN GASOCO_Cat_Proyectos P ON M.IdProyecto = P.Id
        ${where}
        ORDER BY M.FechaCaptura DESC`

                  return serversideResponse(data)
            }

            if (type === 'getByFolio') {
                  const { folio } = body
                  const data = await queryRaw`SELECT * FROM GASOAL_Material WHERE Folio = ${folio} AND TenantID = '${tenantId}'`

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
