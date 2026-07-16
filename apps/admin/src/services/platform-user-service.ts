import { revalidateTag } from 'next/cache'
import { prisma, writeTransactionLog, setTenantContext } from '@gaso/shared'
import type { PlatformRole } from '@gaso/shared'
import type { PlatformUserRow, PlatformUserListResult, CreateUserInput } from '@/types/apps/platformUserTypes'
import { getAdminTenantId } from './admin-tenant'

interface ListPlatformUsersOptions {
  page: number
  pageSize: number
  role?: PlatformRole | null
  search?: string | null
}

export async function listPlatformUsers({
  page = 1,
  pageSize = 20,
  role,
  search
}: ListPlatformUsersOptions): Promise<PlatformUserListResult> {
  const tenantId = await getAdminTenantId()
  await setTenantContext(tenantId)

  const offset = (page - 1) * pageSize

  let whereClause = ''
  const params: (string | number)[] = []

  if (role) {
    params.push(role)
    whereClause += ` AND pu.Role = @p${params.length}`
  }

  if (search) {
    params.push(`%${search}%`)
    whereClause += ` AND (u.Usuario LIKE @p${params.length} OR u.Nombre LIKE @p${params.length})`
  }

  const countParams = [...params]
  const dataParams = [...params, offset, pageSize]

  const [users, totalResult] = await Promise.all([
    prisma.$queryRawUnsafe<PlatformUserRow[]>(`
      SELECT
        pu.UserID,
        u.Usuario,
        u.Nombre,
        u.Email,
        pu.Role,
        pu.CreatedAt,
        pu.CreatedBy,
        u.Estatus
      FROM Security.PlatformUsers pu
      INNER JOIN dbo.GASOCO_Cat_Usuarios u ON u.IdUsuario = pu.UserID
      WHERE 1=1 ${whereClause}
      ORDER BY pu.CreatedAt DESC
      OFFSET @p${dataParams.length - 1} ROWS FETCH NEXT @p${dataParams.length} ROWS ONLY
    `, ...dataParams),
    prisma.$queryRawUnsafe<Array<{ total: number }>>(`
      SELECT COUNT(*) as total
      FROM Security.PlatformUsers pu
      INNER JOIN dbo.GASOCO_Cat_Usuarios u ON u.IdUsuario = pu.UserID
      WHERE 1=1 ${whereClause}
    `, ...countParams)
  ])

  return {
    users,
    total: Number(totalResult[0]?.total) || 0
  }
}

export async function getPlatformUserById(userId: number): Promise<PlatformUserRow | null> {
  const tenantId = await getAdminTenantId()
  await setTenantContext(tenantId)

  const [user] = await prisma.$queryRawUnsafe<PlatformUserRow[]>(`
    SELECT
      pu.UserID,
      u.Usuario,
      u.Nombre,
      u.Email,
      pu.Role,
      pu.CreatedAt,
      pu.CreatedBy,
      u.Estatus
    FROM Security.PlatformUsers pu
    INNER JOIN dbo.GASOCO_Cat_Usuarios u ON u.IdUsuario = pu.UserID
    WHERE pu.UserID = @p1
  `, userId)

  return user ?? null
}

