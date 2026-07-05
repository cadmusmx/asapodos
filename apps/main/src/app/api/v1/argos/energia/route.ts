import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const { Id_Usuario, Id_clasificacion, Id_Region, Id_Estado, Fecha_inicio, Fecha_fin, Id_Empresa, IdPerfil, IdLFM } =
      body

    const Empresa = Id_Empresa ?? 1
    const Perfil = IdPerfil ?? 1

    let where_enterprise = ''
    let where_user = ''
    let where_lfm = ''

    switch (String(Empresa)) {
      case '1':
        if (Perfil === 1) {
          where_enterprise = `WHERE USU.IdEmpresa IN(1,3,4)`
          where_user = Id_Usuario ? `AND WOT.IdUsuario = ${Id_Usuario}` : `AND 1=1`
          where_lfm = `AND USU.IdFLM = 1`
        }

        break
      case '3':
        where_enterprise = `WHERE USU.IdEmpresa IN(3)`

        if (Perfil === 1) {
          where_user = Id_Usuario ? `AND WOT.IdUsuario = ${Id_Usuario}` : `AND 1=1`
        } else if (Perfil === 3) {
          where_user = Id_Usuario ? `AND WOT.IdUsuario = ${Id_Usuario}` : `AND 1=1`
          where_lfm = IdLFM ? `AND USU.IdFLM = ${IdLFM}` : ''
        } else if (Perfil === 4) {
          where_user = `AND WOT.IdUsuario = ${Id_Usuario}`
        }

        break
      case '4':
        where_enterprise = `WHERE USU.IdEmpresa IN(3,4)`

        if (Perfil === 1) {
          where_user = Id_Usuario ? `AND WOT.IdUsuario = ${Id_Usuario}` : `AND 1=1`
        } else if (Perfil === 7) {
          where_user = `AND WOT.IdUsuario = ${Id_Usuario}`
        }

        break
    }

    const data = await queryRaw`
      SELECT WOT.IdWO, WOT.Descripcion, CCW.Nombre AS ClasificacionWO,
             FORMAT(WOT.FechaDespacho, 'dd/MM/yyyy') AS FechaDespacho,
             FORMAT(WOT.FechaLimiteConfirmacion, 'dd/MM/yyyy') AS FechaLimiteConfirmacion,
             WOT.IdPrioridad, WOT.IdCriticidad, WOT.LimiteConfirmacion, WOT.LimiteRestauracion, WOT.LimiteResolucion,
             WOT.TotalTareas, WOT.TareasFinalizadas, WOT.TareasxFinalizar, WOT.Status, WOT.FechaAsignacion, WOT.IdCuadrilla,
             WOT.IdUsuario,
             COALESCE(NULLIF(NULLIF(USU.NombreUsuario, ''), ''), 'USUARIO NO ASIGNADO') AS Usuario,
             USU.IdEmpresa, WOT.IdReg, WOT.IdEstado, WOT.IdPlantilla,
             COALESCE(NULLIF(NULLIF(PLT.Descripcion, ''), ''), 'PLANTILLA NO ASIGNADA') AS NombrePlantilla,
             WOT.Avance, WOT.Alarma, WOT.IcoPlantilla, WOT.IcoTarea, WOT.IcoInfo, WOT.IcoHistorial, WOT.IcoComentarios,
             WOT.IcoDescarga, WOT.IcoConfirmada,
             WOT.IdUsuarioAprover,
             IIF(WOT.IdUsuarioAprover IS NOT NULL, (SELECT TOP 1 ua.NombreUsuario FROM Cat_Usuarios ua WHERE ua.IdUsuario = WOT.IdUsuarioAprover), '') AS UsuarioAproverNombre,
             WOT.FechaAprover,
             USU.IdPerfil, USU.IdFLM, USU.IdFLM AS FLM, WOT.ReporteAceptado, WOT.ReporteAceptado AS bagReporte,
             USU.tokenMovil,
             has_responses = IIF((SELECT COUNT(a.ID) FROM WorkOrders_Plantilla_Detalle_JSON a WHERE a.IdWO = WOT.IdWO) > 0, 1, 0)
      FROM WorkOrders_Tickets WOT
      LEFT JOIN Cat_Usuarios USU ON USU.IdUsuario = WOT.IdUsuario
      INNER JOIN Cat_ClasificacionWO CCW ON WOT.IdClasificacionWO = CCW.IdClasificacionWO
      LEFT JOIN Cat_Plantillas PLT ON PLT.IdPlantilla = WOT.IdPlantilla
      INNER JOIN WorkOrders_Plantilla_Detalle_JSON DetWOR ON DetWOR.IdWO = WOT.IdWO AND DetWOR.IdPlantilla IN (11)
      ${where_enterprise}
      ${where_user}
      ${where_lfm}
      AND USU.Estatus = 'A'
      AND WOT.Status <> 0
      ORDER BY WOT.IdWO`

    return serversideResponse(data)
  } catch (e) {
    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}
