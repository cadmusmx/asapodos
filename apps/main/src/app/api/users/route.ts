import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission, writeTransactionLog } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'
import type { UserAccountRow } from '@/types/users'

export const runtime = 'nodejs'

const normalizeRow = (row: UserAccountRow) => {
  const firstName = row.FirstName ?? ''
  const lastName = row.LastName ?? ''

  return {
    employeeId: row.EmployeeID,
    employeeNumber: row.EmployeeNumber ?? null,
    fullName: `${firstName} ${lastName}`.trim(),
    positionName: row.PositionName ?? null,
    departmentName: row.DepartmentName ?? null,

    // Empleo (dominio RH) — solo-lectura aquí, señal independiente de la cuenta (D12):
    employmentStatus: row.EmploymentStatus ?? null,
    isActive: Boolean(row.IsActive),

    // Cuenta (dominio de este módulo):
    hasAccount: row.IdUsuario !== null,
    userId: row.IdUsuario ?? null,
    username: row.Usuario ?? null,
    accountStatus: row.Estatus ?? null // 'A' | 'I' | 'B' | null (sin cuenta)
  }
}

const getSearchPattern = (value: string | null): string | null => {
  if (!value) return null

  const trimmed = value.trim()

  if (!trimmed) return null

  const escaped = trimmed.replace(/[|%_[]/g, character => `|${character}`)

  return `%${escaped}%`
}

type AssignUserPayload = {
  employeeId: number
  username: string
  password: string
}

const parseAssignUserPayload = (body: unknown): AssignUserPayload => {
  if (typeof body !== 'object' || body === null) {
    throw new Error('Body inválido')
  }

  const raw = body as Record<string, unknown>

  const employeeId = Number(raw.employeeId)

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    throw new Error('employeeId inválido')
  }

  const username = typeof raw.username === 'string' ? raw.username.trim() : ''

  if (username.length < 3) {
    throw new Error('El nombre de usuario debe tener al menos 3 caracteres.')
  }

  if (/\s/.test(username)) {
    throw new Error('El nombre de usuario no puede contener espacios.')
  }

  const password = typeof raw.password === 'string' ? raw.password : ''

  if (password.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.')
  }

  return { employeeId, username, password }
}

/**
 * Fila cruda del listado de cuentas, ANCLADO en Employees (LEFT JOIN a Users):
 * mostramos a todo empleado, tenga o no cuenta. `IdUsuario` NULL = sin usuario.
 */
