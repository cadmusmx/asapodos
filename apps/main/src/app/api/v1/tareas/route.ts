import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
      try {
            const { searchParams } = new URL(req.url)
            const type = searchParams.get('type') ?? ''
            const IdWO = searchParams.get('IdWO')
            const IdUsuario = searchParams.get('IdUsuario')

            if (type === 'byWO') {
                  if (!IdWO) throw new Error('IdWO required')
                  const data = await queryRaw`EXEC SP_getTareas_By_IdWO @IdWO=${parseInt(IdWO, 10)}`

                  return NextResponse.json({ result: data })
            }

            if (type === 'all') {
                  const data = await queryRaw`EXEC [getAllTareas]`

                  return NextResponse.json({ result: (data as unknown as Array<{ result: unknown }>)?.[0]?.result ?? data })
            }

            if (type === 'subtareas') {
                  const IdTarea = searchParams.get('IdTarea')
                  const data = await queryRaw`SELECT * FROM Cat_SubTareas WHERE IdTarea = ${IdTarea ? parseInt(IdTarea, 10) : 0}`

                  return NextResponse.json({ result: data })
            }

            if (type === 'plantillas') {
                  const idWO = searchParams.get('idWO')

                  if (!idWO) throw new Error('idWO required')
                  const data = await queryRaw`EXEC SP_getPlantillas @idWO=${parseInt(idWO, 10)}`

                  return NextResponse.json({ result: data })
            }

            if (type === 'desgloce') {
                  if (!IdWO) throw new Error('IdWO required')
                  const data = await queryRaw`EXEC SP_getTareas_By_IdWO @IdWO=${parseInt(IdWO, 10)}`

                  return serversideResponse(data)
            }

            if (type === 'botonesIconos') {
                  const data = await queryRaw`EXEC SP_getBotonesIconosPlantillasArgos`

                  return NextResponse.json({ result: data })
            }

            if (type === 'botonesTareas') {
                  if (!IdWO) throw new Error('IdWO required')
                  const data = await queryRaw`EXEC SP_getBotonesTareas @IdWO=${parseInt(IdWO, 10)}`

                  return NextResponse.json({ result: data })
            }

            if (type === 'defaultPlantilla') {
                  const idWO = searchParams.get('idWO')
                  const idPlantilla = searchParams.get('idPlantilla')

                  if (!idPlantilla) throw new Error('idPlantilla required')

                  const data =
                        await queryRaw`EXEC SP_getDatosDefaultPlantilla @idPlantilla=${parseInt(idPlantilla, 10)}, @idWO=${idWO ? parseInt(idWO, 10) : 0}`

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

            if (type === 'updateRespuestas') {
                  const { iniciarFinalizar, latitud, longitud, idWO, idDesgloceTarea, idTarea } = body

                  await queryRaw`
        EXEC SP_Actualiza_Respuestas_Tarea_WO @iniciarFinalizar=${iniciarFinalizar}, @latitud=${latitud}, @longitud=${longitud}, @idWO=${idWO}, @idDesgloceTarea=${idDesgloceTarea}, @idTarea=${idTarea}`

                  return NextResponse.json({ data: true })
            }

            return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}
