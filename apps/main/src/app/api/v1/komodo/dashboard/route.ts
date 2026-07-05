import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') ?? ''

    if (type === 'graph_wo_status') {
      const dateStart = searchParams.get('dateStart')
      const dateEnd = searchParams.get('dateEnd')
      const region = searchParams.get('region')
      const state = searchParams.get('state')

      let where = 'WHERE 1=1'

      if (dateStart && dateEnd) where += ` AND wo_ti.FechaDespacho BETWEEN '${dateStart}' AND '${dateEnd}'`
      if (region) where += ` AND wo_ti.IdReg = ${region}`
      if (state) where += ` AND wo_ti.IdEstado = ${state}`

      const data = await queryRaw`
        SELECT COUNT(COALESCE(wo_ti.Status, 0)) AS total,
               IIF(wo_status.NombreEstatusWO IS NOT NULL, wo_status.NombreEstatusWO, 'No Asignado') AS description
        FROM WorkOrders_Tickets wo_ti
        LEFT JOIN Cat_EstadoWO wo_status ON wo_ti.Status = wo_status.IdEstatusWO
        ${where}
        GROUP BY wo_ti.Status, wo_status.NombreEstatusWO`

      return NextResponse.json({ result: data })
    }

    if (type === 'graph_site_type') {
      const data = await queryRaw`
        SELECT COUNT(*) AS total, Descripcion AS description
        FROM Cat_Sitios s
        INNER JOIN Cat_TipoSitio ts ON s.IdTipoSitio = ts.IdTipoSitio
        GROUP BY ts.Descripcion`

      return NextResponse.json({ result: data })
    }

    if (type === 'graph_workgroups_type') {
      const data = await queryRaw`
        SELECT COUNT(*) AS total, tc.Descripcion AS description
        FROM Cat_Cuadrillas c
        INNER JOIN Tipo_Cuadrilla tc ON c.IdTipoCuadrilla = tc.IdTipoCuadrilla
        GROUP BY tc.Descripcion`

      return NextResponse.json({ result: data })
    }

    if (type === 'estatus_cfe') {
      const data = await queryRaw`EXEC SP_getEstatus_CFE`

      return NextResponse.json({ result: data })
    }

    return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') ?? ''

    if (type === 'table_main_data') {
      const {
        Id_Usuario,
        Id_clasificacion,
        Id_Region,
        Id_Estado,
        Fecha_inicio,
        Fecha_fin,
        Id_Empresa,
        IdPerfil,
        IdLFM,
        Id_Plantilla
      } = body

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

      let plantillaFilter = ''

      if (Id_Plantilla) {
        const ids = Array.isArray(Id_Plantilla) ? Id_Plantilla.join(',') : Id_Plantilla

        plantillaFilter = `AND DetWOR.IdPlantilla IN (${ids})`
      }

      const data = await queryRaw`
        SELECT WOT.IdWO, WOT.Descripcion, CCW.Nombre AS ClasificacionWO,
               FORMAT(WOT.FechaDespacho, 'dd/MM/yyyy') AS FechaDespacho,
               FORMAT(WOT.FechaLimiteConfirmacion, 'dd/MM/yyyy') AS FechaLimiteConfirmacion,
               WOT.IdPrioridad, WOT.IdCriticidad, WOT.LimiteConfirmacion, WOT.LimiteRestauracion, WOT.LimiteResolucion,
               WOT.TotalTareas, WOT.TareasFinalizadas, WOT.TareasxFinalizar, WOT.Status, WOT.FechaAsignacion, WOT.IdCuadrilla,
               WOT.IdUsuario,
               COALESCE(NULLIF(NULLIF(USU.NombreUsuario, ''), ''), 'USUARIO NO ASIGNADO') AS Usuario,
               USU.IdEmpresa,
               WOT.IdReg, WOT.IdEstado, WOT.IdPlantilla,
               COALESCE(NULLIF(NULLIF(PLT.Descripcion, ''), ''), 'PLANTILLA NO ASIGNADA') AS NombrePlantilla,
               WOT.Avance, WOT.Alarma, WOT.IcoPlantilla, WOT.IcoTarea, WOT.IcoInfo, WOT.IcoHistorial, WOT.IcoComentarios,
               WOT.IcoDescarga, WOT.IcoConfirmada,
               WOT.IdUsuarioAprover,
               IIF(WOT.IdUsuarioAprover IS NOT NULL, (SELECT TOP 1 ua.NombreUsuario FROM Cat_Usuarios ua WHERE ua.IdUsuario = WOT.IdUsuarioAprover), '') AS UsuarioAproverNombre,
               WOT.FechaAprover,
               USU.IdPerfil, USU.IdFLM, USU.IdFLM AS FLM,
               WOT.ReporteAceptado, WOT.ReporteAceptado AS bagReporte,
               USU.tokenMovil,
               has_responses = IIF((SELECT COUNT(a.ID) FROM WorkOrders_Plantilla_Detalle_JSON a WHERE a.IdWO = WOT.IdWO) > 0, 1, 0)
        FROM WorkOrders_Tickets WOT
        LEFT JOIN Cat_Usuarios USU ON USU.IdUsuario = WOT.IdUsuario
        INNER JOIN Cat_ClasificacionWO CCW ON WOT.IdClasificacionWO = CCW.IdClasificacionWO
        LEFT JOIN Cat_Plantillas PLT ON PLT.IdPlantilla = WOT.IdPlantilla
        INNER JOIN WorkOrders_Plantilla_Detalle_JSON DetWOR ON DetWOR.IdWO = WOT.IdWO ${plantillaFilter}
        ${where_enterprise}
        ${where_user}
        ${where_lfm}
        AND USU.Estatus = 'A'
        AND WOT.Status <> 0
        ORDER BY WOT.IdWO`

      return serversideResponse(data)
    }

    return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}
