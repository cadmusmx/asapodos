import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') ?? ''
    const Region = searchParams.get('Region')
    const Estado = searchParams.get('Estado')
    const IdSitio = searchParams.get('IdSitio')

    if (type === 'tipos') {
      const data = await queryRaw`SELECT IdTipoSitio, Descripcion FROM Cat_TipoSitio WHERE Status = 1`

      return NextResponse.json({ result: data })
    }

    if (type === 'cfe') {
      const idRegion = Region ? parseInt(Region, 10) : null
      const idEstado = Estado ? parseInt(Estado, 10) : null
      const result = await queryRaw`EXEC komodo_getSitiosCFE @IdRegion=${idRegion}, @IdEstado=${idEstado}`
      const jsonResult = (result as unknown as Array<{ resultado: string }>)?.[0]?.resultado ?? ''

      return NextResponse.json(typeof jsonResult === 'string' ? JSON.parse(jsonResult) : jsonResult)
    }

    if (type === 'ind') {
      if (!IdSitio) throw new Error('IdSitio required')
      const data = await queryRaw`SELECT * FROM Cat_Sitios WHERE IdSitio = ${parseInt(IdSitio, 10)}`

      return NextResponse.json({ data, TotSitios: data.length })
    }

    const idRegion = Region ? parseInt(Region, 10) : null
    const idEstado = Estado ? parseInt(Estado, 10) : null
    let where = ''

    if (idRegion) where += ` WHERE IdRegion = ${idRegion}`
    if (idEstado) where += where ? ` AND IdEstado = ${idEstado}` : ` WHERE IdEstado = ${idEstado}`

    const data = await queryRaw`
      SELECT IdSitio, Alias, IdRegion, CONCAT(TIP.Descripcion,' | ',Alias,' | ',TowerCo,' | ',IdTorrera) AS Nombre,
             IdPrioridad, IdTipoSitio, Latitud, Longitud, Status, IdeNode, Vendor, IdEstado, IdCiudad, Municipio, Tip.Descripcion AS Tip_Descripcion
      FROM Cat_Sitios SIT
      INNER JOIN Cat_TipoSitio TIP ON Tip.IdTipoSitio = SIT.IdTipoSitio
      ${where}`

    return NextResponse.json({ data, TotSitios: data.length })
  } catch (e) {
    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}
