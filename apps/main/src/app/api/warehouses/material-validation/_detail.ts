// Detalle VM reusable: mismo SELECT del route [folio] (post-S1, con el resolver
// OutDerived vía COALESCE(voOut.IdIN, VM.Id)). Fuente única para el route de
// detalle, la generación de PDF, y a futuro donde se requiera el registro resuelto.

import type { VMDetailForPdf } from '@gaso/shared/lib/pdf/types'

import { withTenantContext } from '@/lib/tenant-context'

// Ajusta el path según dónde quedó el módulo pdf (no está en el barrel).\

export type VMDetailRecord = VMDetailForPdf & {
  FolioOrigen?: string | null
  FolioSalida?: string | null
  Vinculado?: number | null
}

// El registro trae VM.* + joins; se tipa como VMDetailForPdf (subconjunto que
// consume el PDF). El route de detalle puede ampliar el tipo con FolioOrigen /
// FolioSalida / Vinculado si lo adopta.
export async function getVMDetail(tenantId: string, folio: string): Promise<VMDetailRecord | null> {
  const rows = await withTenantContext(tenantId, tx => tx.$queryRaw<VMDetailRecord[]>`
    SELECT VM.*, LTRIM(RTRIM(UE.FirstName + ' ' + UE.LastName)) AS Responsable, pro.Proyecto, tm.Tipo AS TipoMaterial,
           al.Nombre AS AlmacenDestino, LTRIM(RTRIM(UEW.FirstName + ' ' + UEW.LastName)) AS UsuarioEditor, ca.Carrier,
           ( SELECT pm.Id AS id, pm.Clave AS cl, cm.Motivo AS clt, pm.Piezas AS pzs
               FROM dbo.GASOAL_VMPiezasMotivo pm
               LEFT JOIN dbo.Cat_VMMotivo cm ON pm.Clave = cm.Id
               WHERE pm.IdVM = COALESCE(voOut.IdIN, VM.Id)
               FOR JSON PATH ) AS PiezasMotivo,
           ( SELECT pe.Id AS id, pe.Clave AS cl, ce.Estado AS clt, pe.Piezas AS pzs
               FROM dbo.GASOAL_VMPiezasEstadoF pe
               LEFT JOIN dbo.Cat_VMEFisico ce ON pe.Clave = ce.Clave
               WHERE pe.IdVM = COALESCE(voOut.IdIN, VM.Id)
               FOR JSON PATH ) AS PiezasEstadoF,
           ( SELECT TOP 1 VFV.Id
               FROM dbo.GASOAL_VinculosFolioValidacion VFV
               WHERE VM.Folio = VFV.FolioEntrada
                  OR VM.Folio = VFV.FolioSalida
                  OR VM.Folio = VFV.FolioValidacion ) AS Vinculado,
           voOut.FolioIN AS FolioOrigen,
           voIn.FolioOut AS FolioSalida
      FROM dbo.GASOAL_VMES VM
      LEFT JOIN dbo.GASOAL_VMOut voOut ON voOut.TenantID = VM.TenantID AND voOut.IdOut  = VM.Id
      LEFT JOIN dbo.GASOAL_VMOut voIn  ON voIn.TenantID  = VM.TenantID AND voIn.FolioIN = VM.Folio
      INNER JOIN dbo.GASOAL_VMAlmacenes al ON VM.IdAlmacenDestino = al.Id
      INNER JOIN dbo.Cat_VMProyecto pro ON VM.IdProyecto = pro.Id
      INNER JOIN dbo.Cat_VMTiposMaterial tm ON VM.IdTipoMaterial = tm.Id
      INNER JOIN dbo.Cat_Carriers ca ON VM.IdCarrier = ca.Id
      INNER JOIN dbo.GASOCO_Cat_Usuarios U ON VM.IdUsuario = U.IdUsuario
      INNER JOIN HumanCapital.Employees UE ON UE.TenantID = U.TenantID AND UE.EmployeeID = U.EmployeeID
      LEFT JOIN HumanCapital.Employees UEW ON UEW.EmployeeID = VM.IdUsuarioEditorWeb
      WHERE VM.TenantID = ${tenantId} AND VM.Folio = ${folio}
  `)

  return rows[0] ?? null
}
