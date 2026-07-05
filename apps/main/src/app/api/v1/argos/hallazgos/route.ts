import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') ?? ''

    if (type === 'table_list_14') {
      const data = await queryRaw`
        SELECT ID, IdWO, IdPlantilla, jsonDetalle
        FROM WorkOrders_Plantilla_Detalle_JSON
        WHERE IdPlantilla = 14
        ORDER BY ID`

      const processed = data.map((e: Record<string, unknown>) => {
        try {
          const parsed = JSON.parse(e.jsonDetalle as string).filter(
            (i: Record<string, string>) => !i.nombreCampo.includes('img')
          )

          return { ...e, jsonDetalle: JSON.stringify(parsed) }
        } catch {
          return e
        }
      })

      return serversideResponse(processed)
    }

    if (type === 'table_list_15') {
      const data = await queryRaw`
        SELECT ID, IdWO, IdPlantilla, jsonDetalle
        FROM WorkOrders_Plantilla_Detalle_JSON
        WHERE IdPlantilla = 15
        ORDER BY ID`

      const processed = data.map((e: Record<string, unknown>) => {
        try {
          const parsed = JSON.parse(e.jsonDetalle as string).filter(
            (i: Record<string, string>) => !i.nombreCampo.includes('img')
          )

          return { ...e, jsonDetalle: JSON.stringify(parsed) }
        } catch {
          return e
        }
      })

      return serversideResponse(processed)
    }

    return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}
