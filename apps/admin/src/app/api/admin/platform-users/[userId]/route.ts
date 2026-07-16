import { NextRequest, NextResponse } from 'next/server'

import { requirePlatformRole } from '@gaso/shared'
import {
  deletePlatformUser,
  updatePlatformUser,
  deactivatePlatformUser,
  activatePlatformUser,
  removePlatformRole
} from '@/services/platform-user-service'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: guard.status })
  }

  try {
    const { userId } = await params

    if (!userId) {
      return NextResponse.json({ message: ['userId is required'] }, { status: 400 })
    }

    const body = await req.json()
    const { nombre, email } = body

    if (!nombre && !email) {
      return NextResponse.json({ message: ['nombre or email is required'] }, { status: 400 })
    }

    const result = await updatePlatformUser({
      userId: Number(userId),
      nombre,
      email,
      adminUserId: guard.userId,
      adminEmail: String(guard.platformRole)
    })

    if (!result.ok) {
      if (result.error === 'USER_NOT_FOUND') {
        return NextResponse.json({ message: ['User not found'] }, { status: 404 })
      }
      if (result.error === 'CANNOT_EDIT_OLDEST_USER') {
        return NextResponse.json({ message: ['No se puede editar al usuario más antiguo'] }, { status: 403 })
      }
      return NextResponse.json({ message: ['Failed to update user'] }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[ADMIN_UPDATE_PLATFORM_USER_ERROR]', error)
    return NextResponse.json({ message: ['Internal server error'] }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: guard.status })
  }

  try {
    const { userId } = await params
    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    if (!userId) {
      return NextResponse.json({ message: ['userId is required'] }, { status: 400 })
    }

    if (action === 'role') {
      const result = await removePlatformRole({
        userId: Number(userId),
        adminUserId: guard.userId,
        adminEmail: String(guard.platformRole)
      })

      if (!result.ok) {
        if (result.error === 'USER_NOT_FOUND') {
          return NextResponse.json({ message: ['User not found'] }, { status: 404 })
        }
        if (result.error === 'CANNOT_REMOVE_OLDEST_USER') {
          return NextResponse.json({ message: ['No se puede remover el rol del usuario más antiguo'] }, { status: 403 })
        }
        return NextResponse.json({ message: ['Failed to remove platform role'] }, { status: 500 })
      }

      return NextResponse.json({ ok: true })
    }

    const result = await deletePlatformUser(
      Number(userId),
      guard.userId,
      String(guard.platformRole)
    )

    if (!result.ok) {
      if (result.error === 'USER_NOT_FOUND') {
        return NextResponse.json({ message: ['User not found'] }, { status: 404 })
      }
      if (result.error === 'CANNOT_DELETE_OLDEST_USER') {
        return NextResponse.json({ message: ['No se puede eliminar al usuario más antiguo'] }, { status: 403 })
      }
      return NextResponse.json({ message: ['Failed to delete user'] }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[ADMIN_DELETE_PLATFORM_USER_ERROR]', error)
    return NextResponse.json({ message: ['Internal server error'] }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: guard.status })
  }

  try {
    const { userId } = await params

    if (!userId) {
      return NextResponse.json({ message: ['userId is required'] }, { status: 400 })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'deactivate') {
      const result = await deactivatePlatformUser(
        Number(userId),
        guard.userId,
        String(guard.platformRole)
      )

      if (!result.ok) {
        if (result.error === 'USER_NOT_FOUND') {
          return NextResponse.json({ message: ['User not found'] }, { status: 404 })
        }
        if (result.error === 'CANNOT_DEACTIVATE_OLDEST_USER') {
          return NextResponse.json({ message: ['No se puede desactivar al usuario más antiguo'] }, { status: 403 })
        }
        return NextResponse.json({ message: ['Failed to deactivate user'] }, { status: 500 })
      }

      return NextResponse.json({ ok: true })
    }

    if (action === 'activate') {
      const result = await activatePlatformUser(
        Number(userId),
        guard.userId,
        String(guard.platformRole)
      )

      if (!result.ok) {
        if (result.error === 'USER_NOT_FOUND') {
          return NextResponse.json({ message: ['User not found'] }, { status: 404 })
        }
        return NextResponse.json({ message: ['Failed to activate user'] }, { status: 500 })
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ message: ['Invalid action'] }, { status: 400 })
  } catch (error) {
    console.error('[ADMIN_PLATFORM_USER_ACTION_ERROR]', error)
    return NextResponse.json({ message: ['Internal server error'] }, { status: 500 })
  }
}
