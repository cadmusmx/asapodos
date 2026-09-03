import { revalidateTag } from 'next/cache'

import { prisma, writeTransactionLog, setTenantContext, withTenantContext } from '@gaso/shared'

import { Prisma } from '@prisma/client'

import type {
  PlatformUserRow, AddPlatformRoleOptions, PlatformUserListResult,
  CreateUserInput, UpdatePlatformUserOptions, ListPlatformUsersOptions,
  PlatformUserEditRow
} from '@/types/apps/platformUserTypes'
import { getAdminTenantId } from './admin-tenant'

export async function listPlatformUsers({
  page = 1, pageSize = 20, role, search
}: ListPlatformUsersOptions): Promise<PlatformUserListResult> {
  const tenantId = await getAdminTenantId()
  const offset = (page - 1) * pageSize

  let whereClause = ''
  const params: (string | number)[] = []

  if (role) {
    params.push(role)
    whereClause += ` AND pu.Role = @p${params.length}`
  }

  if (search) {
    params.push(`%${search}%`)

    // nombre ahora desde Employee:
    whereClause += ` AND (u.Usuario LIKE @p${params.length} OR (e.FirstName + ' ' + e.LastName) LIKE @p${params.length})`
  }

  const baseFrom = `
    FROM Security.PlatformUsers pu
    INNER JOIN dbo.GASOCO_Cat_Usuarios u ON u.IdUsuario = pu.UserID
    INNER JOIN HumanCapital.Employees e ON e.TenantID = u.TenantID AND e.EmployeeID = u.EmployeeID
    WHERE 1=1 ${whereClause}`

  return withTenantContext(tenantId, async (tx) => {
    // SECUENCIAL (no Promise.all sobre tx)
    const users = await tx.$queryRawUnsafe<PlatformUserRow[]>(`
      SELECT pu.UserID, u.Usuario,
             LTRIM(RTRIM(e.FirstName + ' ' + e.LastName)) AS Nombre,
             e.Email, pu.Role, pu.CreatedAt, pu.CreatedBy, u.Estatus
      ${baseFrom}
      ORDER BY pu.CreatedAt DESC
      OFFSET @p${params.length + 1} ROWS FETCH NEXT @p${params.length + 2} ROWS ONLY
    `, ...params, offset, pageSize)

    const totalResult = await tx.$queryRawUnsafe<Array<{ total: number }>>(`
      SELECT COUNT(*) AS total ${baseFrom}
    `, ...params)

    return { users, total: Number(totalResult[0]?.total) || 0 }
  })
}

export async function getPlatformUserById(userId: number): Promise<PlatformUserEditRow | null> {
  const tenantId = await getAdminTenantId()

  return withTenantContext(tenantId, async (tx) => {
    const [user] = await tx.$queryRawUnsafe<PlatformUserEditRow[]>(`
      SELECT
        pu.UserID,
        u.Usuario,
        LTRIM(RTRIM(e.FirstName + ' ' + e.LastName)) AS Nombre,
        e.FirstName AS FirstName,      -- ← nuevo
        e.LastName  AS LastName,       -- ← nuevo
        e.Email,
        pu.Role,
        pu.CreatedAt,
        pu.CreatedBy,
        u.Estatus
      FROM Security.PlatformUsers pu
      INNER JOIN dbo.GASOCO_Cat_Usuarios u ON u.IdUsuario = pu.UserID
      INNER JOIN HumanCapital.Employees e ON e.TenantID = u.TenantID AND e.EmployeeID = u.EmployeeID
      WHERE pu.UserID = @p1
    `, userId)

    return user ?? null
  })
}

