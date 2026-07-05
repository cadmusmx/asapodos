import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
      try {
            const { searchParams } = new URL(req.url)
            const type = searchParams.get('type') ?? ''

            if (type === 'woIdUsuario') {
                  const IdUsuario = searchParams.get('IdUsuario')
                  const cadenaNotIn = searchParams.get('cadenaNotIn')

                  if (!IdUsuario) throw new Error('IdUsuario required')

                  const data =
                        await queryRaw`EXEC SP_getWOIdUsuario @cadenaNotIn=${cadenaNotIn ?? ''}, @idUsuario=${parseInt(IdUsuario, 10)}`

                  return serversideResponse(data)
            }

            if (type === 'actualizarEstatusWOConfirmado') {
                  const { IdWO, Estatus } = await req.json()
                  const data = await queryRaw`EXEC SP_actualizarEstatusWOConfirmado @IdWO=${IdWO}, @Estatus=${Estatus}`

                  return NextResponse.json({ result: data })
            }

            if (type === 'updstatusReport') {
                  const IdWO = searchParams.get('Id_WO')
                  const IdUSU = searchParams.get('Id_USU')

                  if (!IdWO || !IdUSU) throw new Error('Id_WO and Id_USU required')
                  await queryRaw`UPDATE WorkOrders_Tickets SET ReporteAceptado = 1, IdUsuarioAprover = ${parseInt(IdUSU, 10)}, FechaAprover = GETDATE() WHERE IdWO = ${parseInt(IdWO, 10)}`

                  return NextResponse.json({ data: true })
            }

            if (type === 'getWOFiltrados') {
                  const IdUsuario = searchParams.get('IdUsuario')

                  if (!IdUsuario) throw new Error('IdUsuario required')
                  const data = await queryRaw`EXEC SP_getWOIdUsuario @cadenaNotIn='', @idUsuario=${parseInt(IdUsuario, 10)}`

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

            if (type === 'updstatusReport') {
                  const { Id_WO, Id_USU } = body

                  await queryRaw`UPDATE WorkOrders_Tickets SET ReporteAceptado = 1, IdUsuarioAprover = ${Id_USU}, FechaAprover = GETDATE() WHERE IdWO = ${Id_WO}`

                  return NextResponse.json({ data: true })
            }

            return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}
