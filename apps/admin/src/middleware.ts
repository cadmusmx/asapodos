import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

const PUBLIC_PATHS = ['/admin/login', '/api/admin/login', '/api/admin/auth-mfa/start', '/api/auth/', '/images/']

const AUDITOR_ALLOWED_PATHS = ['/admin/audit', '/api/admin/audit', '/api/admin/audit/tenants']

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

  if (!token) {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (!token.platformRole) {
    return NextResponse.redirect(new URL('/admin/login?error=unauthorized', request.url))
  }

  if (token.platformRole === 'auditor' && !AUDITOR_ALLOWED_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/admin/audit', request.url))
  }

  const headers = new Headers(request.headers)
  headers.set('x-admin-user-id', String(token.id ?? ''))
  headers.set('x-admin-role', String(token.platformRole))

  return NextResponse.next({ request: { headers } })
}
