import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'

export async function GET(req: Request) {
      try {
            const { searchParams } = new URL(req.url)
            const type = searchParams.get('type') ?? ''

            if (type === 'mailAdmin') {
                  const IdUsuario = searchParams.get('IdUsuario')

                  if (!IdUsuario) throw new Error('IdUsuario required')

                  const data =
                        await queryRaw`SELECT Email FROM Cat_Usuarios WHERE IdEmpresa = (SELECT IdEmpresa FROM Cat_Usuarios WHERE IdUsuario = ${parseInt(IdUsuario, 10)}) AND IdPerfil = 1`

                  return NextResponse.json({ result: data })
            }

            if (type === 'gerenteMails') {
                  if (!searchParams.get('IdUsuario')) throw new Error('IdUsuario required')

                  const data =
                        await queryRaw`EXEC getMailUsuarioGerenteByIdUsuario @IdUsuario=${parseInt(searchParams.get('IdUsuario')!, 10)}`

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

            if (type === 'sendEmail') {
                  console.log('Email sent')

                  return NextResponse.json({ message: 'Correo electronico enviado con exito' })
            }

            return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}
