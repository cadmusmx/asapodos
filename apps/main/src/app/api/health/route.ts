import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { APP_VERSION } from '@/configs/appConfig'

export async function GET(req: Request) {
  try {
    const dbStart = Date.now()

    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json({
      status: 'ok',
      version: '1.1.2',
      entorno: process.env.NODE_ENV || 'development',
      bff: req.url,
      conectividad: 'En línea',
      database: 'connected',
      responseTime: Number((Date.now() - dbStart).toFixed(2))
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        version: APP_VERSION,
        entorno: process.env.NODE_ENV || 'development',
        bff: req.url,
        conectividad: 'Sin conexión',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    )
  }
}
