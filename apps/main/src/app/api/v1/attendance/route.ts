import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
      try {
            const { searchParams } = new URL(req.url)
            const type = searchParams.get('type') ?? ''
            const IdUsuario = searchParams.get('IdUsuario')
            const IdWO = searchParams.get('IdWO')

            if (type === 'lista') {
                  const person = searchParams.get('person')
                  const fechaIn = searchParams.get('fechaIn')
                  const fechaFin = searchParams.get('fechaFin')
                  const dateFilter = fechaIn ? ` AND fechaCheckIn BETWEEN '${fechaIn}' AND '${fechaFin}'` : ''

                  const data = await queryRaw`
        SELECT IdUsuario, est.Nombre AS Estado, ciu.Ciudad, act.Actividad, Latitud, Longitud,
               CONVERT(VARCHAR, CAST(fechaCheckIn AS DATE), 5) AS Fecha,
               CONVERT(VARCHAR(5), DATEPART(HOUR, fechaCheckIn)) + ':' + RIGHT('0' + CONVERT(VARCHAR(2), DATEPART(MINUTE, fechaCheckIn)), 2) AS HoraEntrada,
               CONVERT(VARCHAR(5), DATEPART(HOUR, fechaCheckOut)) + ':' + RIGHT('0' + CONVERT(VARCHAR(2), DATEPART(MINUTE, fechaCheckOut)), 2) AS HoraSalida
        FROM Cat_CheckInOut che
        INNER JOIN Cat_Estados est ON est.IdEstado = che.Estado
        INNER JOIN Cat_Ciudades ciu ON ciu.IdCiudad = che.Ciudad
        INNER JOIN Cat_ActividadesAuto act ON act.ID = che.Actividad
        WHERE IdUsuario = ${person ? parseInt(person, 10) : 0}${dateFilter}
        ORDER BY Fecha DESC`

                  return serversideResponse(data)
            }

            if (type === 'actividades') {
                  const data = await queryRaw`SELECT ID, Actividad FROM CAT_ACTIVIDADESAUTO WHERE Estatus = 1 ORDER BY LEN(ID), ID`

                  return NextResponse.json({ result: data })
            }

            if (type === 'estatus') {
                  if (!IdUsuario) throw new Error('IdUsuario required')

                  const data =
                        await queryRaw`EXEC SP_getEstatusCheckInCheckOutAutosByIdUsuario @IdUsuario=${parseInt(IdUsuario, 10)}`

                  return NextResponse.json({ result: data })
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

            if (type === 'checkIn') {
                  const { IdUsuario, estado, ciudad, actividad, latitud, longitud, comentario, tipoActividad } = body

                  await queryRaw`
        EXEC SP_realizarCheckInAutos @idUsuario=${IdUsuario}, @estado=${estado}, @ciudad=${ciudad},
          @actividad=${actividad}, @latitud=${latitud}, @longitud=${longitud},
          @comentario=${comentario}, @tipoActividad=${tipoActividad}`

                  return NextResponse.json({ data: true })
            }

            if (type === 'checkOut') {
                  const { IdUsuario } = body

                  await queryRaw`EXEC SP_realizarCheckOutAutosByIdUsuario @IdUsuario=${IdUsuario}`

                  return NextResponse.json({ data: true })
            }

            return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}
