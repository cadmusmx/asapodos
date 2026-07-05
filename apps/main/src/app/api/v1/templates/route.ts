import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
      try {
            const { searchParams } = new URL(req.url)
            const type = searchParams.get('type') ?? ''

            if (type === 'all') {
                  const data = await queryRaw`SELECT IdPlantilla, Descripcion FROM Cat_Plantillas`

                  return NextResponse.json({ result: data })
            }

            if (type === 'detalle') {
                  const IdWO = searchParams.get('IdWO')
                  const IdPlantilla = searchParams.get('IdPlantilla')

                  if (!IdWO || !IdPlantilla) throw new Error('IdWO and IdPlantilla required')

                  const data = await queryRaw`
        SELECT ID, IdWO, IdPlantilla, jsonDetalle
        FROM WorkOrders_Plantilla_Detalle_JSON
        WHERE IdWO = ${parseInt(IdWO, 10)} AND IdPlantilla = ${parseInt(IdPlantilla, 10)}
        ORDER BY LEN(ID), ID`

                  return NextResponse.json({ result: data })
            }

            if (type === 'print') {
                  const idWO = searchParams.get('id')

                  if (!idWO) throw new Error('id required')

                  const data = await queryRaw`
        SELECT * FROM Autos_Plantilla_Detalle_JSON WHERE IdUsuario = ${parseInt(idWO, 10)}`

                  return serversideResponse(data)
            }

            if (type === 'nombres_autos') {
                  const data = await queryRaw`SELECT DISTINCT Descripcion FROM Cat_Plantillas WHERE IdPerfil = 6`

                  return NextResponse.json({ result: data })
            }

            const idPlantilla = searchParams.get('idPlantilla')

            if (idPlantilla) {
                  const data = await queryRaw`SELECT * FROM Cat_Plantillas WHERE IdPlantilla = ${parseInt(idPlantilla, 10)}`

                  return NextResponse.json({ result: data })
            }

            return NextResponse.json({ message: 'Invalid request' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}

export async function POST(req: Request) {
      try {
            const body = await req.json()
            const { type } = body

            if (type === 'getPlantillaWO_WEB') {
                  const { Id_WO, Id_Plantilla } = body
                  const data = await queryRaw`EXEC [getPlantillaWo_web] @id_wo=${Id_WO}, @id_plantilla=${Id_Plantilla}`

                  return NextResponse.json({ result: data })
            }

            if (type === 'insertUpdateDataPlantillaWO_WEB') {
                  const { Id_WO, Id_Plantilla, Json_Detalle } = body

                  const data =
                        await queryRaw`EXEC [insertUpdate_Plantilla_wo] @Id_WO=${Id_WO}, @Id_Plantilla=${Id_Plantilla}, @Json_Detalle=${Json_Detalle}`

                  const resultado = (data as unknown as Array<{ Resultado: string }>)?.[0]?.Resultado ?? ''

                  return NextResponse.json({ result: resultado })
            }

            if (type === 'updatePlantillaWO') {
                  const { Id_WO, Id_Plantilla, Id_UsuarioOld, Id_UsuarioNew } = body

                  const data =
                        await queryRaw`EXEC [updatePlantilla_wo] @id_wo=${Id_WO}, @id_plantilla=${Id_Plantilla}, @Id_UsuarioOld=${Id_UsuarioOld}, @Id_UsuarioNew=${Id_UsuarioNew}`

                  const resultado = (data as unknown as Array<{ Resultado: string }>)?.[0]?.Resultado ?? ''

                  return NextResponse.json({ result: resultado })
            }

            if (type === 'updateWOPlantillaDetalleJson') {
                  const jsonData = typeof body.jsonData === 'string' ? JSON.parse(body.jsonData) : body.jsonData

                  for (const item of jsonData) {
                        const { IdWO, IdPlantilla, jsonDetalle } = item

                        await queryRaw`
          UPDATE WorkOrders_Plantilla_Detalle_JSON
          SET jsonDetalle = ${JSON.stringify(jsonDetalle)}
          WHERE IdWO = ${IdWO} AND IdPlantilla = ${IdPlantilla}`
                  }

                  return NextResponse.json({ data: true, msj: 'Se insertaron las plantillas correctamente' })
            }

            return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}
