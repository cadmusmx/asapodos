import { NextRequest, NextResponse } from 'next/server'

import { requirePlatformRole } from '@gaso/shared'
import type { PlatformRole } from '@gaso/shared'
import { listPlatformUsers, createPlatformUser, addPlatformRole } from '@/services/platform-user-service'

export async function GET(req: NextRequest) {
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: guard.status })
  }

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page')) || 1
  const pageSize = Number(searchParams.get('pageSize')) || 20
  const role = searchParams.get('role') as PlatformRole | null
  const search = searchParams.get('search')

  const result = await listPlatformUsers({ page, pageSize, role, search })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const guard = await requirePlatformRole('super_admin')

  if (!guard.ok) {
    return NextResponse.json({ message: guard.message }, { status: guard.status })
  }

  try {
    const body = await req.json()
    const { nombre, usuario, email, password, role, userId } = body

    if (userId !== undefined) {
      if (!role) {
        return NextResponse.json(
          { message: ['role is required when assigning to existing user'] },
          { status: 400 }
        )
      }

      if (role !== 'super_admin' && role !== 'auditor') {
        return NextResponse.json(
          { message: ['Invalid role. Must be super_admin or auditor'] },
          { status: 400 }
        )
      }

      const result = await addPlatformRole({
        userId: Number(userId),
        role,
        adminUserId: guard.userId,
        adminEmail: String(guard.platformRole)
      })

      if (!result.ok) {
        if (result.error === 'USER_ALREADY_HAS_ROLE') {
          return NextResponse.json({ message: ['El usuario ya tiene un rol de plataforma'] }, { status: 409 })
        }
        return NextResponse.json({ message: ['Failed to assign role'] }, { status: 500 })
      }

      return NextResponse.json({ ok: true }, { status: 201 })
    }

    if (!nombre || !usuario || !email || !password || !role) {
      return NextResponse.json(
        { message: ['nombre, usuario, email, password, and role are required'] },
        { status: 400 }
      )
    }

    if (role !== 'super_admin' && role !== 'auditor') {
      return NextResponse.json(
        { message: ['Invalid role. Must be super_admin or auditor'] },
        { status: 400 }
      )
    }

    if (password.length < 4) {
      return NextResponse.json(
        { message: ['Password must be at least 4 characters'] },
        { status: 400 }
      )
    }

    const result = await createPlatformUser(
      { nombre, usuario, email, password, role },
      guard.userId,
      String(guard.platformRole)
    )

    if (!result.ok) {
      if (result.error === 'USERNAME_ALREADY_EXISTS') {
        return NextResponse.json({ message: ['El nombre de usuario ya existe'] }, { status: 409 })
      }
      return NextResponse.json({ message: ['Failed to create user'] }, { status: 500 })
    }

    return NextResponse.json({ ok: true, userId: result.userId }, { status: 201 })
  } catch (error) {
    console.error('[ADMIN_PLATFORM_USER_ERROR]', error)
    return NextResponse.json({ message: ['Internal server error'] }, { status: 500 })
  }
}
