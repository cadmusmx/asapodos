import { Prisma } from '@prisma/client';

export interface VehicleFilters {
  q?: string;
  estatus?: number;
  departamento?: number;
  conductor?: number;
}

// Escapa comodines de LIKE (| % _ [ ]) usando '|' como carácter de escape.
function escapeLike(value: string): string {
  return value.replace(/[|%_[\]]/g, m => `|${m}`);
}

// Normaliza el body a filtros tipados; ignora vacíos y no-enteros.
export function parseVehicleFilters(raw: unknown): VehicleFilters {
  const b = (raw ?? {}) as Record<string, unknown>;
  const filters: VehicleFilters = {};

  if (typeof b.q === 'string' && b.q.trim() !== '') filters.q = b.q.trim();
  if (Number.isInteger(b.estatus)) filters.estatus = b.estatus as number;
  if (Number.isInteger(b.departamento)) filters.departamento = b.departamento as number;
  if (Number.isInteger(b.conductor)) filters.conductor = b.conductor as number;

  return filters;
}

// WHERE compartido por /search y /stats: mismos filtros -> mismas cifras.
// Solo referencia columnas de `v` (no arrastra JOINs), así stats no necesita joins.
// TenantID explícito además de RLS (defensa en profundidad).
export function buildVehicleWhere(tenantId: string, f: VehicleFilters): Prisma.Sql {
  const conds: Prisma.Sql[] = [Prisma.sql`v.TenantID = CAST(${tenantId} AS uniqueidentifier)`];

  if (f.q) {
    const pattern = `%${escapeLike(f.q)}%`;

    conds.push(Prisma.sql`(
      v.Placa LIKE ${pattern} ESCAPE '|'
      OR v.NoEconomico LIKE ${pattern} ESCAPE '|'
      OR v.Modelo LIKE ${pattern} ESCAPE '|'
      OR v.SerialVehiculo LIKE ${pattern} ESCAPE '|'
      OR v.Linea LIKE ${pattern} ESCAPE '|'
    )`);
  }

  if (f.estatus !== undefined) conds.push(Prisma.sql`v.Estatus = ${f.estatus}`);
  if (f.departamento !== undefined) conds.push(Prisma.sql`v.Departamento = ${f.departamento}`);
  if (f.conductor !== undefined) conds.push(Prisma.sql`v.ConductorEmployeeID = ${f.conductor}`);

  return Prisma.join(conds, ' AND ');
}

// COUNT(*) OVER() y COUNT/SUM pueden volver bigint -> Number seguro (NULL -> 0).
export function toNumber(v: number | bigint | null | undefined): number {
  if (v == null) return 0;

  return typeof v === 'bigint' ? Number(v) : v;
}

// Whitelist de orden: el valor SIEMPRE sale de aquí, nunca del cliente.
export const VEHICLE_SORT_MAP: Record<string, string> = {
  placa: 'v.Placa',
  noEconomico: 'v.NoEconomico',
  modelo: 'v.Modelo',
  kilometraje: 'v.Kilometraje',
  vencePoliza: 'v.FechaVencimientoPoliza',
  venceTarjeta: 'v.FechaVencimientoTarjeta',
};

export function resolveSort(sort: string | null): string {
  return (sort && VEHICLE_SORT_MAP[sort]) || 'v.Placa';
}