export async function createPlatformUser(
  input: CreateUserInput,
  adminUserId: number,
  adminEmail: string
): Promise<{ ok: boolean; userId?: number; error?: string }> {
  try {
    const tenantId = await getAdminTenantId()
    await setTenantContext(tenantId)

    const existingUser = await prisma.$queryRawUnsafe<Array<{ IdUsuario: number }>>(
      'SELECT IdUsuario FROM dbo.GASOCO_Cat_Usuarios WHERE Usuario = @p1',
      input.usuario
    )

    if (existingUser.length > 0) {
      return { ok: false, error: 'USERNAME_ALREADY_EXISTS' }
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO dbo.GASOCO_Cat_Usuarios (Nombre, Usuario, Password, Email, Estatus, TenantID, FechaAlta)
       VALUES (@p1, @p2, @p3, @p4, 'A', CAST(@p5 AS uniqueidentifier), SYSUTCDATETIME())`,
      input.nombre,
      input.usuario,
      input.password,
      input.email,
      tenantId
    )

    const [newUserResult] = await prisma.$queryRawUnsafe<Array<{ IdUsuario: number }>>(
      'SELECT IdUsuario FROM dbo.GASOCO_Cat_Usuarios WHERE Usuario = @p1',
      input.usuario
    )

    const newUserId = newUserResult?.IdUsuario
    if (!newUserId) {
      return { ok: false, error: 'FAILED_TO_CREATE_USER' }
    }

    await prisma.$executeRawUnsafe(`
      INSERT INTO Security.PlatformUsers (UserID, Role, CreatedAt, CreatedBy)
      VALUES (@p1, @p2, SYSUTCDATETIME(), @p3)
    `, newUserId, input.role, adminUserId)

    await writeTransactionLog({
      tenantId,
      tableName: 'Security.PlatformUsers',
      action: 'PLT_CR',
      userId: adminUserId,
      newData: { userId: newUserId, role: input.role, nombre: input.nombre, usuario: input.usuario },
      appUser: adminEmail,
    })

    revalidateTag('platform-user')

    return { ok: true, userId: newUserId }
  } catch (error) {
    console.error('[CREATE_PLATFORM_USER_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

interface AddPlatformRoleOptions {
  userId: number
  role: PlatformRole
  adminUserId: number
  adminEmail: string
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

interface UpdatePlatformUserOptions {
  userId: number
  nombre?: string
  email?: string
  adminUserId: number
  adminEmail: string
}

export async function updatePlatformUser(options: UpdatePlatformUserOptions): Promise<{ ok: boolean; error?: string }> {
  const { userId, nombre, email, adminUserId, adminEmail } = options

  try {
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
      updates.push(`Nombre = @p${paramIndex++}`)
    }
    if (email !== undefined) {
      params.push(email)
      updates.push(`Email = @p${paramIndex++}`)
    }

    if (updates.length === 0) {
      return { ok: true }
    }

    params.push(userId)

    const tenantId = await getAdminTenantId()
    await setTenantContext(tenantId)

    await prisma.$executeRawUnsafe(
      `UPDATE dbo.GASOCO_Cat_Usuarios SET ${updates.join(', ')} WHERE IdUsuario = @p${paramIndex}`,
      ...params
    )

    await writeTransactionLog({
      tenantId,
      tableName: 'GASOCO_Cat_Usuarios',
      action: 'UPDATE',
      userId: adminUserId,
      oldData: { nombre: existing.Nombre, email: existing.Email },
      newData: { nombre, email },
      appUser: adminEmail,
    })

    revalidateTag('platform-user')

    return { ok: true }
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
    await setTenantContext(tenantId)

    await prisma.$executeRawUnsafe(
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
    await setTenantContext(tenantId)

    await prisma.$executeRawUnsafe(
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
  } catch (error) {
    console.error('[ACTIVATE_PLATFORM_USER_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}

export async function deletePlatformUser(
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
      return { ok: false, error: 'CANNOT_DELETE_OLDEST_USER' }
    }

    const tenantId = await getAdminTenantId()
    await setTenantContext(tenantId)

    await prisma.$executeRawUnsafe(
      `DELETE FROM dbo.GASOCO_Cat_Usuarios WHERE IdUsuario = @p1`,
      userId
    )

    await writeTransactionLog({
      tenantId,
      tableName: 'GASOCO_Cat_Usuarios',
      action: 'DELETE',
      userId: adminUserId,
      oldData: { userId, nombre: existing.Nombre, usuario: existing.Usuario },
      appUser: adminEmail,
    })

    revalidateTag('platform-user')

    return { ok: true }
  } catch (error) {
    console.error('[DELETE_PLATFORM_USER_ERROR]', error)
    return { ok: false, error: 'INTERNAL_ERROR' }
  }
}
