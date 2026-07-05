import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse, requireTenantId, setTenantContextForRequest } from '@/lib/api-utils'

export async function POST(req: Request) {
  try {
    const tenantId = requireTenantId(req)

    await setTenantContextForRequest(req)
    const body = await req.json()
    const { type } = body

    if (type === 'saveKmSemanal') {
      const { idUsuario, placas, noEconomico, kmUnidad, region, tarjetaFoto, kilometrajeFoto } = body

      await queryRaw`
        INSERT INTO GASOAUTOS_Kmsemanal (IdUsuario, NoEconomico, Placas, KmUnidad, Region, KilometrajeFoto, TarjetaFoto, FechaCaptura, TenantID)
        VALUES (${idUsuario}, ${noEconomico}, ${placas}, ${kmUnidad}, ${region}, ${kilometrajeFoto}, ${tarjetaFoto}, GETDATE(), ${tenantId})`

      return NextResponse.json({ success: true })
    }

    if (type === 'getKmSemanal') {
      const { fechaInicioFin, idUsuario, noEconomico, placas, pagina, limite } = body
      const filters = [`K.TenantID = '${tenantId}'`]

      if (fechaInicioFin) {
        const [inicio, fin] = fechaInicioFin.split(' - ').map((f: string) => f.trim())

        filters.push(`K.FechaCaptura BETWEEN '${inicio}' AND '${fin}'`)
      }

      if (idUsuario) filters.push(`K.IdUsuario = ${idUsuario}`)
      if (noEconomico) filters.push(`CONVERT(VARCHAR, K.NoEconomico) LIKE '%${noEconomico}%'`)
      if (placas) filters.push(`CONVERT(VARCHAR, K.Placas) LIKE '%${placas}%'`)
      const where = `WHERE ${filters.join(' AND ')}`
      const offset = pagina ? (parseInt(pagina, 10) - 1) * parseInt(limite || '10', 10) : 0
      const fetch = limite ? ` OFFSET ${offset} ROWS FETCH NEXT ${limite} ROWS ONLY` : ''

      const data = await queryRaw`
        SELECT K.*, UU.Nombre AS Usuario
        FROM GASOAUTOS_Kmsemanal K
        LEFT JOIN GASOCO_Cat_Usuarios UU ON K.IdUsuario = UU.IdUsuario
        ${where}
        ORDER BY K.FechaCaptura DESC ${fetch}`

      return serversideResponse(data)
    }

    return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
  } catch (e: any) {
    if (e.name === 'TenantError') {
      return NextResponse.json({ message: e.message }, { status: 403 })
    }

    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}
