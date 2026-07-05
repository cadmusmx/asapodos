import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const idRegion = searchParams.get('idRegion')

    if (idRegion) {
      const data =
        await queryRaw`SELECT IdEstado, Nombre, IdReg FROM Cat_Estados WHERE IdReg = ${parseInt(idRegion, 10)}`

      return NextResponse.json({ result: data })
    }

    const data = await queryRaw`SELECT IdEstado, Nombre, IdReg FROM Cat_Estados`

    return NextResponse.json({ result: data })
  } catch (e) {
    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}
