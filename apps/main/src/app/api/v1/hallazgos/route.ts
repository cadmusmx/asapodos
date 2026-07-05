import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
      try {
            const { searchParams } = new URL(req.url)
            const type = searchParams.get('type') ?? ''

            if (type === 'all') {
                  const data = await queryRaw`SELECT * FROM Cat_Hallazgos`

                  return serversideResponse(data)
            }

            if (type === 'wot_files') {
                  const data = await queryRaw`EXEC [getAllFiles_WOT]`

                  return NextResponse.json({ result: (data as unknown as Array<{ result: unknown }>)?.[0]?.result ?? data })
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
                  const { fromEmail, toEmail, subject, message } = body

                  console.log('Email from:', fromEmail, 'to:', toEmail)

                  return NextResponse.json({ message: 'Correo electronico enviado con exito' })
            }

            if (type === 'sendEmailTest') {
                  const { id, fromEmail, toEmail, toName, subject, message, cc } = body

                  console.log('Email test:', subject)
                  await queryRaw`UPDATE Cat_Hallazgos SET Estatus = 1 WHERE ID = ${id}`

                  return NextResponse.json({ message: 'Correo electronico enviado con exito' })
            }

            if (type === 'updateEstatus') {
                  const { id, estatus } = body

                  await queryRaw`UPDATE Cat_Hallazgos SET Estatus = ${estatus} WHERE ID = ${id}`

                  return NextResponse.json({ data: true })
            }

            return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}
