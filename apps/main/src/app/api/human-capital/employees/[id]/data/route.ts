import { NextResponse } from 'next/server'

import { Prisma } from '@prisma/client'

import { PERM, withPermission, writeTransactionLog } from '@gaso/shared'

import { withTenantContext } from '@/lib/tenant-context'

export const runtime = 'nodejs'

type RouteContext = { params: Promise<{ id: string }> }

type EmployeeDataRow = {
  EmployeeID: number
  CURP: string | null
  RFC: string | null
  NSS: string | null
  FechaNacimiento: Date | string | null
  Sueldo: unknown
  TieneLicencia: boolean | number | null
  FechaCaducidadLicencia: Date | string | null
  FechaDC3: Date | string | null
  Sexo: string | null
  TipoSangre: string | null
  RegionID: number | null
  AreaID: number | null
  AreaName: string | null
  SupervisorEmployeeID: number | null
  SupNumber: string | null
  SupFirst: string | null
  SupLast: string | null
}

const toDateStr = (value: Date | string | null): string | null => {
  if (!value) return null
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  if (typeof value === 'string') return value.slice(0, 10)

  return null
}

const normalizeData = (row: EmployeeDataRow) => {
  const supName = row.SupervisorEmployeeID
    ? `${row.SupNumber ? `${row.SupNumber} - ` : ''}${row.SupFirst ?? ''} ${row.SupLast ?? ''}`.trim()
    : null

  return {
    employeeId: row.EmployeeID,
    curp: row.CURP ?? null,
    rfc: row.RFC ?? null,
    nss: row.NSS ?? null,
    fechaNacimiento: toDateStr(row.FechaNacimiento),
    sueldo: row.Sueldo === null || row.Sueldo === undefined ? null : Number(row.Sueldo),
    tieneLicencia: row.TieneLicencia === null ? null : Boolean(row.TieneLicencia),
    fechaCaducidadLicencia: toDateStr(row.FechaCaducidadLicencia),
    fechaDC3: toDateStr(row.FechaDC3),
    sexo: row.Sexo ?? null,
    tipoSangre: row.TipoSangre ?? null,
    regionId: row.RegionID ?? null,
    areaId: row.AreaID ?? null,
    areaName: row.AreaName ?? null,
    supervisorEmployeeId: row.SupervisorEmployeeID ?? null,
    supervisorName: supName
  }
}

type DataPayload = {
  curp: string | null
  rfc: string | null
  nss: string | null
  fechaNacimiento: string | null
  sueldo: number | null
  tieneLicencia: boolean | null
  fechaCaducidadLicencia: string | null
  fechaDC3: string | null
  sexo: 'M' | 'F' | null
  tipoSangre: string | null
  regionId: number | null
  areaId: number | null
  supervisorEmployeeId: number | null
}

const asStr = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

const asPosInt = (v: unknown): number | null => {
  const n = Number(v)

  return Number.isInteger(n) && n > 0 ? n : null
}

const asNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)

  return Number.isFinite(n) ? n : null
}

const asDate = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.slice(0, 10) : null)
const asBool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null)

const parseDataPayload = (body: unknown): DataPayload => {
  if (typeof body !== 'object' || body === null) throw new Error('Body inválido')

  const raw = body as Record<string, unknown>

  const sexoRaw = asStr(raw.sexo)
  const sexo = sexoRaw === 'M' || sexoRaw === 'F' ? sexoRaw : null

  const regionRaw = asPosInt(raw.regionId)
  const regionId = regionRaw !== null && regionRaw >= 1 && regionRaw <= 12 ? regionRaw : null

  return {
    curp: asStr(raw.curp),
    rfc: asStr(raw.rfc),
    nss: asStr(raw.nss),
    fechaNacimiento: asDate(raw.fechaNacimiento),
    sueldo: asNum(raw.sueldo),
    tieneLicencia: asBool(raw.tieneLicencia),
    fechaCaducidadLicencia: asDate(raw.fechaCaducidadLicencia),
    fechaDC3: asDate(raw.fechaDC3),
    sexo,
    tipoSangre: asStr(raw.tipoSangre),
    regionId,
    areaId: asPosInt(raw.areaId),
    supervisorEmployeeId: asPosInt(raw.supervisorEmployeeId)
  }
}

export const GET = withPermission(
  'employees',
  async (_req, { tenantId }, context: RouteContext) => {
    const { id } = await context.params
    const employeeId = Number(id)

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return NextResponse.json({ message: 'Empleado inválido.' }, { status: 400 })
    }

    return withTenantContext(tenantId, async tx => {
      const rows = await tx.$queryRaw<EmployeeDataRow[]>(
        Prisma.sql`
          SELECT
            ed.EmployeeID, ed.CURP, ed.RFC, ed.NSS,
            ed.FechaNacimiento, ed.Sueldo, ed.TieneLicencia, ed.FechaCaducidadLicencia, ed.FechaDC3,
            ed.Sexo, ed.TipoSangre, ed.RegionID,
            ed.AreaID, a.Name AS AreaName,
            ed.SupervisorEmployeeID, s.EmployeeNumber AS SupNumber, s.FirstName AS SupFirst, s.LastName AS SupLast
          FROM HumanCapital.EmployeeData ed
          LEFT JOIN HumanCapital.Areas a
            ON a.TenantID = ed.TenantID AND a.AreaID = ed.AreaID
          LEFT JOIN HumanCapital.Employees s
            ON s.TenantID = ed.TenantID AND s.EmployeeID = ed.SupervisorEmployeeID
          WHERE ed.TenantID = CAST(${tenantId} AS uniqueidentifier)
            AND ed.EmployeeID = ${employeeId}
        `
      )

      const row = rows[0]

      // 1:1 puede no existir aún → data null (el form arranca vacío).
      return NextResponse.json({ data: row ? normalizeData(row) : null })
    })
  },
  { bit: PERM.R }
)

