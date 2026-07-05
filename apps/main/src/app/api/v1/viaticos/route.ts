import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') ?? ''

    if (type === 'viaticos') {
      const fechaIn = searchParams.get('fechaIn')
      const fechaFin = searchParams.get('fechaFin')
      const estatus = searchParams.get('estatus')

      let where = ''

      if (fechaIn && !estatus) {
        where = `WHERE AUSO.FechaAltaSolicitud BETWEEN '${fechaIn}' AND '${fechaFin}'`
      } else if (!fechaIn && estatus && parseInt(estatus, 10) !== 4 && parseInt(estatus, 10) !== 3) {
        where = `WHERE AUSO.EstatusSolicitud = ${estatus}`
      } else if (fechaIn && estatus) {
        if (parseInt(estatus, 10) === 4 || parseInt(estatus, 10) === 3) {
          where = `WHERE AUSO.FechaAltaSolicitud BETWEEN '${fechaIn}' AND '${fechaFin}'`
        } else {
          where = `WHERE AUSO.FechaAltaSolicitud BETWEEN '${fechaIn}' AND '${fechaFin}' AND AUSO.EstatusSolicitud = ${estatus}`
        }
      }

      const data = await queryRaw`
        SELECT AUSO.ID, AUSO.IdUsuario, USU.NombreUsuario, TSO.nombreSolicitud, CIUO.Ciudad AS Origen, CIUD.Ciudad AS Destino,
               CONVERT(VARCHAR, CAST(FechaAltaSolicitud AS DATE), 5) AS FechaAltaSolicitud,
               CONVERT(VARCHAR, CAST(AUSO.FechaDesde AS DATE), 5) AS FechaDesde,
               CONVERT(VARCHAR, CAST(AUSO.FechaHasta AS DATE), 5) AS FechaHasta,
               SolicitaHospedaje, SolicitaGastos, comentarioSolicitud, EstatusSolicitud, AUSO.FechaAltaSolicitud AS Solicitado,
               DATEDIFF(day, AUSO.FechaDesde, AUSO.FechaHasta) AS noches,
               DATEDIFF(day, AUSO.FechaDesde, AUSO.FechaHasta) + 1 AS dias
        FROM Autos_Solicitud_Viaticos AUSO
        INNER JOIN Cat_Usuarios USU ON USU.IdUsuario = AUSO.IdUsuario
        INNER JOIN Autos_Catalogo_TipoSolicitudes TSO ON TSO.ID = AUSO.TipoSolicitud
        INNER JOIN Cat_Ciudades CIUO ON CIUO.IdCiudad = AUSO.IdCiudadOrigen
        INNER JOIN Cat_Ciudades CIUD ON CIUD.IdCiudad = AUSO.IdCiudadDestino
        ${where}
        AND USU.Estatus = 'A' AND USU.IdFLM = 1
        ORDER BY AUSO.FechaAltaSolicitud ASC`

      return serversideResponse(data)
    }

    if (type === 'gasolina') {
      const fechaIn = searchParams.get('fechaIn')
      const fechaFin = searchParams.get('fechaFin')
      const Region = searchParams.get('Region')
      const estatus = searchParams.get('estatus')

      let filtro = ''

      if (fechaIn) filtro += `AND AUSO.FechaAltaSolicitud BETWEEN '${fechaIn}' AND '${fechaFin}'`
      if (Region && parseInt(Region, 10) !== 0) filtro += `AND USU.IdRegion = ${Region}`
      if (estatus && parseInt(estatus, 10) !== 3 && estatus !== null) filtro += `AND AUSO.EstatusSolicitud = ${estatus}`

      const data = await queryRaw`
        SELECT AUSO.ID, AUSO.IdUsuario, USU.NombreUsuario, TSO.nombreSolicitud,
               CONVERT(VARCHAR, CAST(FechaAltaSolicitud AS DATE), 5) AS FechaAltaSolicitud,
               comentarioSolicitud, EstatusSolicitud
        FROM Autos_Solicitud_Viaticos AUSO
        INNER JOIN Cat_Usuarios USU ON USU.IdUsuario = AUSO.IdUsuario
        INNER JOIN Autos_Catalogo_TipoSolicitudes TSO ON TSO.ID = AUSO.TipoSolicitud
        WHERE TipoSolicitud = 2 ${filtro}
        AND Estatus = 'A' AND USU.IdFLM = 1
        ORDER BY FechaAltaSolicitud DESC`

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

    if (type === 'insertarViaticos') {
      const {
        idUsuario,
        tipoSolicitud,
        idCoordinador,
        idEstadoOrigen,
        idCiudadOrigen,
        idEstadoDestino,
        idCiudadDestino,
        fechaDesde,
        fechaHasta,
        solicitaHospedaje,
        solicitaGastos,
        comentario
      } = body

      await queryRaw`
        EXEC SP_Autos_Llenar_Solicitud_Viaticos
          @idUsuario=${idUsuario}, @tipoSolicitud=${tipoSolicitud},
          @idCoordinador=${idCoordinador}, @idEstadoOrigen=${idEstadoOrigen}, @idCiudadOrigen=${idCiudadOrigen},
          @idEstadoDestino=${idEstadoDestino}, @idCiudadDestino=${idCiudadDestino},
          @fechaDesde=${fechaDesde}, @fechaHasta=${fechaHasta},
          @solicitaHospedaje=${solicitaHospedaje}, @solicitaGastos=${solicitaGastos},
          @comentarioSolicitud=${comentario}`

      return NextResponse.json({ data: true })
    }

    if (type === 'autorizar') {
      const { id, idUsuarioGerente, estatus } = body

      await queryRaw`
        UPDATE Autos_Solicitud_Viaticos
        SET EstatusSolicitud = ${estatus}, FechaRespuestaSolicitud = GETDATE(), IdUsuarioGerente = ${idUsuarioGerente}
        WHERE ID = ${id}`

      return NextResponse.json({ data: true })
    }

    return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}
