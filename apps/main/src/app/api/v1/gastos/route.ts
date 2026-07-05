import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse, requireTenantId, setTenantContextForRequest } from '@/lib/api-utils'

export async function GET(req: Request) {
  try {
    const tenantId = requireTenantId(req)

    await setTenantContextForRequest(req)

    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') ?? ''

    if (type === 'proyectosCatalogo') {
      const data = await queryRaw`SELECT * FROM GASOCO_Cat_Proyectos WHERE Estatus = 1 AND TenantID = ${tenantId}`

      return NextResponse.json({ result: data })
    }

    return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
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

    if (type === 'getSolGastos') {
      const { idUsuario, rolUsuario, status, facturado } = body
      const filters = []

      if (status && status !== 'null' && status !== 0) filters.push(`SG.EstatusSolicitud = ${status}`)
      else if (status === 'null') filters.push('SG.EstatusSolicitud IS NULL')

      if (rolUsuario >= 0 && rolUsuario < 3) {
        const idRoles = ['IdSolicitante', 'IdBeneficiario', 'IdAprobador']

        filters.push(`SG.${idRoles[rolUsuario]} = ${idUsuario}`)
      } else {
        filters.push(`@IdUsuario IN (SG.IdSolicitante, SG.IdBeneficiario, SG.IdAprobador)`)
      }

      if (facturado !== undefined) {
        filters.push(facturado ? 'LEN(SG.archivoFacturaGasto) > 0' : 'SG.archivoFacturaGasto IS NULL')
      }

      filters.push(`SG.TenantID = '${tenantId}'`)

      const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : ''

      const data = await queryRaw`
        SELECT SG.*, P.ProyectoNombre, Sol.Nombre AS NombreSolicitante, Ben.Nombre AS NombreBeneficiario, Apr.Nombre AS NombreAprobador
        FROM GASOSOL_SolGastos SG
        LEFT JOIN GASOCO_Cat_Proyectos P ON SG.IdProyecto = P.Id
        LEFT JOIN GASOCO_Cat_Usuarios Sol ON Sol.IdUsuario = SG.IdSolicitante
        LEFT JOIN GASOCO_Cat_Usuarios Ben ON Ben.IdUsuario = SG.IdBeneficiario
        LEFT JOIN GASOCO_Cat_Usuarios Apr ON Apr.IdUsuario = SG.IdAprobador
        ${where}
        ORDER BY SG.FechaSolicitud DESC`

      return serversideResponse(data)
    }

    if (type === 'getGastosVehicular') {
      const { idUsuario, tipoGasto, fechaInicioFin } = body
      const where = `WHERE IdUsuario = ${idUsuario} AND IdTipoGasto = ${tipoGasto} AND TenantID = '${tenantId}'`
      const data = await queryRaw`SELECT * FROM GASOSOL_SolGastos ${where}`

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
