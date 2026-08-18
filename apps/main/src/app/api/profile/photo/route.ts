import { NextResponse } from 'next/server'

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

import {
  resolveSession,
  getTenantFromHeaders,
  getTenantSlugFromHeaders,
  withTenantContext,
  setProfilePhoto,
  writeTransactionLog,
  ID_ORIGIN_WEB
} from '@gaso/shared'

import { Prisma } from '@prisma/client'

const S3_BUCKET = process.env.S3_BUCKET ?? ''
const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL ?? ''

const s3 = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? ''
  }
})

const ALLOWED = ['.jpg', '.jpeg', '.png']
const MAX_BYTES = 10 * 1024 * 1024

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const auth = await resolveSession(req)

  if (!auth) {
    return NextResponse.json({ message: 'No autenticado' }, { status: 401 })
  }

  const userId = auth.userId

  let tenantId: string

  try {
    const { id } = getTenantFromHeaders(req.headers)

    tenantId = id
  } catch {
    return NextResponse.json({ message: 'Contexto de tenant no disponible' }, { status: 401 })
  }

  if (auth.tenantId && auth.tenantId.toLowerCase() !== tenantId.toLowerCase()) {
    return NextResponse.json({ message: 'Sesión de tenant no válida' }, { status: 403 })
  }

  try {
    const slug = getTenantSlugFromHeaders(req.headers) || tenantId

    const form = await req.formData().catch(() => null)
    const file = form?.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'No se recibió ningún archivo' }, { status: 400 })
    }

    const name = file.name ?? ''
    const dot = name.lastIndexOf('.')
    const ext = dot >= 0 ? name.slice(dot).toLowerCase() : ''

    if (!ALLOWED.includes(ext)) {
      return NextResponse.json(
        { message: 'Tipo de archivo no permitido. Solo JPG y PNG.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ message: 'El archivo excede 10 MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const ts = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)
    const folder = `${process.env.S3_FOLDER ?? 'Pr'}/`;

    const key = `${folder}${slug}/profile-photos/web/${ts}-web${ext}`

    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type || 'application/octet-stream'
      })
    )

    const url = S3_PUBLIC_BASE_URL ? `${S3_PUBLIC_BASE_URL}${key}` : key

    await withTenantContext(tenantId, async (tx) => {
      const empRows = await tx.$queryRaw<Array<{ EmployeeID: number }>>(
        Prisma.sql`SELECT EmployeeID FROM dbo.GASOCO_Cat_Usuarios WHERE IdUsuario = ${userId} AND TenantID = CAST(${tenantId} AS uniqueidentifier)`
      )

      const emp = empRows[0]

      if (!emp) throw new Error('USER_NOT_FOUND')

      await setProfilePhoto(tenantId, emp.EmployeeID, url)
    })

    writeTransactionLog({
      tenantId,
      tableName: 'HumanCapital.EmployeeFiles',
      action: 'UPDATE',
      userId,
      appUser: auth.email ?? null,
      oldData: null,
      newData: { employeeId: userId, fotoPerfil: url },
      idOrigin: ID_ORIGIN_WEB
    }).catch(() => { })

    return NextResponse.json({ success: true, url })
  } catch (e) {
    console.error('[profile/photo]', e)

    return NextResponse.json({ success: false, message: 'Error al subir la foto' }, { status: 500 })
  }
}
