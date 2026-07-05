import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
      try {
            const { searchParams } = new URL(req.url)
            const Region = searchParams.get('Region')
            const Estado = searchParams.get('Estado')
            const type = searchParams.get('type') ?? ''

            let where = ''

            if (Region) where += ` WHERE IdReg = ${Region}`
            if (Estado) where += where ? ` AND IdEstado = ${Estado}` : ` WHERE IdEstado = ${Estado}`

            if (type === 'all') {
                  const data = await queryRaw`SELECT IdCuadrilla, Nombre, IdRegion, IdEstado, Estatus FROM Cat_Cuadrillas`

                  return NextResponse.json({ result: data })
            }

            if (type === 'new') {
                  const data = await queryRaw`
        SELECT Cuad.IdCuadrilla, Cuad.IdRegion AS Region, Cuad.Nombre AS Cuadrilla, TCU.Descripcion AS Empresa,
               USU.NombreUsuario AS Nombre, USU.Email, USU.NumCelular, PUE.Nombre AS Puesto
        FROM Cat_Cuadrillas Cuad
        INNER JOIN Cat_Usuarios USU ON USU.IdCuadrilla = Cuad.IdCuadrilla
        INNER JOIN Tipo_Cuadrilla TCU ON TCU.IdTipoCuadrilla = Cuad.IdTipoCuadrilla
        INNER JOIN Cat_Puestos PUE ON PUE.IdPuesto = USU.IdPuesto
        ${where}`

                  return serversideResponse(data)
            }

            const data = await queryRaw`
      SELECT Cuad.IdCuadrilla, Cuad.IdRegion AS Region, Cuad.Nombre AS Cuadrilla, TCU.Descripcion AS Empresa,
             USU.NombreUsuario AS Nombre, USU.Email, USU.NumCelular, PUE.Nombre AS Puesto
      FROM Cat_Cuadrillas Cuad
      INNER JOIN Cat_Usuarios USU ON USU.IdCuadrilla = Cuad.IdCuadrilla
      INNER JOIN Tipo_Cuadrilla TCU ON TCU.IdTipoCuadrilla = Cuad.IdTipoCuadrilla
      INNER JOIN Cat_Puestos PUE ON PUE.IdPuesto = USU.IdPuesto
      ${where}`

            return serversideResponse(data)
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}

export async function POST(req: Request) {
      try {
            const body = await req.json()
            const { type } = body

            if (type === 'create') {
                  const { Nombre, IdRegion, IdEstado } = body

                  await queryRaw`
        INSERT INTO Cat_Cuadrillas (Nombre, IdRegion, IdEstado, Estatus)
        VALUES (${Nombre}, ${IdRegion}, ${IdEstado}, 1)`

                  return NextResponse.json({ data: true })
            }

            if (type === 'usuarios') {
                  const { IdCuadrilla } = body

                  const data = await queryRaw`
        SELECT u.IdUsuario, u.NombreUsuario, u.NumCelular, u.Email, u.IdCuadrilla, c.Nombre
        FROM Cat_Usuarios u
        INNER JOIN Cat_Cuadrillas c ON u.IdCuadrilla = c.IdCuadrilla
        WHERE u.IdCuadrilla = ${IdCuadrilla} AND u.Estatus = 'A'`

                  return NextResponse.json({ result: data })
            }

            return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}
