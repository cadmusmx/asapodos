import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') ?? ''

    if (type === 'list_sites') {
      const data = await queryRaw`SELECT * FROM Cat_Sitios WHERE Status = 1`

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

    if (type === 'overlay_data') {
      const data = await queryRaw`SELECT * FROM Cat_Sitios WHERE Status = 1`

      return NextResponse.json({ result: data })
    }

    return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}
