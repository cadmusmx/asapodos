import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse, requireTenantId, setTenantContextForRequest } from '@/lib/api-utils'

export async function GET(req: Request) {
  try {
    requireTenantId(req)
    await setTenantContextForRequest(req)

    return NextResponse.json({ message: 'Use POST for gasolina endpoints' }, { status: 400 })
  } catch (e: any) {
    if (e.name === 'TenantError') {
      return NextResponse.json({ message: e.message }, { status: 403 })
    }

    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}

export async function POST(req: Request) {
  try {
    const tenantId = requireTenantId(req)

    await setTenantContextForRequest(req)
    const body = await req.json()
    const { type } = body

    if (type === 'solicitudGasolina') {
      const {
        idUsuario,
        fecha,
        numeroEco,
        folio,
        region,
        monto,
        uso,
        litros,
        kilometraje,
        gasolinaGenerador,
        montoGenerador,
        ticket,
        sitio,
        fotoKilometraje,
        fotoTicket
      } = body

      await queryRaw`
        INSERT INTO GASOAL_Gasolina (IdUsuario, FechaCaptura, NoEconomico, Folio, IdRegion, Monto, Uso, Generador, MontoGenerador, Ticket, Sitio, KilometrajeFoto, TicketFoto, TenantID)
        VALUES (${idUsuario}, ${fecha}, ${numeroEco}, ${folio}, ${region}, ${monto}, ${uso}, ${gasolinaGenerador === 'si' ? 1 : 0}, ${montoGenerador}, ${ticket}, ${sitio}, ${fotoKilometraje}, ${fotoTicket}, ${tenantId})`

      return NextResponse.json({ success: true })
    }

    if (type === 'getComprobanteGasolina') {
      const { fechaInicioFin, idUsuario, noEconomico, placas, folio } = body
      const filters = [`G.TenantID = '${tenantId}'`]

      if (idUsuario) filters.push(`G.IdUsuario = ${idUsuario}`)
      if (noEconomico) filters.push(`G.NoEconomico LIKE '%${noEconomico}%'`)
      if (placas) filters.push(`G.Placas LIKE '%${placas}%'`)
      if (folio) filters.push(`G.Folio LIKE '%${folio}%'`)

      const where = `WHERE ${filters.join(' AND ')}`

      const data = await queryRaw`
        SELECT G.*, U.NombreUsuario
        FROM GASOAL_Gasolina G
        LEFT JOIN GASOCO_Cat_Usuarios U ON G.IdUsuario = U.IdUsuario
        ${where}
        ORDER BY G.FechaCaptura DESC`

      return serversideResponse(data)
    }

    if (type === 'getComprobanteGasolinaInfo') {
      const { id } = body
      const data = await queryRaw`SELECT * FROM GASOAL_Gasolina WHERE ID = ${id} AND TenantID = '${tenantId}'`

      return NextResponse.json({ result: data })
    }

    if (type === 'comprobanteGasolinaStatus') {
      const { id, estatus } = body

      await queryRaw`UPDATE GASOAL_Gasolina SET Estatus = ${estatus} WHERE ID = ${id} AND TenantID = '${tenantId}'`

      return NextResponse.json({ data: true })
    }

    return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
  } catch (e: any) {
    if (e.name === 'TenantError') {
      return NextResponse.json({ message: e.message }, { status: 403 })
    }

    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}
