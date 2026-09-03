import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { resolveSession, getTenantFromHeaders, withTenantContext, AUDIT_ACTION_LABELS } from '@gaso/shared'

import { normalizeActivityFromRow } from '@/lib/profile/normalize'

export const runtime = 'nodejs'

export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url)
  const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
  const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') ?? '25'), 1), 100)
  const offset = (page - 1) * pageSize

  try {
    const result = await withTenantContext(tenantId, async tx => {
      const [countRows, rows] = await Promise.all([
        tx.$queryRaw<Array<{ total: string }>>(
          Prisma.sql`
            SELECT CAST(COUNT_BIG(1) AS NVARCHAR(50)) AS total
            FROM Audit.TransactionLog
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND UserID = ${userId}
          `
        ),
        tx.$queryRaw<
          Array<{
            AuditID: string
            TenantID: string
            UserID: string | null
            TableName: string
            Action: string
            OldData: string | null
            NewData: string | null
            ChangedAt: Date | string
            AppUser: string | null
            IdOrigin: string | null
            Origin: string | null
          }>
        >(
          Prisma.sql`
            SELECT
              CAST(TL.AuditID AS NVARCHAR(50)) AS AuditID,
              TL.TenantID,
              CAST(TL.UserID AS NVARCHAR(50)) AS UserID,
              TL.TableName,
              TL.Action,
              TL.OldData,
              TL.NewData,
              TL.ChangedAt,
              TL.AppUser,
              CAST(TL.IdOrigin AS NVARCHAR(50)) AS IdOrigin,
              O.Nombre AS Origin
            FROM Audit.TransactionLog TL
            LEFT JOIN Audit.Cat_OriginTL O ON O.Id = TL.IdOrigin
            WHERE TL.TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND TL.UserID = ${userId}
            ORDER BY TL.ChangedAt DESC
            OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
          `
        )
      ])

      const total = Number(countRows[0]?.total ?? 0)
      const data = rows.map(row => normalizeActivityFromRow(row, AUDIT_ACTION_LABELS))

      return { data, total, page, pageSize }
    })

    return NextResponse.json(result)
  } catch (e) {
    console.error('[profile/activity]', e instanceof Error ? e.message : e)

    return NextResponse.json({ message: 'Error al cargar la actividad' }, { status: 500 })
  }
}
