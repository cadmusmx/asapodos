import { Prisma } from '@prisma/client';

import { withTenantContext } from '@/lib/tenant-context';

/**
 * Servicio núcleo D·VM (S0) — OutDerived (salida generada a partir de un IN).
 * PURO (sin transporte HTTP): lo consumen la ruta web (out/, verify-folio/) y,
 * más adelante, el BFF móvil (S5). Toda escritura vive en un único
 * withTenantContext(tx); las tablas de enlace no tienen RLS y se aíslan por el
 * filtro TenantID explícito + su FK a la cabecera.
 */

// Normaliza el folio IN: acepta con o sin prefijo VME- (colación CI en BD).
export function normalizeInFolio(raw: string): string {
  const f = raw.trim();

  return /^VME-/i.test(f) ? f : `VME-${f}`;
}

export type VerifyReason = 'VALID' | 'ALREADY_EXTENDED' | 'NOT_FOUND' | 'NOT_IN';

export interface VerifyResult {
  reason: VerifyReason;
  folio: string; // folio IN normalizado
  idIn?: number; // presente solo cuando VALID
}

/**
 * verifyFolioIn — orden optimizado (Extended primero).
 * 1) Normaliza.
 * 2) ¿EXTENDED? consulta la tabla de enlace (chica) con TenantID EXPLÍCITO. La FK
 *    GASOAL_VMOut.FolioIN→VMES garantiza que un extendido ya es IN válido del
 *    tenant → se rechaza y se cierra sin tocar la cabecera.
 * 3) Si no, verifica en la cabecera (RLS): existe, es IN (ES=1), del tenant.
 */
export async function verifyFolioIn(tenantId: string, rawFolio: string): Promise<VerifyResult> {
  const folio = normalizeInFolio(rawFolio);

  return withTenantContext(tenantId, async tx => {
    const extended = await tx.$queryRaw<Array<{ n: number }>>`
      SELECT TOP 1 1 AS n
      FROM dbo.GASOAL_VMOut
      WHERE TenantID = ${tenantId} AND FolioIN = ${folio}
    `;

    if (extended.length > 0) return { reason: 'ALREADY_EXTENDED', folio };

    const rows = await tx.$queryRaw<Array<{ Id: number; ES: boolean | number }>>`
      SELECT Id, ES
      FROM dbo.GASOAL_VMES
      WHERE TenantID = ${tenantId} AND Folio = ${folio}
    `;

    if (rows.length === 0) return { reason: 'NOT_FOUND', folio };

    const esIn = rows[0].ES === true || rows[0].ES === 1;

    if (!esIn) return { reason: 'NOT_IN', folio };

    return { reason: 'VALID', folio, idIn: rows[0].Id };
  });
}

// Datos generales capturados en la salida (NO se heredan del IN).
export interface OutGenerales {
  fecha: string;
  aspNombre: string;
  firmaBase64: string;
  nombreContacto: string;
  placasTransporte: string;
  fotoMaterialTransporte: string;
  fotoTransporte: string;
  fotoPlacas: string;
  notas?: string | null;
}

export interface SubmitOutInput {
  tenantId: string;
  userId: number;
  folioIn: string; // IN de origen (se normaliza)
  folioOut: string; // VMS- generado por el cliente
  directQR: boolean; // true → usa la key de QR de salida del cliente; false → hereda src.Qr del IN
  qr?: string | null; // key S3, requerida solo si directQR
  generales: OutGenerales;
  materialDocumentos?: string | null; // JSON final (IN + nuevos). Si se omite, hereda src.MaterialDocumentos del IN.
}

export type SubmitOutResult =
  | { ok: true; idIn: number; idOut: number; folioOut: string }
  | { ok: false; reason: 'IN_NOT_FOUND' };

