import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const idUsuario = searchParams.get('idUsuario')
    const filter = searchParams.get('filter')

    if (idUsuario && filter === 'gastos') {
      const data = await queryRaw`
        SELECT R.IdReg, R.NombreReg FROM Cat_Regiones R
        INNER JOIN GASOSOL_SolGastos G ON R.IdReg = G.IdRegion
        WHERE R.Status = 1 AND G.IdSolicitante = ${parseInt(idUsuario, 10)}
        GROUP BY R.IdReg, R.NombreReg`

      return NextResponse.json({ result: data })
    }

    const data = await queryRaw`SELECT IdReg, NombreReg FROM Cat_Regiones WHERE STATUS = 1`

    return NextResponse.json({ result: data })
  } catch (e) {
    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}
