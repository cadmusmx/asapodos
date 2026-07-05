import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getToken } from 'next-auth/jwt'

// Middleware para resolver el tenant basado en el subdominio y proteger rutas privadas,
// excluyendo apis auth, internal y archivos estáticos como imágenes.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth/|api/internal/|api/admin/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff|woff2|ttf|otf)$).*)'
  ]
}

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG ?? 'gasohub.com'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const LOCALES = ['en', 'es'] as const

// Prefijos públicos, SIN locale. Todo lo demás es privado.
const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/register',
  '/forgot-password',
  '/auth', // tenant-not-found, tenant-inactive
  '/pages' // plantillas Materio (auth + misc) — deuda técnica: cerrar en prod
]

function stripLocale(pathname: string): string {
  // '/es/login' -> '/login' ; '/es' -> '/' ; '/login' -> '/login'
  const segments = pathname.split('/') // ['', 'es', 'login']

  if (LOCALES.includes(segments[1] as any)) {
    const rest = '/' + segments.slice(2).join('/')

    return rest === '/' ? '/' : rest.replace(/\/$/, '')
  }

  return pathname.replace(/\/$/, '') || '/'
}

function isPublicPath(pathname: string): boolean {
  const path = stripLocale(pathname)

  if (path === '/') return true // raíz pública

  return PUBLIC_PATH_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix + '/'))
}

interface TenantResult {
  TenantID: string
  CompanyName: string | null
  isActive: boolean
  Dominio: string | null
}

function extractSubdomain(host: string): string {
  const cleanHost = host.split(':')[0]

  if (cleanHost === 'localhost' || cleanHost === '127.0.0.1') return DEFAULT_TENANT_SLUG

  const parts = cleanHost.split('.')

  if (parts.length >= 3) return parts[0]

  if (parts.length === 2) return parts[0]

  return parts[0] ?? ''
}

function getLocale(pathname: string): string {
  const match = pathname.match(/^\/(en|es)/)

  return match ? match[1] : 'en'
}

function auditAccessDenied(payload: object) {
  // fire-and-forget: no await, no bloquea el redirect
  fetch(`${APP_URL}/api/internal/audit-access-denied`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(() => { })
}

function mobileTenantError(code: string, message: string, status: number) {
  return NextResponse.json({ ok: false, code, message: [message] }, { status })
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const pathname = request.nextUrl.pathname


  // --- Resolución de tenant para origen móvil (x-origin-id: 3) ---
  // La app no tiene subdominio: resuelve el tenant desde el x-tenant-slug entrante y responde JSON (no redirect).
  // Aditivo: el flujo web nunca envía x-origin-id: 3, por lo que esta rama no altera el camino por subdominio.
  // Auth real = Bearer en la ruta.
  if (request.headers.get('x-origin-id') === '3') {
    const slug = (request.headers.get('x-tenant-slug') ?? '').trim()

    if (!slug) return mobileTenantError('MISSING_TENANT', 'Tenant slug is required', 400)

    try {
      const apiUrl = `${APP_URL}/api/internal/resolve-tenant?domain=${encodeURIComponent(slug)}`
      const res = await fetch(apiUrl)

      if (!res.ok) return mobileTenantError('TENANT_LOOKUP_FAILED', 'Tenant lookup failed', 502)

      const { tenant } = (await res.json()) as { tenant: TenantResult | null }

      if (!tenant) return mobileTenantError('TENANT_NOT_FOUND', 'Organization not found', 404)
      if (!tenant.isActive) return mobileTenantError('TENANT_SUSPENDED', 'Organization is suspended', 403)

      const headers = new Headers(request.headers)

      headers.set('x-tenant-id', tenant.TenantID)
      headers.set('x-tenant-slug', tenant.Dominio ?? slug)
      headers.set('x-tenant-name', tenant.CompanyName ?? '')

      return NextResponse.next({ request: { headers } })
    } catch {
      return mobileTenantError('TENANT_LOOKUP_FAILED', 'Tenant lookup failed', 502)
    }
  }
  // --- fin rama móvil ---

  if (pathname.includes('/auth/tenant-not-found') || pathname.includes('/auth/tenant-inactive'))
    return NextResponse.next()

  const subdomain = extractSubdomain(host)

  if (!subdomain) return NextResponse.redirect(new URL(`/${getLocale(pathname)}/auth/tenant-not-found`, request.url))

  try {
    const apiUrl = `${APP_URL}/api/internal/resolve-tenant?domain=${encodeURIComponent(subdomain)}`

    const res = await fetch(apiUrl)

    if (!res.ok) return NextResponse.redirect(new URL(`/${getLocale(pathname)}/auth/tenant-not-found`, request.url))

    const { tenant } = (await res.json()) as { tenant: TenantResult | null }

    if (!tenant) return NextResponse.redirect(new URL(`/${getLocale(pathname)}/auth/tenant-not-found`, request.url))

    if (!tenant.isActive)
      return NextResponse.redirect(new URL(`/${getLocale(pathname)}/auth/tenant-inactive`, request.url))

    // Las APIs se protegen a sí mismas server-side; el middleware no las redirige a login. Solo resuelve tenant para ellas.
    // Si mañana nace /api/health y nadie la añade al matcher, el isApiRoute la atrapa igual y no la rompe
    const isApiRoute = pathname.startsWith('/api/')

    // Si la ruta es pública, no validamos sesión: solo resolvemos tenant + headers.
    if (!isPublicPath(pathname) && !isApiRoute) {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

      if (!token) {
        auditAccessDenied({
          kind: 'NO_SESSION',
          tenantId: tenant.TenantID,
          path: pathname,
          ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
        })
        const loginUrl = new URL(`/${getLocale(pathname)}/login`, request.url)

        loginUrl.searchParams.set('redirectTo', pathname)

        return NextResponse.redirect(loginUrl)
      }

      // Cross-tenant check
      let resolvedTenant = tenant.TenantID.toLowerCase()

      // SOLO DEV: simular otro tenant para probar el bloqueo cross-tenant.
      // Requiere NODE_ENV !== production Y la env var explícita. Jamás activable en prod.
      if (process.env.NODE_ENV !== 'production' && process.env.DEV_FORCE_TENANT_ID) {
        resolvedTenant = process.env.DEV_FORCE_TENANT_ID.toLowerCase()
        console.warn(`[mw][DEV] tenant forzado a ${resolvedTenant} (override de prueba activo)`)
      }

      const tokenTenant = token.tenantId?.toLowerCase()

      if (!tokenTenant || tokenTenant !== resolvedTenant) {
        auditAccessDenied({
          kind: 'CROSS_TENANT',
          tenantId: tokenTenant, // actor del intento
          attemptedTenantId: resolvedTenant, // a dónde intentó entrar
          tokenTenantId: tokenTenant,
          userId: token.id,
          path: pathname,
          ip: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? null
        })

        return NextResponse.redirect(new URL(`/${getLocale(pathname)}/pages/misc/401-not-authorized`, request.url))
      }
    }

    const headers = new Headers(request.headers)

    headers.set('x-tenant-id', tenant.TenantID)
    headers.set('x-tenant-slug', tenant.Dominio ?? '')
    headers.set('x-tenant-name', tenant.CompanyName ?? '')

    return NextResponse.next({ request: { headers } })
  } catch {
    return NextResponse.redirect(new URL(`/${getLocale(pathname)}/auth/tenant-not-found`, request.url))
  }
}