export async function createPlatformUser(input: CreateUserInput, adminUserId: number, adminEmail: string): Promise<PlatformUserRow> {
  const tenantId = await getAdminTenantId()

  const userId = await withTenantContext(tenantId, async (tx) => {
    // ── Paso 1: Employee (patrón calcado de RH) ──
    const empRows = await tx.$queryRaw<Array<{ EmployeeID: number }>>(Prisma.sql`
      INSERT INTO HumanCapital.Employees
        (TenantID, FirstName, LastName, Email, EmploymentStatus, IsActive, CreatedBy)
      OUTPUT inserted.EmployeeID
      VALUES (
        CAST(${tenantId} AS uniqueidentifier),
        ${input.nombre}, ${input.apellidos}, ${input.email ?? null},
        'active', 1, ${adminUserId}
      )
    `)

    const employeeId = empRows[0]?.EmployeeID

    if (!employeeId) throw new Error('EMPLOYEE_INSERT_FAILED')

    // ── Paso 2: cáscara Cat_Usuarios (con OUTPUT INTO por el trigger) ──
    const userRows = await tx.$queryRaw<Array<{ IdUsuario: number }>>(Prisma.sql`
      DECLARE @NewUser TABLE (IdUsuario int);
      INSERT INTO dbo.GASOCO_Cat_Usuarios
        (Usuario, Password, Estatus, TenantID, EmployeeID)
      OUTPUT inserted.IdUsuario INTO @NewUser
      VALUES (
        ${input.usuario}, ${input.password}, 'A',
        CAST(${tenantId} AS uniqueidentifier), ${employeeId}
      );
      SELECT IdUsuario FROM @NewUser;
    `)

    const newUserId = userRows[0]?.IdUsuario

    if (!newUserId) throw new Error('USER_INSERT_FAILED')

    // ── Paso 3: rol de plataforma ──
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO Security.PlatformUsers (UserID, Role, CreatedBy)
      VALUES (${newUserId}, ${input.role}, ${adminUserId})
    `)

    return newUserId
  })

  // Fuera de la tx: re-leer el registro compuesto (mismo patrón que RH re-lee el employee)
  const created = await getPlatformUserById(userId)

  if (!created) throw new Error('PLATFORM_USER_CREATE_READBACK_FAILED')

  writeTransactionLog({
    tenantId, tableName: 'Security.PlatformUsers', action: 'CREATE',
    userId: adminUserId, appUser: adminEmail, oldData: null, newData: created
  }).catch(() => { })

  return created
}

export async function addPlatformRole(options: AddPlatformRoleOptions): Promise<{ ok: boolean; error?: string }> {
  const { userId, role, adminUserId, adminEmail } = options

  try {
    const existing = await prisma.$queryRawUnsafe<Array<{ UserID: number }>>(
      'SELECT UserID FROM Security.PlatformUsers WHERE UserID = @p1',
      userId
    )

    if (existing.length > 0) {
      return { ok: false, error: 'USER_ALREADY_HAS_ROLE' }
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO Security.PlatformUsers (UserID, Role, CreatedAt, CreatedBy)
      VALUES (@p1, @p2, SYSUTCDATETIME(), @p3)
    `, userId, role, adminUserId)

    const tenantId = await getAdminTenantId()

    await writeTransactionLog({
      tenantId,
      tableName: 'Security.PlatformUsers',
      action: 'PLT_CR',
      userId: adminUserId,
      newData: { userId, role },
      appUser: adminEmail,
    })

    revalidateTag('platform-user')

    return { ok: true }
  } catch (error) {
    console.error('[ADD_PLATFORM_ROLE_ERROR]', error)
    
return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

interface RemovePlatformRoleOptions {
  userId: number
  adminUserId: number
  adminEmail: string
}

export async function removePlatformRole(options: RemovePlatformRoleOptions): Promise<{ ok: boolean; error?: string }> {
  const { userId, adminUserId, adminEmail } = options

  try {
    const existing = await getPlatformUserById(userId)

    if (!existing) {
      return { ok: false, error: 'USER_NOT_FOUND' }
    }

    const oldestUserId = await getOldestPlatformUserId()

    if (oldestUserId === userId) {
      return { ok: false, error: 'CANNOT_REMOVE_OLDEST_USER' }
    }

    await prisma.$executeRawUnsafe(`
      DELETE FROM Security.PlatformUsers WHERE UserID = @p1
    `, userId)

    const tenantId = await getAdminTenantId()

    await writeTransactionLog({
      tenantId,
      tableName: 'Security.PlatformUsers',
      action: 'PLT_RM',
      userId: adminUserId,
      oldData: { userId, role: existing.Role },
      appUser: adminEmail,
    })

    revalidateTag('platform-user')

    return { ok: true }
  } catch (error) {
    console.error('[REMOVE_PLATFORM_ROLE_ERROR]', error)
    
return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function getOldestPlatformUserId(): Promise<number | null> {
  const tenantId = await getAdminTenantId()

  await setTenantContext(tenantId)

  const [result] = await prisma.$queryRawUnsafe<Array<{ UserID: number }>>(
    'SELECT TOP 1 UserID FROM Security.PlatformUsers ORDER BY CreatedAt ASC'
  )

  return result?.UserID ?? null
}

export async function updatePlatformUser(options: UpdatePlatformUserOptions): Promise<{ ok: boolean; error?: string }> {
  const { userId, nombre, apellidos, email, adminUserId, adminEmail } = options

  try {
    const tenantId = await getAdminTenantId()
    const existing = await getPlatformUserById(userId)

    if (!existing) {
      return { ok: false, error: 'USER_NOT_FOUND' }
    }

    const oldestUserId = await getOldestPlatformUserId()

    if (oldestUserId === userId) {
      return { ok: false, error: 'CANNOT_EDIT_OLDEST_USER' }
    }

    const updates: string[] = []
    const params: (string | number | null)[] = []
    let paramIndex = 1

    if (nombre !== undefined) {
      params.push(nombre)
      updates.push(`FirstName = @p${paramIndex++}`)
    }

    if (apellidos !== undefined) {
      params.push(apellidos)
      updates.push(`LastName = @p${paramIndex++}`)
    }

    if (email !== undefined) {
      params.push(email)
      updates.push(`Email = @p${paramIndex++}`)
    }

    if (updates.length === 0) {
      return { ok: true }
    }

    params.push(tenantId)   // @p{paramIndex}
    params.push(userId)     // @p{paramIndex+1}

    return withTenantContext(tenantId, async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE HumanCapital.Employees
         SET ${updates.join(', ')}
         WHERE TenantID = CAST(@p${paramIndex} AS uniqueidentifier)
           AND EmployeeID = (
             SELECT EmployeeID FROM dbo.GASOCO_Cat_Usuarios
             WHERE IdUsuario = @p${paramIndex + 1}
           )`,
        ...params
      )

      await writeTransactionLog({
        tenantId,
        tableName: 'HumanCapital.Employees',
        action: 'UPDATE',
        userId: adminUserId,
        oldData: { nombre: existing.Nombre, email: existing.Email },
        newData: { nombre, apellidos, email },
        appUser: adminEmail,
      })
      revalidateTag('platform-user')

      return { ok: true }
    })
  } catch (error) {
    console.error('[UPDATE_PLATFORM_USER_ERROR]', error)
    
return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function deactivatePlatformUser(
  userId: number,
  adminUserId: number,
  adminEmail: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const existing = await getPlatformUserById(userId)

    if (!existing) {
      return { ok: false, error: 'USER_NOT_FOUND' }
    }

    const oldestUserId = await getOldestPlatformUserId()

    if (oldestUserId === userId) {
      return { ok: false, error: 'CANNOT_DEACTIVATE_OLDEST_USER' }
    }

    const tenantId = await getAdminTenantId()

    return withTenantContext(tenantId, async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE dbo.GASOCO_Cat_Usuarios SET Estatus = 'I' WHERE IdUsuario = @p1`,
        userId
      )

      await writeTransactionLog({
        tenantId,
        tableName: 'GASOCO_Cat_Usuarios',
        action: 'UPDATE',
        userId: adminUserId,
        oldData: { userId, estatus: existing.Estatus },
        newData: { userId, estatus: 'I' },
        appUser: adminEmail,
      })
      revalidateTag('platform-user')

      return { ok: true }
    })
  } catch (error) {
    console.error('[DEACTIVATE_PLATFORM_USER_ERROR]', error)
    
return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function activatePlatformUser(
  userId: number,
  adminUserId: number,
  adminEmail: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const existing = await getPlatformUserById(userId)

    if (!existing) {
      return { ok: false, error: 'USER_NOT_FOUND' }
    }

    const tenantId = await getAdminTenantId()

    return withTenantContext(tenantId, async (tx) => {
      await tx.$executeRawUnsafe(
        `UPDATE dbo.GASOCO_Cat_Usuarios SET Estatus = 'A' WHERE IdUsuario = @p1`,
        userId
      )

      await writeTransactionLog({
        tenantId,
        tableName: 'GASOCO_Cat_Usuarios',
        action: 'UPDATE',
        userId: adminUserId,
        oldData: { userId, estatus: existing.Estatus },
        newData: { userId, estatus: 'A' },
        appUser: adminEmail,
      })
      revalidateTag('platform-user')

      return { ok: true }
    })
  } catch (error) {
    console.error('[ACTIVATE_PLATFORM_USER_ERROR]', error)
    
return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function deletePlatformUser(
  userId: number,
  adminUserId: number,
  adminEmail: string,
  mode: 'account' | 'full' = 'account'   // 'account' = solo cuenta | 'full' = cuenta + empleado
): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getAdminTenantId()

  try {
    const existing = await getPlatformUserById(userId)

    if (!existing) {
      return { ok: false, error: 'USER_NOT_FOUND' }
    }

    const oldestUserId = await getOldestPlatformUserId()

    if (oldestUserId === userId) {
      return { ok: false, error: 'CANNOT_DELETE_OLDEST_USER' }
    }

    await withTenantContext(tenantId, async (tx) => {
      // 1. Rol de plataforma
      await tx.$executeRawUnsafe(
        `DELETE FROM Security.PlatformUsers WHERE UserID = @p1`,
        userId
      )

      // 2. Cáscara de usuario — capturar el EmployeeID ANTES de borrarla (lo necesita el paso 3)
      const empRows = await tx.$queryRawUnsafe<Array<{ EmployeeID: number }>>(
        `DECLARE @DeletedUser TABLE (EmployeeID int);
          DELETE FROM dbo.GASOCO_Cat_Usuarios
          OUTPUT deleted.EmployeeID INTO @DeletedUser
          WHERE IdUsuario = @p1;
          SELECT EmployeeID FROM @DeletedUser;`,
        userId
      )

      const employeeId = empRows[0]?.EmployeeID

      // 3. Empleado — solo en modo 'full'
      if (mode === 'full' && employeeId) {
        await tx.$executeRawUnsafe(
          `DELETE FROM HumanCapital.Employees
           WHERE TenantID = CAST(@p1 AS uniqueidentifier) AND EmployeeID = @p2`,
          tenantId, employeeId
        )
      }
    })

    await writeTransactionLog({
      tenantId,
      tableName: mode === 'full' ? 'HumanCapital.Employees' : 'GASOCO_Cat_Usuarios',
      action: 'DELETE',
      userId: adminUserId,
      oldData: { userId, nombre: existing.Nombre, usuario: existing.Usuario, mode },
      appUser: adminEmail,
    })

    revalidateTag('platform-user')

    return { ok: true }
  } catch (error) {
    const message = error instanceof Error ? error.message : ''

    // La FK habla: si el Employee tiene historial, el paso 3 truena → toda la tx hace rollback
    if (message.includes('REFERENCE constraint') || message.includes('conflicted with the REFERENCE')) {
      return { ok: false, error: 'EMPLOYEE_HAS_DEPENDENCIES' }
    }

    console.error('[DELETE_PLATFORM_USER_ERROR]', error)
    
return { ok: false, error: 'INTERNAL_ERROR' }
  }
}
