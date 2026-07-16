import { prisma } from '@gaso/shared'
import type { ModuleCatalog } from '@gaso/shared/types/plan'

interface ModuloRow {
  IdModulo: number
  NombreModulo: string | null
  Variable: string | null
  Status: number | null
}

interface SubModuloRow {
  IdSubModulo: number
  IdModulo: number | null
  NombreSubModulo: string | null
  Status: number | null
}

export async function getModuleCatalog(): Promise<ModuleCatalog> {
  const modules = await prisma.$queryRawUnsafe<ModuloRow[]>(
    `SELECT IdModulo, NombreModulo, Variable, Status
     FROM dbo.Cat_Modulos
     WHERE Status = 1
     ORDER BY IdModulo`
  )

  const submodules = await prisma.$queryRawUnsafe<SubModuloRow[]>(
    `SELECT IdSubModulo, IdModulo, NombreSubModulo, Status
     FROM dbo.Cat_SubModulos
     WHERE Status = 1
     ORDER BY IdModulo, IdSubModulo`
  )

  const submoduleMap = new Map<number, SubModuloRow[]>()

  for (const sm of submodules) {
    if (sm.IdModulo == null) continue
    if (!submoduleMap.has(sm.IdModulo)) {
      submoduleMap.set(sm.IdModulo, [])
    }
    submoduleMap.get(sm.IdModulo)!.push(sm)
  }

  const catalog: ModuleCatalog = modules
    .filter(m => m.Status === 1)
    .map(m => ({
      idModulo: m.IdModulo,
      nombreModulo: m.NombreModulo ?? `Modulo ${m.IdModulo}`,
      variable: m.Variable ?? '',
      submodules: (submoduleMap.get(m.IdModulo) ?? []).map(sm => ({
        idSubModulo: sm.IdSubModulo,
        idModulo: sm.IdModulo as number,
        nombreSubModulo: sm.NombreSubModulo ?? `Submodulo ${sm.IdSubModulo}`,
      })),
    }))

  return catalog
}
