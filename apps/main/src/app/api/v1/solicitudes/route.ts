import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
      try {
            const { searchParams } = new URL(req.url)
            const type = searchParams.get('type') ?? ''

            if (type === 'solicitudes') {
                  const data = await queryRaw`
        SELECT sa.IdSolAcceso, sa.IdSitio, sa.FechaSolicitud, sa.IdUsuario, u.NombreUsuario, u.IdCuadrilla, c.Nombre NombreCuadrilla,
               sa.Motivo, sa.IdUsAprob, sa.Estatus, s.Vendor, s.IdEstado, e.Nombre
        FROM Solicitudes_Acceso sa
        INNER JOIN Cat_Sitios s ON sa.IdSitio = s.IdSitio
        INNER JOIN Cat_Estados e ON s.IdEstado = e.IdEstado
        INNER JOIN Cat_Usuarios u ON sa.IdUsuario = u.IdUsuario
        INNER JOIN Cat_Cuadrillas c ON u.IdCuadrilla = c.IdCuadrilla
        WHERE sa.IdUsAprob IS NULL AND sa.Estatus = 'S' AND u.IdFLM = 1`

                  return serversideResponse(data)
            }

            if (type === 'aprobadas') {
                  const data = await queryRaw`
        SELECT sa.IdSolAcceso, sa.IdSitio, sa.FechaSolicitud, sa.IdUsuario, u.NombreUsuario, u.IdCuadrilla, c.Nombre NombreCuadrilla,
               sa.Motivo, sa.IdUsAprob, sa.Estatus, s.Vendor, s.IdEstado, e.Nombre
        FROM Solicitudes_Acceso sa
        INNER JOIN Cat_Sitios s ON sa.IdSitio = s.IdSitio
        INNER JOIN Cat_Estados e ON s.IdEstado = e.IdEstado
        INNER JOIN Cat_Usuarios u ON sa.IdUsuario = u.IdUsuario
        INNER JOIN Cat_Cuadrillas c ON u.IdCuadrilla = c.IdCuadrilla
        WHERE sa.Estatus = 'A' AND u.IdFLM = 1`

                  return serversideResponse(data)
            }

            if (type === 'negadas') {
                  const data = await queryRaw`
        SELECT sa.IdSolAcceso, sa.IdSitio, sa.FechaSolicitud, sa.IdUsuario, u.NombreUsuario, u.IdCuadrilla, c.Nombre NombreCuadrilla,
               sa.Motivo, sa.IdUsAprob, sa.Estatus, s.Vendor, s.IdEstado, e.Nombre
        FROM Solicitudes_Acceso sa
        INNER JOIN Cat_Sitios s ON sa.IdSitio = s.IdSitio
        INNER JOIN Cat_Estados e ON s.IdEstado = e.IdEstado
        INNER JOIN Cat_Usuarios u ON sa.IdUsuario = u.IdUsuario
        INNER JOIN Cat_Cuadrillas c ON u.IdCuadrilla = c.IdCuadrilla
        WHERE sa.Estatus = 'N' AND u.IdFLM = 1`

                  return serversideResponse(data)
            }

            return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}

export async function POST(req: Request) {
      try {
            const { searchParams } = new URL(req.url)
            const action = searchParams.get('action') ?? ''

            if (action === 'create') {
                  const { IdSitio, Motivo, IdUsuario } = await req.json()

                  await queryRaw`
        INSERT INTO Solicitudes_Acceso (IdSitio, FechaSolicitud, IdUsuario, Motivo, Estatus)
        VALUES (${IdSitio}, GETDATE(), ${IdUsuario}, ${Motivo}, 'S')`

                  return NextResponse.json({ data: true, msj: 'Se envio la solicitud correctamente' })
            }

            if (action === 'manage') {
                  const { IdSolAcceso, IdUsAprob, Estatus } = await req.json()

                  await queryRaw`
        UPDATE Solicitudes_Acceso
        SET IdUsAprob = ${IdUsAprob}, FechaAprobacion = GETDATE(), Estatus = ${Estatus}
        WHERE IdSolAcceso = ${IdSolAcceso}`

                  return NextResponse.json({ data: true, msj: 'Se actualizo correctamente el estatus de la solicitud' })
            }

            return NextResponse.json({ message: 'Invalid action' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}
