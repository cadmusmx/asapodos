import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const idEstado = searchParams.get('idEstado')

    if (idEstado) {
      const data =
        await queryRaw`SELECT IdCiudad, Ciudad, IdEstado FROM Cat_Ciudades WHERE IdEstado = ${parseInt(idEstado, 10)}`

      return NextResponse.json({ result: data })
    }

    const data = await queryRaw`SELECT IdCiudad, Ciudad, IdEstado FROM Cat_Ciudades`

    return NextResponse.json({ result: data })
  } catch (e) {
    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}
