import { NextResponse } from 'next/server'

import { queryRaw } from '@/lib/prisma-helpers'
import { serversideResponse } from '@/lib/api-utils'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') ?? ''
    const IdPerfil = searchParams.get('IdPerfil')
    const IdSitio = searchParams.get('IdSitio')
    const IdUsuario = searchParams.get('IdUsuario')

    if (type === 'fullData') {
      const data = IdPerfil
        ? await queryRaw`SELECT * FROM Cat_Usuarios WHERE Estatus = 'A' AND IdPerfil = ${parseInt(IdPerfil, 10)} AND IdEmpresa IN (1, 3, 4)`
        : await queryRaw`SELECT * FROM Cat_Usuarios WHERE Estatus = 'A' AND IdEmpresa IN (1, 3, 4)`

      return serversideResponse(data)
    }

    if (type === 'admin') {
      const data = await queryRaw`SELECT * FROM Cat_Usuarios WHERE IdPerfil = 1 AND Estatus = 'A' AND IdFLM = 1`

      return serversideResponse(data)
    }

    if (type === 'disponibles') {
      const data = await queryRaw`
        SELECT * FROM Cat_Usuarios WHERE Estatus = 'A' AND IdFLM = 1
        UNION
        SELECT * FROM Cat_Usuarios WHERE IdUsuario = ${parseInt(IdSitio ?? '0', 10)}`

      return serversideResponse(data)
    }

    if (type === 'usuariosDisponiblesFullData') {
      const data = await queryRaw`
        SELECT u.IdUsuario, u.NombreUsuario, u.NumCelular, u.Email, u.IdCuadrilla, c.Nombre
        FROM Cat_Usuarios u
        INNER JOIN Cat_Cuadrillas c ON u.IdCuadrilla = c.IdCuadrilla
        WHERE u.Estatus = 'A' AND u.IdFLM = 1`

      return NextResponse.json({ result: data })
    }

    if (type === 'argós') {
      const data = await queryRaw`
        SELECT IdUsuario, NombreUsuario, CONVERT(VARCHAR, CAST(FechaRegistro AS DATE), 5) AS FechaRegistro,
               NumCelular, IdPuesto, Email, Usuario, Password, IdEmpresa, IdPerfil, IdCuadrilla, Estatus, Coords
        FROM Cat_Usuarios WHERE IdEmpresa IN (1,2,3) AND IdFLM = 1`

      return serversideResponse(data)
    }

    if (type === 'wot') {
      const data = await queryRaw`SELECT * FROM Cat_Usuarios WHERE IdEmpresa = 2 AND Estatus = 'A'`

      return serversideResponse(data)
    }

    if (type === 'byId') {
      if (!IdUsuario) throw new Error('IdUsuario required')
      const data = await queryRaw`SELECT * FROM Cat_Usuarios WHERE IdUsuario = ${parseInt(IdUsuario, 10)}`

      return NextResponse.json({ result: data })
    }

    if (type === 'all_sp') {
      const data = await queryRaw`EXEC [getAllUsuario]`

      return NextResponse.json({ result: (data as unknown as Array<{ result: unknown }>)?.[0]?.result ?? data })
    }

    if (type === 'byMail') {
      const email = searchParams.get('email')

      if (!email) throw new Error('email required')
      const data = await queryRaw`SELECT IdUsuario, Email FROM Cat_Usuarios WHERE Email = ${email} AND Estatus = 'A'`

      return NextResponse.json({ result: data })
    }

    if (type === 'byIdPerfil') {
      if (!IdPerfil) throw new Error('IdPerfil required')
      const data = await queryRaw`SELECT * FROM Cat_Usuarios WHERE IdEmpresa IN (1,3,4) AND Estatus = 'A' AND IdFLM = 1`

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
    const { type } = body

    if (type === 'createAdmin') {
      const { name, phone, email, user, password } = body

      await queryRaw`
        INSERT INTO Cat_Usuarios (NombreUsuario, FechaRegistro, NumCelular, Email, Usuario, Password, IdPerfil, Estatus)
        VALUES (${name}, GETDATE(), ${phone}, ${email}, ${user}, ${password}, 1, 'A')`

      return NextResponse.json({ data: true })
    }

    if (type === 'updateToken') {
      const { IdUsuario, tokenMovil } = body

      await queryRaw`UPDATE Cat_Usuarios SET tokenMovil = ${tokenMovil} WHERE IdUsuario = ${IdUsuario}`

      return NextResponse.json({ data: true })
    }

    if (type === 'addWot') {
      const { name, phone, email, user, password } = body

      await queryRaw`
        INSERT INTO Cat_Usuarios (NombreUsuario, NumCelular, Email, Usuario, Password, IdPerfil, FechaRegistro, Estatus, IdEmpresa)
        VALUES (${name}, ${phone}, ${email}, ${user}, ${password}, 6, GETDATE(), 'A', 2)`

      return NextResponse.json({ data: true })
    }

    if (type === 'updateAdmin') {
      const { IdUsuario, NombreUsuario, NumCelular, Email, Usuario, Password } = body

      await queryRaw`
        UPDATE Cat_Usuarios
        SET NombreUsuario = ${NombreUsuario}, NumCelular = ${NumCelular}, Email = ${Email}, Usuario = ${Usuario}, Password = ${Password}
        WHERE IdUsuario = ${IdUsuario}`

      return NextResponse.json({ data: true })
    }

    if (type === 'deactivate') {
      const { id } = body

      await queryRaw`UPDATE Cat_Usuarios SET Estatus = 'I' WHERE IdUsuario = ${id}`

      return NextResponse.json({ data: true })
    }

    if (type === 'updateCoordenadas') {
      const { IdUsuario, Latitud, Longitud } = body

      await queryRaw`UPDATE Cat_Usuarios SET Coords = ${`${Latitud},${Longitud}`} WHERE IdUsuario = ${IdUsuario}`

      return NextResponse.json({ data: true })
    }

    if (type === 'savetokenpass') {
      const { tknpass, idUser } = body

      await queryRaw`UPDATE Cat_Usuarios SET TokenResetPass = ${tknpass} WHERE IdUsuario = ${idUser}`

      return NextResponse.json({ data: true })
    }

    return NextResponse.json({ message: 'Invalid type' }, { status: 400 })
  } catch (e) {
    return NextResponse.json(e, { status: 500, statusText: 'Server Error' })
  }
}
