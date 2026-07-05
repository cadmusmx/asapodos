import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
      try {
            const { searchParams } = new URL(req.url)
            const type = searchParams.get('type') ?? ''
            const IdSitio = searchParams.get('IdSitio')

            if (type === 'asignacion') {
                  if (IdSitio) {
                        const data =
                              await queryRaw`SELECT * FROM sitios_Asignacion_Tarea_Segura WHERE IdSitio = ${parseInt(IdSitio, 10)}`

                        return NextResponse.json({ result: data })
                  }

                  const data = await queryRaw`SELECT * FROM sitios_Asignacion_Tarea_Segura`

                  return NextResponse.json({ result: data })
            }

            if (type === 'asignacionById') {
                  const Id = searchParams.get('Id')

                  if (!Id) throw new Error('Id required')
                  const data = await queryRaw`SELECT * FROM sitios_Asignacion_Tarea_Segura WHERE ID = ${parseInt(Id, 10)}`

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

            if (type === 'create') {
                  const data = typeof body.jsonData === 'string' ? JSON.parse(body.jsonData) : body.jsonData

                  for (const item of data) {
                        const {
                              IdSitio,
                              IdUsuario,
                              fechaRegistro,
                              tema,
                              meta,
                              calificacionCompetencia,
                              aptoTrabajo,
                              conduccionVehiculos,
                              trabajoAltura,
                              aislamientoEnergia,
                              dispositivosProteccion,
                              equipoProteccionPersonal,
                              proyectoId,
                              region,
                              localizacion,
                              tarea,
                              disciplina,
                              compania,
                              fecha,
                              IISSTIIMAS,
                              etapa,
                              impactos,
                              controles,
                              condicionesClimaticas,
                              posturasForzadas,
                              ordenLimpieza,
                              eppEspecifico
                        } = item

                        await queryRaw`
          INSERT INTO sitios_Asignacion_Tarea_Segura
          (IdSitio, IdUsuario, fechaRegistro, tema, meta, calificacionCompetencia,
           aptoTrabajo, conduccionVehiculos, trabajoAltura, aislamientoEnergia,
           dispositivosProteccion, equipoProteccionPersonal, proyectoId, region,
           localizacion, tarea, disciplina, compania, fecha, IISSTIIMAS, etapa,
           impactos, controles, condicionesClimaticas, posturasForzadas,
           ordenLimpieza, eppEspecifico)
          VALUES (${IdSitio}, ${IdUsuario}, ${fechaRegistro}, ${tema}, ${meta}, ${calificacionCompetencia},
                  ${aptoTrabajo}, ${conduccionVehiculos}, ${trabajoAltura}, ${aislamientoEnergia},
                  ${dispositivosProteccion}, ${equipoProteccionPersonal}, ${proyectoId}, ${region},
                  ${localizacion}, ${tarea}, ${disciplina}, ${compania}, ${fecha}, ${IISSTIIMAS}, ${etapa},
                  ${impactos}, ${controles}, ${condicionesClimaticas}, ${posturasForzadas},
                  ${ordenLimpieza}, ${eppEspecifico})`
                  }

                  return NextResponse.json({ data: true, msj: 'Se insertaron las encuestas sitio seguro exitosamente' })
            }

            return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}
