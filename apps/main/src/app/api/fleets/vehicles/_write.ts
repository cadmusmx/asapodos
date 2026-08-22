import { Prisma } from '@prisma/client';

// Payload de alta/edición en camelCase (convención de bodies del repo).
// Alta: exige placa. Edición: diff parcial (solo las claves presentes se tocan).
export interface VehicleWritePayload {
  placa?: string | null;
  noEconomico?: string | null;
  serialVehiculo?: string | null;
  serialMotor?: string | null;
  modelo?: string | null;
  linea?: string | null;
  marca?: number | null;
  kilometraje?: number | null;
  idEstadoPlaca?: number | null;
  color?: number | null;
  poliza?: string | null;
  empresa?: number | null;
  fechaVencimientoPoliza?: string | null;
  estatus?: number | null;
  departamento?: number | null;
  ubicacion?: string | null;
  region?: number | null;
  propietario?: number | null;
  fechaVencimientoTarjeta?: string | null;
  tipoVehiculo?: number | null;
  fechaVerificacion?: string | null;
  fechaProximaVerificacion?: string | null;
  combustible?: number | null;
  notas?: string | null;
  puertas?: number | null;
  traccion?: string | null;
  conductorEmployeeID?: number | null;
}

// clave payload -> columna. Única fuente de escritura por columna (evita double-set).
// GPS, IdAuto, TenantID y auditoría NO se escriben desde el body.
export const VEHICLE_FIELD_MAP: Record<keyof VehicleWritePayload, string> = {
  placa: 'Placa',
  noEconomico: 'NoEconomico',
  serialVehiculo: 'SerialVehiculo',
  serialMotor: 'SerialMotor',
  modelo: 'Modelo',
  linea: 'Linea',
  marca: 'Marca',
  kilometraje: 'Kilometraje',
  idEstadoPlaca: 'IdEstadoPlaca',
  color: 'Color',
  poliza: 'Poliza',
  empresa: 'Empresa',
  fechaVencimientoPoliza: 'FechaVencimientoPoliza',
  estatus: 'Estatus',
  departamento: 'Departamento',
  ubicacion: 'Ubicacion',
  region: 'Region',
  propietario: 'Propietario',
  fechaVencimientoTarjeta: 'FechaVencimientoTarjeta',
  tipoVehiculo: 'TipoVehiculo',
  fechaVerificacion: 'FechaVerificacion',
  fechaProximaVerificacion: 'FechaProximaVerificacion',
  combustible: 'Combustible',
  notas: 'Notas',
  puertas: 'Puertas',
  traccion: 'Traccion',
  conductorEmployeeID: 'ConductorEmployeeID',
};

const STRING_KEYS = new Set<keyof VehicleWritePayload>([
  'placa', 'noEconomico', 'serialVehiculo', 'serialMotor', 'modelo', 'linea', 'poliza', 'ubicacion', 'notas', 'traccion',
]);

const INT_KEYS = new Set<keyof VehicleWritePayload>([
  'marca', 'kilometraje', 'idEstadoPlaca', 'color', 'empresa', 'estatus', 'departamento', 'region', 'propietario', 'tipoVehiculo', 'combustible', 'puertas', 'conductorEmployeeID',
]);

const DATE_KEYS = new Set<keyof VehicleWritePayload>([
  'fechaVencimientoPoliza', 'fechaVencimientoTarjeta', 'fechaVerificacion', 'fechaProximaVerificacion',
]);

// Valida FORMA (tipos). Solo copia claves presentes en el body -> diff parcial.
// null explícito = limpiar el campo; clave ausente = no tocar.
export function parseVehiclePayload(raw: unknown): VehicleWritePayload {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Body inválido');
  }

  const b = raw as Record<string, unknown>;
  const out = {} as Record<string, unknown>;

  (Object.keys(VEHICLE_FIELD_MAP) as (keyof VehicleWritePayload)[]).forEach(key => {
    if (!(key in b)) return;

    const v = b[key];

    if (v === null) {
      out[key] = null;

      return;
    }

    if (STRING_KEYS.has(key)) {
      out[key] = typeof v === 'string' ? v.trim() : String(v);
    } else if (INT_KEYS.has(key)) {
      const n = Number(v);

      if (!Number.isInteger(n)) throw new Error(`El campo ${key} debe ser un entero`);
      out[key] = n;
    } else if (DATE_KEYS.has(key)) {
      out[key] = String(v); // ISO; el CAST AS date lo valida en SQL
    }
  });

  return out as VehicleWritePayload;
}

// Normaliza un valor de payload a su Prisma.Sql por tipo, con NULL explícito.
function normalizeValue(key: keyof VehicleWritePayload, value: unknown): Prisma.Sql {
  if (value === null || value === '') return Prisma.sql`NULL`;
  if (DATE_KEYS.has(key)) return Prisma.sql`CAST(${String(value)} AS date)`;
  if (INT_KEYS.has(key)) return Prisma.sql`${Number(value)}`;

  return Prisma.sql`${String(value)}`;
}

// Columnas/valores/asignaciones alineados para las claves presentes.
// Columna vía Prisma.raw es seguro: SIEMPRE sale del FIELD_MAP, nunca del cliente.
export function buildWriteColumns(payload: VehicleWritePayload): {
  cols: Prisma.Sql[];
  vals: Prisma.Sql[];
  assigns: Prisma.Sql[];
} {
  const cols: Prisma.Sql[] = [];
  const vals: Prisma.Sql[] = [];
  const assigns: Prisma.Sql[] = [];

  (Object.keys(VEHICLE_FIELD_MAP) as (keyof VehicleWritePayload)[]).forEach(key => {
    if (payload[key] === undefined) return;

    const col = Prisma.raw(VEHICLE_FIELD_MAP[key]);
    const val = normalizeValue(key, payload[key]);

    cols.push(col);
    vals.push(val);
    assigns.push(Prisma.sql`${col} = ${val}`);
  });

  return { cols, vals, assigns };
}

// Pre-chequeo de UNIQUE (TenantID, Placa) / (TenantID, SerialVehiculo).
// Devuelve el campo colisionado para responder 409 con mensaje claro (no 500 opaco).
export async function findUniqueConflict(
  tx: Prisma.TransactionClient,
  tenantId: string,
  placa: string | null | undefined,
  vin: string | null | undefined,
  excludeId?: number,
): Promise<'placa' | 'vin' | null> {
  const exclude = excludeId ? Prisma.sql`AND IdAuto <> ${excludeId}` : Prisma.empty;

  if (placa) {
    const hit = await tx.$queryRaw<Array<{ IdAuto: number }>>`
      SELECT TOP 1 IdAuto FROM Fleet.Vehicles
      WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND Placa = ${placa} ${exclude}
    `;

    if (hit.length > 0) return 'placa';
  }

  if (vin) {
    const hit = await tx.$queryRaw<Array<{ IdAuto: number }>>`
      SELECT TOP 1 IdAuto FROM Fleet.Vehicles
      WHERE TenantID = CAST(${tenantId} AS uniqueidentifier) AND SerialVehiculo = ${vin} ${exclude}
    `;

    if (hit.length > 0) return 'vin';
  }

  return null;
}
