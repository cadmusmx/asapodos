import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') ?? ''

    if (type === 'estados') {
      const data = await queryRaw`SELECT * FROM Cat_Estados WHERE STATUS = 1`

      return NextResponse.json({ result: data })
    }

    if (type === 'marcasAuto') {
      const data = await queryRaw`SELECT * FROM Cat_MarcaAuto`

      return NextResponse.json({ result: data })
    }

    if (type === 'modelosAuto') {
      const marca = searchParams.get('marca')
      const filter = marca ? ` WHERE IdMarca = ${marca}` : ''
      const data = await queryRaw`SELECT * FROM Cat_ModeloAuto${filter}`

      return NextResponse.json({ result: data })
    }

    if (type === 'licencias') {
      const data = await queryRaw`SELECT * FROM GASOAL_Cat_Licencias`

      return NextResponse.json({ result: data })
    }

    if (type === 'tiposVeh') {
      const data = await queryRaw`SELECT * FROM GASOAL_Cat_TipoVehiculo`

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

    if (type === 'responsivaVehicular') {
      const {
        idUsuario,
        fecha_hora_responsiva,
        tipo,
        responsable,
        ine,
        licencia,
        licencia_vence,
        num_economico,
        placa,
        estado_placa,
        num_serie,
        marca,
        linea,
        tipo_veh,
        traccion,
        anio_modelo,
        color,
        ubicacion,
        km_actual,
        id_empresa_seg,
        seg_empresa,
        seg_poliza,
        seguro_vence,
        comentarios
      } = body

      await queryRaw`
        INSERT INTO GASOAL_Responsiva (IdUsuario, FechaHora, IdTipo, IdResponsable, Ine, Licencia, LicenciaVigencia, NoEconomico,
            Placa, IdEstado, NumSerie, IdMarca, IdLinea, Traccion, IdTipoVeh, Modelo, Color, Ubicacion, KmActual,
            IdEmpresaSeg, SegEmpresa, SegPoliza, SegVigencia, Comentarios, FechaCaptura)
        VALUES (${idUsuario}, ${fecha_hora_responsiva}, ${tipo}, ${responsable}, ${ine}, ${licencia}, ${licencia_vence}, ${num_economico},
            ${placa}, ${estado_placa}, ${num_serie}, ${marca}, ${linea}, ${traccion}, ${tipo_veh}, ${anio_modelo}, ${color}, ${ubicacion}, ${km_actual},
            ${id_empresa_seg}, ${seg_empresa}, ${seg_poliza}, ${seguro_vence}, ${comentarios}, GETDATE())`

      return NextResponse.json({ data: true })
    }

    if (type === 'getResponsivaVehicular') {
      const { idUsuario, placas, folio } = body
      let where = 'WHERE 1=1'

      if (idUsuario) where += ` AND R.IdUsuario = ${idUsuario}`
      if (placas) where += ` AND R.Placas LIKE '%${placas}%'`
      if (folio) where += ` AND R.Folio LIKE '%${folio}%'`

      const data = await queryRaw`
        SELECT R.*, U.NombreUsuario
        FROM GASOAL_Responsiva R
        LEFT JOIN GASOCO_Cat_Usuarios U ON R.IdUsuario = U.IdUsuario
        ${where}
        ORDER BY R.FechaCaptura DESC`

      return serversideResponse(data)
    }

    if (type === 'responsivaVehicularStatus') {
      const { id, estatus } = body

      await queryRaw`UPDATE GASOAL_Responsiva SET Estatus = ${estatus} WHERE ID = ${id}`

      return NextResponse.json({ data: true })
    }

    return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}