export const PUT = withPermission(
  'employees',
  async (req, { auth, tenantId }, context: RouteContext) => {
    const { id } = await context.params
    const employeeId = Number(id)

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return NextResponse.json({ message: 'Empleado inválido.' }, { status: 400 })
    }

    let payload: DataPayload

    try {
      payload = parseDataPayload(await req.json())
    } catch (error) {
      return NextResponse.json({ message: error instanceof Error ? error.message : 'Body inválido' }, { status: 400 })
    }

    const licencia = payload.tieneLicencia === null ? null : payload.tieneLicencia ? 1 : 0
    const fechaNac = payload.fechaNacimiento ?? ''
    const fechaCad = payload.fechaCaducidadLicencia ?? ''
    const fechaDC3v = payload.fechaDC3 ?? ''

    try {
      await withTenantContext(tenantId, async tx => {
        const emp = await tx.$queryRaw<Array<{ EmployeeID: number }>>(
          Prisma.sql`
            SELECT EmployeeID FROM HumanCapital.Employees
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND EmployeeID = ${employeeId}
          `
        )

        if (!emp[0]) throw new Error('EMPLOYEE_NOT_FOUND')

        const existing = await tx.$queryRaw<Array<{ EmployeeID: number }>>(
          Prisma.sql`
            SELECT EmployeeID FROM HumanCapital.EmployeeData
            WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND EmployeeID = ${employeeId}
          `
        )

        if (existing.length) {
          await tx.$executeRaw(
            Prisma.sql`
              UPDATE HumanCapital.EmployeeData SET
                CURP = ${payload.curp},
                RFC = ${payload.rfc},
                NSS = ${payload.nss},
                FechaNacimiento = TRY_CAST(${fechaNac} AS DATE),
                Sueldo = ${payload.sueldo},
                TieneLicencia = ${licencia},
                FechaCaducidadLicencia = TRY_CAST(${fechaCad} AS DATE),
                FechaDC3 = TRY_CAST(${fechaDC3v} AS DATE),
                Sexo = ${payload.sexo},
                TipoSangre = ${payload.tipoSangre},
                RegionID = ${payload.regionId},
                AreaID = ${payload.areaId},
                SupervisorEmployeeID = ${payload.supervisorEmployeeId},
                UpdatedAt = SYSUTCDATETIME(),
                UpdatedBy = ${auth.userId}
              WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND EmployeeID = ${employeeId}
            `
          )
        } else {
          await tx.$executeRaw(
            Prisma.sql`
              INSERT INTO HumanCapital.EmployeeData
                (TenantID, EmployeeID, CURP, RFC, NSS, FechaNacimiento, Sueldo, TieneLicencia,
                 FechaCaducidadLicencia, FechaDC3, Sexo, TipoSangre, RegionID, AreaID, SupervisorEmployeeID, CreatedBy)
              VALUES (
                CAST(${tenantId} AS uniqueidentifier), ${employeeId}, ${payload.curp}, ${payload.rfc}, ${payload.nss},
                TRY_CAST(${fechaNac} AS DATE), ${payload.sueldo}, ${licencia},
                TRY_CAST(${fechaCad} AS DATE), TRY_CAST(${fechaDC3v} AS DATE),
                ${payload.sexo}, ${payload.tipoSangre}, ${payload.regionId}, ${payload.areaId},
                ${payload.supervisorEmployeeId}, ${auth.userId}
              )
            `
          )
        }
      })

      writeTransactionLog({
        tenantId,
        tableName: 'HumanCapital.EmployeeData',
        action: 'UPSERT',
        userId: auth.userId,
        appUser: auth.email ?? null,
        oldData: null,
        newData: { employeeId } // PII: no volcamos el payload al log
      }).catch(() => {})

      return NextResponse.json({ data: { employeeId } })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR'

      if (message.includes('EMPLOYEE_NOT_FOUND')) {
        return NextResponse.json({ message: 'El empleado no existe.' }, { status: 404 })
      }

      if (message.includes('FK_HC_EmployeeData_Area')) {
        return NextResponse.json({ message: 'Área inválida.' }, { status: 400 })
      }

      if (message.includes('FK_HC_EmployeeData_Supervisor')) {
        return NextResponse.json({ message: 'Supervisor inválido.' }, { status: 400 })
      }

      console.error('[EMPLOYEE_DATA_UPSERT_ERROR]', { message })

      return NextResponse.json({ message: 'Error al guardar los datos.' }, { status: 500 })
    }
  },
  { bit: PERM.U }
)
