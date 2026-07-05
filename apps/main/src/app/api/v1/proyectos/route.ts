import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
      try {
            const { searchParams } = new URL(req.url)
            const type = searchParams.get('type') ?? ''

            if (type === 'almacenes') {
                  const Region = searchParams.get('Region')

                  if (Region) {
                        const data = await queryRaw`SELECT * FROM Almacenes WHERE IdRegion = ${parseInt(Region, 10)} AND Estatus = 1`

                        return NextResponse.json({ result: data })
                  }

                  const data = await queryRaw`SELECT * FROM Almacenes WHERE Estatus = 1`

                  return NextResponse.json({ result: data })
            }

            if (type === 'sitiosPorUsuario') {
                  const IdUsuario = searchParams.get('IdUsuario')

                  if (!IdUsuario) throw new Error('IdUsuario required')
                  const data = await queryRaw`SELECT * FROM Rel_Sit_Usu WHERE IdUsuario = ${parseInt(IdUsuario, 10)}`

                  return NextResponse.json({ result: data })
            }

            if (type === 'loginStatus') {
                  const data = await queryRaw`EXEC SP_getEstatusLogin`

                  return NextResponse.json({ result: data })
            }

            if (type === 'initNuevoSitio') {
                  const data = await queryRaw`
        SELECT IdReg, NombreReg FROM Cat_Regiones WHERE Status = 1;
        SELECT IdPrioridad, Descripcion FROM Cat_Prioridad;
        SELECT IdTipoSitio, Descripcion FROM Cat_TipoSitio WHERE Status = 1`

                  return NextResponse.json({ result: data })
            }

            if (type === 'wodelete') {
                  const IdUsuario = searchParams.get('IdUsuario')

                  if (!IdUsuario) throw new Error('IdUsuario required')
                  const data = await queryRaw`SELECT * FROM WODeleteCatDeleteMovil WHERE IdUsuario = ${parseInt(IdUsuario, 10)}`

                  return serversideResponse(data)
            }

            return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}

export async function POST(req: Request) {
      try {
            const body = await req.json()
            const { type } = body

            if (type === 'finalizarWO') {
                  const { IdWOSend } = body

                  await queryRaw`UPDATE WorkOrders_Tickets SET Status = 4, FechaFinalizado = GETDATE() WHERE IdWO = ${IdWOSend}; INSERT INTO Log_WO VALUES (${IdWOSend}, GETDATE(), 4)`

                  return NextResponse.json({ data: true })
            }

            if (type === 'deleteWOCatDeleteMovil') {
                  const { IdUsuario, cadenaNotIn } = body

                  await queryRaw`DELETE FROM WODeleteCatDeleteMovil WHERE IdUsuario = ${IdUsuario} AND IdWO NOT IN (${cadenaNotIn})`

                  return NextResponse.json({ data: true })
            }

            if (type === 'updateLogRegistroWO') {
                  const { jsonData } = body
                  const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData

                  for (const item of data) {
                        await queryRaw`UPDATE WorkOrders_Plantilla_Detalle_JSON SET Estatus = ${item.Estatus} WHERE ID = ${item.ID}`
                  }

                  return NextResponse.json({ data: true })
            }

            return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}