/**
 * submitOut — crea el OutDerived en un solo tx:
 *   1) Resuelve el IN (existe + ES=1 del tenant).
 *   2) INSERT…SELECT en GASOAL_VMES: copia el CONTEXTO DE MATERIAL del IN
 *      (incluidos Tarimas / MaterialDocumentos JSON tal cual) y aplica los datos
 *      generales capturados; ES=0, MaterialDescargadoFoto=NULL (es de entrada).
 *      Qr = key del cliente si directQR, o src.Qr heredado del IN.
 *   3) INSERT en GASOAL_VMOut. El UNIQUE(TenantID,FolioIN) es el candado final
 *      "1 OUT por IN" (rechaza extensión concurrente → 409 en la ruta).
 * NO inserta piezas: el OUT no tiene piezas propias, se heredan del IN (resolver S1).
 */
export async function submitOut(input: SubmitOutInput): Promise<SubmitOutResult> {
  const folioIn = normalizeInFolio(input.folioIn);
  const g = input.generales;
  const fecha = new Date(g.fecha);

  // Qr: key del cliente (directQR) o columna heredada del IN.
  const qrExpr = input.directQR ? Prisma.sql`${input.qr}` : Prisma.sql`src.Qr`;

  // MaterialDocumentos: JSON final del cliente (IN + nuevos) o herencia del IN si se omite.
  // El OUT puede añadir documentos opcionales sobre los que trae el IN.
  const docsExpr =
    input.materialDocumentos !== undefined && input.materialDocumentos !== null
      ? Prisma.sql`${input.materialDocumentos}`
      : Prisma.sql`src.MaterialDocumentos`;

  return withTenantContext(input.tenantId, async tx => {
    const inRows = await tx.$queryRaw<Array<{ Id: number }>>`
      SELECT Id
      FROM dbo.GASOAL_VMES
      WHERE TenantID = ${input.tenantId} AND Folio = ${folioIn} AND ES = 1
    `;

    if (inRows.length === 0) return { ok: false as const, reason: 'IN_NOT_FOUND' as const };

    const idIn = inRows[0].Id;

    const inserted = await tx.$queryRaw<Array<{ Id: number }>>`
      INSERT INTO dbo.GASOAL_VMES
        (TenantID, IdUsuario, Folio, IdProyecto, IdTipoMaterial, NombreSitio, IdSitio, CuentaCliente,
         Fecha, AspNombre, AspFirma, NombreContacto, IdCarrier, OtroCarrier, IdRegion, IdAlmacenDestino,
         TotalPiezas, PlacasTransporte, MaterialEnTransporteFoto, MaterialDescargadoFoto, TransporteFoto,
         PlacasFoto, Notas, Qr, NumTarimas, Tarimas, MaterialDocumentos, ES)
      OUTPUT INSERTED.Id
      SELECT
         ${input.tenantId}, ${input.userId}, ${input.folioOut},
         src.IdProyecto, src.IdTipoMaterial, src.NombreSitio, src.IdSitio, src.CuentaCliente,
         ${fecha}, ${g.aspNombre}, ${g.firmaBase64}, ${g.nombreContacto},
         src.IdCarrier, src.OtroCarrier, src.IdRegion, src.IdAlmacenDestino,
         src.TotalPiezas, ${g.placasTransporte}, ${g.fotoMaterialTransporte}, NULL, ${g.fotoTransporte},
         ${g.fotoPlacas}, ${g.notas ?? null}, ${qrExpr}, src.NumTarimas, src.Tarimas, ${docsExpr}, 0
      FROM dbo.GASOAL_VMES src
      WHERE src.Id = ${idIn}
    `;

    const idOut = inserted[0].Id;

    await tx.$executeRaw`
      INSERT INTO dbo.GASOAL_VMOut (TenantID, IdIN, FolioIN, IdOut, FolioOut)
      VALUES (${input.tenantId}, ${idIn}, ${folioIn}, ${idOut}, ${input.folioOut})
    `;

    return { ok: true as const, idIn, idOut, folioOut: input.folioOut };
  });
}