export const GET = withPermission(
  'users',
  async (req, { tenantId }) => {
    const { searchParams } = new URL(req.url)

    const search = getSearchPattern(searchParams.get('search'))

    const pageSize = Math.min(Math.max(Number(searchParams.get('pageSize') ?? '25'), 1), 100)
    const page = Math.max(Number(searchParams.get('page') ?? '1'), 1)
    const offset = (page - 1) * pageSize

    return withTenantContext(tenantId, async tx => {
      const conditions: Prisma.Sql[] = []

      // TenantID explícito además de RLS (defensa en profundidad).
      conditions.push(Prisma.sql`e.TenantID = CAST(${tenantId} AS uniqueidentifier)`)

      if (search) {
        conditions.push(
          Prisma.sql`(
            e.EmployeeNumber LIKE ${search} ESCAPE '|'
            OR e.FirstName LIKE ${search} ESCAPE '|'
            OR e.LastName LIKE ${search} ESCAPE '|'
            OR u.Usuario LIKE ${search} ESCAPE '|'
          )`
        )
      }

      const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`

      const countRows = await tx.$queryRaw<Array<{ total: bigint }>>(
        Prisma.sql`
          SELECT COUNT_BIG(1) AS total
          FROM HumanCapital.Employees e
          LEFT JOIN dbo.GASOCO_Cat_Usuarios u
            ON u.TenantID = e.TenantID
            AND u.EmployeeID = e.EmployeeID
          ${whereClause}
        `
      )

      const rows = await tx.$queryRaw<UserAccountRow[]>(
        Prisma.sql`
          SELECT
            e.EmployeeID,
            e.EmployeeNumber,
            e.FirstName,
            e.LastName,
            e.EmploymentStatus,
            e.IsActive,
            d.Name AS DepartmentName,
            p.Name AS PositionName,
            u.IdUsuario,
            u.Usuario,
            u.Estatus
          FROM HumanCapital.Employees e
          LEFT JOIN dbo.GASOCO_Cat_Usuarios u
            ON u.TenantID = e.TenantID
            AND u.EmployeeID = e.EmployeeID
          LEFT JOIN HumanCapital.Departments d
            ON d.TenantID = e.TenantID
            AND d.DepartmentID = e.DepartmentID
          LEFT JOIN HumanCapital.Positions p
            ON p.TenantID = e.TenantID
            AND p.PositionID = e.PositionID
          ${whereClause}
          ORDER BY u.IdUsuario ASC, len(e.EmployeeNumber) ASC
          OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY
        `
      )

      return NextResponse.json({
        data: rows.map(normalizeRow),
        total: Number(countRows[0]?.total ?? 0),
        page,
        pageSize
      })
    })
  },
  { bit: PERM.R }
)

/**
 * Asignar usuario (alta 1:1). El empleado ya está seleccionado (fila sin cuenta).
 * Reglas: solo empleados activos, 1:1 estricto, usuario único por tenant.
 * INSERT sin OUTPUT (trigger-safe) + correlación por (TenantID, EmployeeID).
 * Deuda: `Password` en texto plano (pendiente hashing, F1).
 */
export const POST = withPermission(
  'users',
  async (req, { auth, tenantId }) => {
    let payload: AssignUserPayload

    try {
      const body = await req.json()

      payload = parseAssignUserPayload(body)
    } catch (error) {
      return NextResponse.json({ message: error instanceof Error ? error.message : 'Body inválido' }, { status: 400 })
    }

    try {
      const result = await withTenantContext(tenantId, async tx => {
        // Validación en un solo round-trip: empleado del tenant + activo + sin cuenta; usuario libre.
        const checks = await tx.$queryRaw<
          Array<{ EmployeeID: number; IsActive: boolean | number; HasAccount: number; UsernameTaken: number }>
        >(
          Prisma.sql`
            SELECT
              e.EmployeeID,
              e.IsActive,
              (
                SELECT COUNT(1) FROM dbo.GASOCO_Cat_Usuarios u
                WHERE u.TenantID = e.TenantID AND u.EmployeeID = e.EmployeeID
              ) AS HasAccount,
              (
                SELECT COUNT(1) FROM dbo.GASOCO_Cat_Usuarios u2
                WHERE u2.TenantID = CAST(${tenantId} AS uniqueidentifier)
                  AND u2.Usuario = ${payload.username}
              ) AS UsernameTaken
            FROM HumanCapital.Employees e
            WHERE e.TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND e.EmployeeID = ${payload.employeeId}
          `
        )

        const check = checks[0]

        if (!check) throw new Error('EMPLOYEE_NOT_FOUND')
        if (!Boolean(check.IsActive)) throw new Error('EMPLOYEE_INACTIVE')
        if (Number(check.HasAccount) > 0) throw new Error('ACCOUNT_EXISTS')
        if (Number(check.UsernameTaken) > 0) throw new Error('USERNAME_TAKEN')

        // Alta: solo columnas mínimas. IdUsuario es IDENTITY; FechaAlta/Estatus tienen default;
        // identidad (Nombre/Email) NO se toca — se resuelve por join a Employees.
        await tx.$executeRaw(
          Prisma.sql`
            INSERT INTO dbo.GASOCO_Cat_Usuarios (TenantID, EmployeeID, Usuario, Password, Estatus)
            VALUES (
              CAST(${tenantId} AS uniqueidentifier),
              ${payload.employeeId},
              ${payload.username},
              ${payload.password},
              'A'
            )
          `
        )

        // Correlación 1:1 para recuperar el IdUsuario (evita OUTPUT en tabla con trigger/FK).
        const created = await tx.$queryRaw<Array<{ IdUsuario: number }>>(
          Prisma.sql`
            SELECT u.IdUsuario
            FROM dbo.GASOCO_Cat_Usuarios u
            WHERE u.TenantID = CAST(${tenantId} AS uniqueidentifier)
              AND u.EmployeeID = ${payload.employeeId}
          `
        )

        return { idUsuario: created[0]?.IdUsuario ?? null }
      })

      writeTransactionLog({
        tenantId,
        tableName: 'dbo.GASOCO_Cat_Usuarios',
        action: 'CREATE',
        userId: auth.userId,
        appUser: auth.email ?? null,
        oldData: null,
        newData: {
          idUsuario: result.idUsuario,
          employeeId: payload.employeeId,
          username: payload.username,
          estatus: 'A'
        }
      }).catch(() => {})

      return NextResponse.json(
        { data: { idUsuario: result.idUsuario, employeeId: payload.employeeId } },
        { status: 201 }
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

      if (message.includes('EMPLOYEE_NOT_FOUND')) {
        return NextResponse.json({ message: 'El empleado no existe.' }, { status: 404 })
      }

      if (message.includes('EMPLOYEE_INACTIVE')) {
        return NextResponse.json({ message: 'Solo se puede asignar usuario a empleados activos.' }, { status: 409 })
      }

      if (message.includes('ACCOUNT_EXISTS') || message.includes('UX_Usuarios_Tenant_Employee')) {
        return NextResponse.json({ message: 'El empleado ya tiene una cuenta.' }, { status: 409 })
      }

      if (message.includes('USERNAME_TAKEN') || message.includes('UX_Usuarios_Tenant_Usuario')) {
        return NextResponse.json({ message: 'El nombre de usuario ya existe.' }, { status: 409 })
      }

      console.error('[USERS_ASSIGN_ERROR]', { message })

      return NextResponse.json({ message: 'Error al asignar usuario.' }, { status: 500 })
    }
  },
  { bit: PERM.W }
)
