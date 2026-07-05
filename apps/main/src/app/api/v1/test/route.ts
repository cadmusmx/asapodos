// Next Imports
import { NextResponse } from 'next/server'

// Tools
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    return NextResponse.json({
      message: 'ok' // user.fotoPerfil,
    })
  } catch (e) {
    return NextResponse.json(e, {
      status: 500,
      statusText: 'Server Error'
    })
  }
}
