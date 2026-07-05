import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
      try {
            const { searchParams } = new URL(req.url)
            const type = searchParams.get('type') ?? ''

            if (type === 'loginWeb') {
                  const user = searchParams.get('Usuario')
                  const PaSWo = searchParams.get('Password')

                  if (!user || !PaSWo) throw new Error('Usuario and Password required')

                  const data = await queryRaw`
        SELECT IdUsuario, NombreUsuario, FechaRegistro, NumCelular, IdPuesto, Email, Usuario, Password, IdEmpresa, namedb,
               IdPerfil, IdCuadrilla, Estatus, Coords, tokenMovil, channelF, UsuarioPadre, TokenResetPass,
               IIF(IdPuesto = 4, (SELECT TOP 1 CAST(STRING_AGG(CAST(IdRegion AS NVARCHAR(MAX)), ',') AS NVARCHAR(MAX)) FROM Rel_Reg_Gerente WHERE IdGerente = IdUsuario), CAST(IdRegion AS NVARCHAR(MAX))) AS IdRegion
        FROM Cat_Usuarios WHERE Usuario = ${user} AND Password = ${PaSWo} AND IdEmpresa = 2 AND Estatus = 'A'`

                  return NextResponse.json({ result: data })
            }

            if (type === 'region') {
                  const region = searchParams.get('region')
                  const filter = region && region !== '0' ? ` AND IdReg IN (${region})` : ''
                  const data = await queryRaw`SELECT IdReg, NombreReg FROM Cat_Regiones WHERE STATUS = 1 ${filter}`

                  return NextResponse.json({ result: data })
            }

            if (type === 'estado') {
                  const Region = searchParams.get('Region')
                  const filter = Region ? ` AND IdRegion = ${Region}` : ''

                  const data =
                        await queryRaw`SELECT IdEstado, RTRIM(LTRIM(Nombre)) AS Nombre, Coords FROM Cat_Estados WHERE STATUS = 1 ${filter}`

                  return NextResponse.json({ result: data })
            }

            if (type === 'getWotUsers') {
                  const data = await queryRaw`SELECT * FROM Cat_Usuarios WHERE IdEmpresa = 2 AND Estatus = 'A'`

                  return serversideResponse(data)
            }

            if (type === 'getAutos') {
                  const Region = searchParams.get('Region')
                  const filter = Region ? `AND USU.IdRegion = ${Region}` : ''

                  const data = await queryRaw`
        SELECT a.IdAuto, a.Serial, a.Modelo, a.Placas, a.Kilometraje, a.Motor, a.Color, a.IdUsuario,
               u.NombreUsuario, u.NumCelular, u.Email, u.IdEmpresa, u.IdCuadrilla, va.Descripcion
        FROM Cat_Autos a
        LEFT JOIN Cat_Usuarios u ON a.IdUsuario = u.IdUsuario
        LEFT JOIN Cat_VersionAuto va ON a.IdMarca = va.IdMarca
        WHERE u.Estatus = 'A' ${filter}`

                  return serversideResponse(data)
            }

            if (type === 'getPuestos') {
                  const data = await queryRaw`EXEC SP_getPuestos`

                  return NextResponse.json({ result: data })
            }

            if (type === 'getListaAsistencia') {
                  const person = searchParams.get('person')
                  const fechaIn = searchParams.get('fechaIn')
                  const fechaFin = searchParams.get('fechaFin')
                  const dateFilter = fechaIn ? ` AND fechaCheckIn BETWEEN '${fechaIn}' AND '${fechaFin}'` : ''

                  const data = await queryRaw`
        SELECT IdUsuario, est.Nombre AS Estado, ciu.Ciudad, act.Actividad, Latitud, Longitud,
               CONVERT(VARCHAR, CAST(fechaCheckIn AS DATE), 5) AS Fecha,
               CONVERT(VARCHAR(5), DATEPART(HOUR, fechaCheckIn)) + ':' + RIGHT('0' + CONVERT(VARCHAR(2), DATEPART(MINUTE, fechaCheckIn)), 2) AS HoraEntrada,
               CONVERT(VARCHAR(5), DATEPART(HOUR, fechaCheckOut)) + ':' + RIGHT('0' + CONVERT(VARCHAR(2), DATEPART(MINUTE, fechaCheckOut)), 2) AS HoraSalida
        FROM Cat_CheckInOut che
        INNER JOIN Cat_Estados est ON est.IdEstado = che.Estado
        INNER JOIN Cat_Ciudades ciu ON ciu.IdCiudad = che.Ciudad
        INNER JOIN Cat_ActividadesAuto act ON act.ID = che.Actividad
        WHERE IdUsuario = ${person ? parseInt(person, 10) : 0}${dateFilter}
        ORDER BY Fecha DESC`

                  return serversideResponse(data)
            }

            if (type === 'getSolicitudesViaticos') {
                  const data = await queryRaw`
        SELECT AUSO.ID, AUSO.IdUsuario, USU.NombreUsuario, TSO.nombreSolicitud,
               CONVERT(VARCHAR, CAST(FechaAltaSolicitud AS DATE), 5) AS FechaAltaSolicitud,
               CONVERT(VARCHAR, CAST(AUSO.FechaDesde AS DATE), 5) AS FechaDesde,
               CONVERT(VARCHAR, CAST(AUSO.FechaHasta AS DATE), 5) AS FechaHasta,
               SolicitaHospedaje, SolicitaGastos, comentarioSolicitud, EstatusSolicitud,
               DATEDIFF(day, AUSO.FechaDesde, AUSO.FechaHasta) AS noches,
               DATEDIFF(day, AUSO.FechaDesde, AUSO.FechaHasta) + 1 AS dias
        FROM Autos_Solicitud_Viaticos AUSO
        INNER JOIN Cat_Usuarios USU ON USU.IdUsuario = AUSO.IdUsuario
        INNER JOIN Autos_Catalogo_TipoSolicitudes TSO ON TSO.ID = AUSO.TipoSolicitud
        WHERE USU.IdEmpresa = 2 AND USU.Estatus = 'A'
        ORDER BY AUSO.FechaAltaSolicitud ASC`

                  return serversideResponse(data)
            }

            if (type === 'tipo_solicitudes_autos') {
                  const data = await queryRaw`SELECT * FROM Autos_Catalogo_TipoSolicitudes`

                  return NextResponse.json({ result: data })
            }

            if (type === 'getSolDasboard') {
                  const IdCoordinador = searchParams.get('IdCoordinador')
                  const filter = IdCoordinador ? `AND AUSO.IdCoordinador = ${IdCoordinador}` : ''

                  const data = await queryRaw`
        SELECT AUSO.ID, AUSO.IdUsuario, USU.NombreUsuario, TSO.nombreSolicitud, AUSO.FechaAltaSolicitud,
               AUSO.SolicitaHospedaje, AUSO.SolicitaGastos, AUSO.comentarioSolicitud, AUSO.EstatusSolicitud
        FROM Autos_Solicitud_Viaticos AUSO
        INNER JOIN Cat_Usuarios USU ON USU.IdUsuario = AUSO.IdUsuario
        INNER JOIN Autos_Catalogo_TipoSolicitudes TSO ON TSO.ID = AUSO.TipoSolicitud
        WHERE USU.IdEmpresa = 2 ${filter}
        ORDER BY AUSO.FechaAltaSolicitud DESC`

                  return serversideResponse(data)
            }

            if (type === 'getActiDash') {
                  const data = await queryRaw`
        SELECT act.Actividad, COUNT(*) AS count
        FROM Cat_CheckInOut che
        INNER JOIN Cat_ActividadesAuto act ON act.ID = che.Actividad
        GROUP BY act.Actividad`

                  return serversideResponse(data)
            }

            if (type === 'repActivities') {
                  const fechaIn = searchParams.get('fechaIn')
                  const fechaFin = searchParams.get('fechaFin')
                  const filter = fechaIn ? `WHERE fechaCheckIn BETWEEN '${fechaIn}' AND '${fechaFin}'` : ''

                  const data = await queryRaw`
        SELECT IdUsuario, est.Nombre AS Estado, ciu.Ciudad, act.Actividad, Latitud, Longitud,
               CONVERT(VARCHAR, CAST(fechaCheckIn AS DATE), 5) AS Fecha,
               CONVERT(VARCHAR(5), DATEPART(HOUR, fechaCheckIn)) + ':' + RIGHT('0' + CONVERT(VARCHAR(2), DATEPART(MINUTE, fechaCheckIn)), 2) AS HoraEntrada,
               CONVERT(VARCHAR(5), DATEPART(HOUR, fechaCheckOut)) + ':' + RIGHT('0' + CONVERT(VARCHAR(2), DATEPART(MINUTE, fechaCheckOut)), 2) AS HoraSalida
        FROM Cat_CheckInOut che
        INNER JOIN Cat_Estados est ON est.IdEstado = che.Estado
        INNER JOIN Cat_Ciudades ciu ON ciu.IdCiudad = che.Ciudad
        INNER JOIN Cat_ActividadesAuto act ON act.ID = che.Actividad
        ${filter}
        ORDER BY Fecha DESC`

                  return serversideResponse(data)
            }

            if (type === 'getTareas') {
                  const data = await queryRaw`EXEC [getAllTareas]`

                  return NextResponse.json({ result: (data as unknown as Array<{ result: unknown }>)?.[0]?.result ?? data })
            }

            if (type === 'reporteAsi') {
                  const fechaIn = searchParams.get('fechaIn')
                  const fechaFin = searchParams.get('fechaFin')
                  const dateFilter = fechaIn ? ` AND fechaCheckIn BETWEEN '${fechaIn}' AND '${fechaFin}'` : ''

                  const data = await queryRaw`
        SELECT IdUsuario, est.Nombre AS Estado, ciu.Ciudad, act.Actividad, Latitud, Longitud,
               CONVERT(VARCHAR, CAST(fechaCheckIn AS DATE), 5) AS Fecha,
               CONVERT(VARCHAR(5), DATEPART(HOUR, fechaCheckIn)) + ':' + RIGHT('0' + CONVERT(VARCHAR(2), DATEPART(MINUTE, fechaCheckIn)), 2) AS HoraEntrada,
               CONVERT(VARCHAR(5), DATEPART(HOUR, fechaCheckOut)) + ':' + RIGHT('0' + CONVERT(VARCHAR(2), DATEPART(MINUTE, fechaCheckOut)), 2) AS HoraSalida
        FROM Cat_CheckInOut che
        INNER JOIN Cat_Estados est ON est.IdEstado = che.Estado
        INNER JOIN Cat_Ciudades ciu ON ciu.IdCiudad = che.Ciudad
        INNER JOIN Cat_ActividadesAuto act ON act.ID = che.Actividad
        WHERE IdUsuario IS NOT NULL ${dateFilter}
        ORDER BY Fecha DESC`

                  return serversideResponse(data)
            }

            if (type === 'realizarCheckInAutos') {
                  const IdUsuario = searchParams.get('IdUsuario')

                  if (!IdUsuario) throw new Error('IdUsuario required')
                  const data = await queryRaw`EXEC SP_realizarCheckInAutos @idUsuario=${parseInt(IdUsuario, 10)}`

                  return NextResponse.json({ result: data })
            }

            if (type === 'usuariosFullData') {
                  const data = await queryRaw`SELECT * FROM Cat_Usuarios WHERE IdEmpresa = 2 AND Estatus = 'A'`

                  return serversideResponse(data)
            }

            if (type === 'getAllFiles_WOT') {
                  const data = await queryRaw`EXEC [getAllFiles_WOT]`

                  return NextResponse.json({ result: (data as unknown as Array<{ result: unknown }>)?.[0]?.result ?? data })
            }

            return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}

