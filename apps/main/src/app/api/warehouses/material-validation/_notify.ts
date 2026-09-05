// Hook post-guardado de VM: destinatarios? → PDF → envío. Best-effort (no lanza).
// Se dispara con after() tras responder al cliente, en alta/edición/submit-OUT.
// Reusa getVMDetail (mismo registro para PDF y correo) y renderValidacionPdf.


// Ajusta los paths de @gaso/shared/... a tu estructura (módulos no barrel).
import { armarDestinatarios, type DestinatarioRow } from '@gaso/shared/lib/mail/mailer-core'
import { enviarCorreoValidacion } from '@gaso/shared/lib/mail/validacion-mailer'
import { renderValidacionPdf } from '@gaso/shared/lib/pdf/validacion-pdf'
import { withTenantContext } from '@gaso/shared'

import { getVMDetail } from './_detail'

// Destinatarios transversales (sin tenant): sp_VM_GetDestinatarios(@IdRegion, @IdCarrier).
// Se corre dentro de withTenantContext por reuso del pool; el SP/tabla no usan el tenant.
async function fetchDestinatariosVM(tenantId: string, idRegion: unknown, idCarrier: unknown): Promise<DestinatarioRow[]> {
  return withTenantContext(tenantId, tx => tx.$queryRaw<DestinatarioRow[]>`
    EXEC dbo.sp_VM_GetDestinatarios @IdRegion = ${idRegion}, @IdCarrier = ${idCarrier}
  `)
}

/**
 * Genera y envía el correo de la validación (alta/edición/OUT). No lanza:
 * cualquier fallo se loguea y no afecta la respuesta ya emitida. Sin
 * destinatarios ⇒ no genera PDF ni envía.
 *
 * Modo adjunto (default). Para modo enlace (si el líder lo aprueba): en vez de
 * renderValidacionPdf + { pdfBuffer }, pasar { pdfUrl } con la URL de la ruta B
 * (p.ej. `${process.env.APP_BASE_URL}/api/warehouses/material-validation/${folio}/pdf`),
 * resolviendo antes el acceso al link (ruta firmada o vista con login).
 */
export async function onValidacionGuardada(tenantId: string, folio: string): Promise<void> {
  if (!tenantId || !folio) return

  try {
    const record = await getVMDetail(tenantId, folio)

    if (!record) return

    const rows = await fetchDestinatariosVM(tenantId, record.IdRegion, record.IdCarrier)
    const dest = armarDestinatarios(rows)

    if (!dest) return

    const pdfBuffer = await renderValidacionPdf(record)

    await enviarCorreoValidacion(record, { pdfBuffer }, dest.to, dest.cc)
  } catch (e) {
    console.error(`[VM correo] Error en el envío para ${folio}:`, e)
  }
}
