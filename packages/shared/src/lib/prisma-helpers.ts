import { PrismaClient } from '@prisma/client'

/**
 * leer [ADVERTENCIA DE SEGURIDAD] antes de usar.
 */
export async function queryRaw<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: (string | number | boolean | null | undefined)[]
): Promise<T[]> {
  const prisma = new PrismaClient()

  try {
    const query = strings.reduce((acc, str, i) => {
      return acc + str + (i < values.length ? ` ${values[i]} ` : '')
    })

    const result = await prisma.$queryRawUnsafe<T[]>(query)

    await prisma.$disconnect()

    return result
  } catch (error) {
    await prisma.$disconnect()
    throw error
  }
}

/**
 * leer [ADVERTENCIA DE SEGURIDAD] antes de usar.
 */
export async function executeRaw(
  strings: TemplateStringsArray,
  ...values: (string | number | boolean | null | undefined)[]
): Promise<{ count: number }> {
  const prisma = new PrismaClient()

  try {
    const query = strings.reduce((acc, str, i) => {
      return acc + str + (i < values.length ? ` ${values[i]} ` : '')
    })

    const result = await prisma.$executeRawUnsafe(query)

    await prisma.$disconnect()

    return { count: result }
  } catch (error) {
    await prisma.$disconnect()
    throw error
  }
}

/**
 * [ADVERTENCIA DE SEGURIDAD]
 * Pese a la firma de tagged template, estas funciones NO parametrizan.
 * Concatenan los valores como texto crudo en el string y lo ejecutan vía
 * `$queryRawUnsafe` / `$executeRawUnsafe`. Por lo tanto:
 *
 *  1. SQL INJECTION: cualquier valor de origen no confiable (input de usuario,
 *     query params, body) es inyectable. Solo es seguro con valores ya
 *     saneados a tipo no-string (p.ej. envueltos en `parseInt`/`Number`).
 *
 *  2. ROMPE SESSION_CONTEXT / RLS: cada llamada crea un `new PrismaClient()` y
 *     se desconecta. Abre una conexión distinta a la que tenga establecido el
 *     contexto de tenant, por lo que la query puede correr SIN el contexto RLS
 *     esperado. NO usar en rutas tenant-scoped que dependan de RLS.
 *
 * Para datos sensibles o entrada de usuario, usar el tagged template REAL de
 * Prisma: `prisma.$queryRaw\`... ${valor} ...\`` (parametriza de verdad), dentro
 * de `withTenantContext` cuando se requiera aislamiento de tenant.
 *
 * TODO [deuda-seguridad]: migrar estos helpers a `$queryRaw`/`$executeRaw`
 * parametrizados y reutilizar el cliente Prisma compartido (sin new/disconnect por llamada).
 * Afecta ~50 archivos — coordinar migración.
 * Autor: Diego
 */