export async function POST(req: Request) {
      try {
            const body = await req.json()
            const { type } = body

            if (type === 'insertCars') {
                  const { Serial, Modelo, Placas, Kilometraje, Motor, Color, IdUsuario, IdMarca } = body

                  await queryRaw`
        INSERT INTO Cat_Autos (Serial, Modelo, Placas, Kilometraje, Motor, Color, IdUsuario, IdMarca, Estatus)
        VALUES (${Serial}, ${Modelo}, ${Placas}, ${Kilometraje}, ${Motor}, ${Color}, ${IdUsuario}, ${IdMarca}, 1)`

                  return NextResponse.json({ data: true })
            }

            if (type === 'deactivateUsuarioAdmin') {
                  const { id } = body

                  await queryRaw`UPDATE Cat_Usuarios SET Estatus = 'I' WHERE IdUsuario = ${id}`

                  return NextResponse.json({ data: true })
            }

            if (type === 'autorizaSolicitud') {
                  const { id, idUsuarioGerente, estatus } = body

                  await queryRaw`
        UPDATE Autos_Solicitud_Viaticos
        SET EstatusSolicitud = ${estatus}, FechaRespuestaSolicitud = GETDATE(), IdUsuarioGerente = ${idUsuarioGerente}
        WHERE ID = ${id}`

                  return NextResponse.json({ data: true })
            }

            if (type === 'sendEmail') {
                  console.log('Email sent')

                  return NextResponse.json({ message: 'Correo electronico enviado con exito' })
            }

            if (type === 'getUsuariosAutos') {
                  const { idGerente, idRegion } = body
                  let filter = "WHERE Estatus = 'A'"

                  if (idGerente) filter += ` AND IdGerente = ${idGerente}`
                  if (idRegion) filter += ` AND IdRegion = ${idRegion}`
                  const data = await queryRaw`SELECT * FROM Cat_Usuarios ${filter}`

                  return serversideResponse(data)
            }

            if (type === 'getPlantillaAuto_WEB') {
                  const { Id_Usuario, Id_Plantilla } = body
                  const data = await queryRaw`EXEC [getPlantillaAuto_web] @Id_Usuario=${Id_Usuario}, @id_plantilla=${Id_Plantilla}`

                  return NextResponse.json({ result: data })
            }

            if (type === 'insertUpdateDataPlantillaWO_WEB') {
                  const { Id_WO, Id_Plantilla, Json_Detalle } = body

                  const data =
                        await queryRaw`EXEC [insertUpdate_Plantilla_wo] @Id_WO=${Id_WO}, @Id_Plantilla=${Id_Plantilla}, @Json_Detalle=${Json_Detalle}`

                  const resultado = (data as unknown as Array<{ Resultado: string }>)?.[0]?.Resultado ?? ''

                  return NextResponse.json({ result: resultado })
            }

            if (type === 'updatePlantillaWO') {
                  const { Id_WO, Id_Plantilla, Id_UsuarioOld, Id_UsuarioNew } = body

                  const data =
                        await queryRaw`EXEC [updatePlantilla_wo] @id_wo=${Id_WO}, @id_plantilla=${Id_Plantilla}, @Id_UsuarioOld=${Id_UsuarioOld}, @Id_UsuarioNew=${Id_UsuarioNew}`

                  const resultado = (data as unknown as Array<{ Resultado: string }>)?.[0]?.Resultado ?? ''

                  return NextResponse.json({ result: resultado })
            }

            if (type === 'getHallazgos') {
                  const data = await queryRaw`SELECT * FROM Cat_Hallazgos`

                  return serversideResponse(data)
            }

            if (type === 'sendEmailTest') {
                  const { id } = body

                  await queryRaw`UPDATE Cat_Hallazgos SET Estatus = 1 WHERE ID = ${id}`

                  return NextResponse.json({ message: 'Correo electronico enviado con exito' })
            }

            if (type === 'usuariosAdmin') {
                  const data = await queryRaw`SELECT * FROM Cat_Usuarios WHERE IdPerfil = 1 AND Estatus = 'A' AND IdEmpresa = 2`

                  return serversideResponse(data)
            }

            if (type === 'insertUsuariosAdmin') {
                  const { name, phone, email, user, password } = body

                  await queryRaw`
        INSERT INTO Cat_Usuarios (NombreUsuario, NumCelular, Email, Usuario, Password, IdPerfil, FechaRegistro, Estatus, IdEmpresa)
        VALUES (${name}, ${phone}, ${email}, ${user}, ${password}, 6, GETDATE(), 'A', 2)`

                  return NextResponse.json({ data: true })
            }

            if (type === 'updateUsuarioAdmin') {
                  const { IdUsuario, NombreUsuario, NumCelular, Email, Usuario, Password } = body

                  await queryRaw`
        UPDATE Cat_Usuarios
        SET NombreUsuario = ${NombreUsuario}, NumCelular = ${NumCelular}, Email = ${Email}, Usuario = ${Usuario}, Password = ${Password}
        WHERE IdUsuario = ${IdUsuario}`

                  return NextResponse.json({ data: true })
            }

            if (type === 'updateCar') {
                  const { IdAuto, IdUsuario } = body

                  await queryRaw`UPDATE Cat_Autos SET IdUsuario = ${IdUsuario} WHERE IdAuto = ${IdAuto}`

                  return NextResponse.json({ data: true })
            }

            if (type === 'autosPlantillaDetallePrint') {
                  const { id } = body
                  const data = await queryRaw`SELECT * FROM Autos_Plantilla_Detalle_JSON WHERE IdUsuario = ${id}`

                  return serversideResponse(data)
            }

            if (type === 'user_car_relation') {
                  const { IdAuto } = body

                  await queryRaw`UPDATE Cat_Autos SET IdUsuario = NULL WHERE IdAuto = ${IdAuto}`

                  return NextResponse.json({ data: true })
            }

            if (type === 'updateIngeniero') {
                  const { IdWO, IdUsuario } = body

                  await queryRaw`EXEC SP_updateIngeniero_WOT @IdWO=${IdWO}, @IdUsuario=${IdUsuario}`

                  return NextResponse.json({ data: true })
            }

            if (type === 'desvinculaUser') {
                  const { IdAuto, IdUsuario } = body

                  await queryRaw`DELETE FROM Rel_User_Car WHERE IdAuto = ${IdAuto} AND IdUsuario = ${IdUsuario}`

                  return NextResponse.json({ data: true })
            }

            return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
      } catch (e) {
            return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
      }
}
