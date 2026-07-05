import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
      try {
            const { searchParams } = new URL(req.url)
            const type = searchParams.get('type') ?? ''
            const idUsuario = searchParams.get('idUsuario')

            if (type === 'all') {
                  const data = await queryRaw`
        SELECT a.IdAuto, a.Serial, a.Modelo, a.Placas, a.Kilometraje, a.Motor, a.Color, a.IdUsuario,
               u.NombreUsuario, u.NumCelular, u.Email, u.IdEmpresa, u.IdCuadrilla, va.Descripcion
        FROM Cat_Autos a
        LEFT JOIN Cat_Usuarios u ON a.IdUsuario = u.IdUsuario
        LEFT JOIN Cat_VersionAuto va ON a.IdMarca = va.IdMarca
        WHERE u.Estatus = 'A' AND u.IdFLM = 1`

                  return serversideResponse(data)
            }

            if (type === 'byPlaca') {
                  const placa = searchParams.get('placa')

                  if (!placa) throw new Error('placa required')
                  const data = await queryRaw`SELECT * FROM Cat_Autos WHERE Placas = ${placa}`

                  return NextResponse.json({ result: data })
            }

            if (type === 'byUsuario') {
                  if (!idUsuario) throw new Error('idUsuario required')
                  const data = await queryRaw`SELECT * FROM Cat_Autos WHERE IdUsuario = ${parseInt(idUsuario, 10)}`

                  return NextResponse.json({ result: data })
            }

            if (type === 'print') {
                  if (!idUsuario) throw new Error('idUsuario required')

                  const data =
                        await queryRaw`SELECT * FROM Autos_Plantilla_Detalle_JSON WHERE IdUsuario = ${parseInt(idUsuario, 10)}`

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

            if (type === 'insert') {
                  const { Serial, Modelo, Placas, Kilometraje, Motor, Color, IdUsuario, IdMarca } = body

                  await queryRaw`
        INSERT INTO Cat_Autos (Serial, Modelo, Placas, Kilometraje, Motor, Color, IdUsuario, IdMarca, Estatus)
        VALUES (${Serial}, ${Modelo}, ${Placas}, ${Kilometraje}, ${Motor}, ${Color}, ${IdUsuario}, ${IdMarca}, 1)`

                  return NextResponse.json({ data: true })
            }

            if (type === 'updateCar') {
                  const { IdAuto, IdUsuario } = body

                  await queryRaw`UPDATE Cat_Autos SET IdUsuario = ${IdUsuario} WHERE IdAuto = ${IdAuto}`

                  return NextResponse.json({ data: true })
            }

            if (type === 'user_car_relation') {
                  const { IdAuto } = body

                  await queryRaw`UPDATE Cat_Autos SET IdUsuario = NULL WHERE IdAuto = ${IdAuto}`

                  return NextResponse.json({ data: true })
            }

            if (type === 'getPlantillaAuto_WEB') {
                  const { Id_Usuario, Id_Plantilla } = body
                  const data = await queryRaw`EXEC [getPlantillaAuto_web] @Id_Usuario=${Id_Usuario}, @id_plantilla=${Id_Plantilla}`

                  return NextResponse.json({ result: data })
            }

            return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}
