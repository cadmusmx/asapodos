# Plan: Connect Plans with Modules and Submodules (PlanFeatures Redesign)

## Summary

Replace the current string-key-based `Security.PlanFeatures` system with a proper relational model linking plans directly to `dbo.Cat_Modulos` and `dbo.Cat_SubModulos` via foreign keys. Enable submodule-level toggle granularity for super admins.

---

## 1. Database Migration

**File:** `scripts/sql/YYYYMMDD_migrate_planfeatures_to_modules.sql`

### Schema Changes

1. Add new FK columns to `Security.PlanFeatures`:

```sql
ALTER TABLE Security.PlanFeatures
  ADD IdModulo    int NULL,
      IdSubModulo int NULL;
```

2. Add FK constraints:

```sql
ALTER TABLE Security.PlanFeatures
  ADD CONSTRAINT FK_PlanFeatures_Cat_Modulos
    FOREIGN KEY (IdModulo) REFERENCES dbo.Cat_Modulos (IdModulo),
  ADD CONSTRAINT FK_PlanFeatures_Cat_SubModulos
    FOREIGN KEY (IdSubModulo) REFERENCES dbo.Cat_SubModulos (IdSubModulo);
```

3. Add a CHECK constraint: either `IdModulo` is set (for module-level toggles) or `IdSubModulo` is set (for submodule-level toggles), but not both null:

```sql
ALTER TABLE Security.PlanFeatures
  ADD CONSTRAINT CK_PlanFeatures_ModuleOrSubmodule
    CHECK (IdModulo IS NOT NULL OR IdSubModulo IS NOT NULL);
```

4. Drop old unique constraint and create new one:

```sql
ALTER TABLE Security.PlanFeatures
  DROP CONSTRAINT UQ_Security_PlanFeatures_PlanKey;

ALTER TABLE Security.PlanFeatures
  ADD CONSTRAINT UQ_Security_PlanFeatures_PlanSubModule
    UNIQUE (PlanId, IdSubModulo);
```

Where a plan has a module-level entry, no submodule rows are needed (the module toggle governs all submodules). If a specific submodule is toggled, it overrides the module default.

### Migration Logic

5. Map existing `FeatureKey` → `Cat_Modulos.Variable`:

```
FeatureKey           → Cat_Modulos.Variable (expected)
─────────────────────────────────────────────────
dashboard            → d_principal
warehouses           → almacen
human_capital        → capital_humano
projects             → proyectos
administration       → administracion
operating_expenses   → gastos_operacion
quotes               → cotizaciones
suppliers            → proveedores
vehicles             → flotillas
```

Run `UPDATE` joining on `Cat_Modulos.Variable`:

```sql
UPDATE pf
SET pf.IdModulo = m.IdModulo
FROM Security.PlanFeatures pf
INNER JOIN dbo.Cat_Modulos m ON pf.FeatureKey = m.Variable;
```

Rows that fail to map → logged and kept with NULL (super admin fixes manually later).

6. Drop old columns:

```sql
ALTER TABLE Security.PlanFeatures
  DROP COLUMN FeatureKey,
              FeatureValue,
              Description;
```

(The description can be inferred from Cat_Modulos.NombreModulo / Cat_SubModulos.NombreSubModulo.)

### Seed Update

Update the seed section of `20260707_create_security_plans.sql` (lines 240-278) to use `IdModulo` instead of `FeatureKey`. This becomes part of the new migration script that replaces that seed block.

---

## 2. Backend — Types (packages/shared)

**File:** `packages/shared/src/types/plan.ts`

### New Types

```ts
export type ModuleNode = {
  idModulo: number
  nombreModulo: string
  variable: string
  submodules: SubmoduleNode[]
}

export type SubmoduleNode = {
  idSubModulo: number
  idModulo: number
  nombreSubModulo: string
}

export type ModuleCatalog = ModuleNode[]
```

### Modified Types

Replace `PlanFeatureKey` and `PlanFeatureMap`:

```ts
// OLD (remove)
export type PlanFeatureKey = 'dashboard' | 'warehouses' | ...
export type PlanFeatureMap = Record<PlanFeatureKey, boolean>

// NEW
export type PlanFeature = {
  planFeatureId: number
  planId: number
  idModulo: number | null
  idSubModulo: number | null
}

export type PlanFeaturesById = {
  modules: Record<number, boolean>      // IdModulo → enabled
  submodules: Record<number, boolean>   // IdSubModulo → enabled
}
```

Update `PlanWithFeatures`:

```ts
export interface PlanWithFeatures extends PlanDefinition {
  features: PlanFeature[]
  featuresById: PlanFeaturesById  // computed helper for quick lookup
}
```

---

## 3. Backend — New API Endpoint

**File:** `apps/admin/src/app/api/admin/modules/catalog/route.ts`

```
GET /api/admin/modules/catalog
```

**Response:**

```json
{
  "modules": [
    {
      "idModulo": 1,
      "nombreModulo": "Almacenes",
      "variable": "almacen",
      "submodules": [
        { "idSubModulo": 1, "idModulo": 1, "nombreSubModulo": "Inventario" },
        { "idSubModulo": 2, "idModulo": 1, "nombreSubModulo": "Mapa de Almacenes" }
      ]
    }
  ]
}
```

**Service function** in `apps/admin/src/services/module-catalog-service.ts`:

```ts
export async function getModuleCatalog(): Promise<ModuleCatalog>
```

Fetches from `dbo.Cat_Modulos` JOIN `dbo.Cat_SubModulos`, grouped by module. Only active (`Status = 1`) records.

---

## 4. Backend — Plan Service Updates

**File:** `apps/admin/src/services/plan-service.ts`

### Modified Functions

- **`createPlan()`**: `features` param changes from `Record<string, boolean>` to `{ moduleIds: number[], submoduleIds: number[] }`. Inserts one row per module and/or submodule.

- **`getPlanFeatures(planId)`**: Returns `PlanFeature[]` with `IdModulo` and `IdSubModulo` columns. Also JOINS `Cat_Modulos`/`Cat_SubModulos` to include `NombreModulo`/`NombreSubModulo`.

- **`updatePlanFeature(planId, featureKey, value)`** → **`updatePlanFeatures(planId, features: { moduleIds: number[], submoduleIds: number[] })`**: Deletes existing features and re-inserts (simpler than per-row MERGE for this use case). Wrapped in a transaction.

### API Route Updates

- `POST /api/admin/plans` — validate new features shape
- `PUT /api/admin/plans/[planId]` — use `updatePlanFeatures` instead of per-key loop
- `GET /api/admin/plans` — return `PlanFeature[]` shaped data

---

## 5. Frontend — New Component: ModuleTreeSelector

**File:** `apps/admin/src/components/plans/ModuleTreeSelector.tsx`

Replaces `PlanFeaturesEditor.tsx`.

### Design

A hierarchical tree of checkboxes:

```
☑ Almacenes                   [expand/collapse]
  ☑ Inventario
  ☑ Mapa de Almacenes
  ☐ Catálogo de Almacenes
☑ Capital Humano
  ☑ Catálogo de Usuarios
  ☑ Catálogo de Vacaciones
☐ Proyectos
  ☐ Proyectos
  ☐ Proyectos Finalizados
```

### Behavior

- Toggling a **module** toggles all its submodules.
- Toggling a **submodule** independently: if all submodules are enabled, the parent module checkbox shows checked. If some are disabled, show indeterminate state.
- On submit, only emit `{ moduleIds, submoduleIds }`.

### Props

```ts
interface ModuleTreeSelectorProps {
  catalog: ModuleCatalog
  selectedModuleIds: number[]
  selectedSubmoduleIds: number[]
  onChange: (payload: { moduleIds: number[], submoduleIds: number[] }) => void
}
```

Fetch catalog on mount via `GET /api/admin/modules/catalog` (SWR or useEffect).

---

## 6. Frontend — Updated Components

### PlanCreateModal

- Fetch `ModuleCatalog` on mount.
- Replace `<PlanFeaturesEditor>` with `<ModuleTreeSelector>`.
- Default: no modules selected, or optionally pre-select "Dashboard" module.
- Submit payload: `{ ..., moduleIds: [...], submoduleIds: [...] }`.

### PlanEditModal

- Fetch `ModuleCatalog` on mount.
- Receive `plan.features` and map to `selectedModuleIds`/`selectedSubmoduleIds` for initial state.
- Submit updated module/submodule selection.

### PlanDetailPageClient

- Replace flat `MODULE_LABELS` list with hierarchical display using `ModuleCatalog` + `plan.features`.
- Show modules grouped with their submodules, each with enabled/disabled icon.

### PlanTable

- Replace `activeModules` list (line 123-126) with count badge: `"5 módulos activos"`.
- The `plan.features` prop shape changes; adapt accordingly.

### PlansPageClient

- `PlanWithFeatures` type changes (features is now `PlanFeature[]` + `featuresById`).
- Pass updated props to children.

---

## 7. Frontend — Main App Updates

### erp-access.ts

**File:** `apps/main/src/lib/erp-access.ts`

- `isModuleEnabledByPlan()`: Instead of checking `planFeatures?.[moduleKey]`, query `planFeaturesById.modules[idModulo]` (module-level check) or `planFeaturesById.submodules[idSubModulo]` (submodule-level check).

### erp-modules.ts

**File:** `apps/main/src/lib/erp-modules.ts`

- The `ErpModuleKey` type stays for the navigation system (it maps MenuGroup → module identity), but its role in plan checking is replaced by ID-based lookups.
- Add an `ERP_MODULE_MAP: Record<ErpModuleKey, { idModulo: number, variable: string }>` for bridging.

### /api/me route

**File:** `apps/main/src/app/api/me/route.ts`

- The plan features resolution (around lines 105-114) needs updating: fetch `PlanFeatures` with `IdModulo`/`IdSubModulo` columns and build a `featuresById` map for the client.

### plan-registry.ts

**File:** `packages/shared/src/lib/plans/plan-registry.ts`

- Remove hardcoded `PLAN_FEATURES` map (or keep as fallback but keyed by `IdModulo`).
- `isModuleIncludedInPlan()` signature changes to accept `idModulo: number`.

---

## 8. Implementation Order

| Step | Task | Dependencies |
|------|------|-------------|
| 1 | SQL migration script (add columns, migrate data, drop old, new constraints, update seed) | None |
| 2 | New types in `packages/shared/src/types/plan.ts` | None |
| 3 | New API endpoint + service: module catalog | Step 1 |
| 4 | Update `plan-service.ts` | Step 2, 3 |
| 5 | Update plan API routes | Step 4 |
| 6 | New `ModuleTreeSelector` component | Step 3 |
| 7 | Update `PlanCreateModal` | Step 6 |
| 8 | Update `PlanEditModal` | Step 6, 5 |
| 9 | Update `PlanDetailPageClient` | Step 5 |
| 10 | Update `PlanTable` | Step 2 |
| 11 | Update `plans/page.tsx` (server component data shape) | Step 5 |
| 12 | Update `erp-access.ts` in main app | Step 2 |
| 13 | Update `erp-modules.ts` to bridge ErpModuleKey ↔ IdModulo | Step 2 |
| 14 | Update `/api/me` in main app for new plan feature shape | Step 12 |
| 15 | Update `plan-registry.ts` (shared) | Step 2 |
| 16 | Remove `MODULE_OPTIONS` and `MODULE_LABELS` hardcoded maps from components | After all UI updates |

---

## 9. Risk / Rollback Notes

- The `FeatureKey → Cat_Modulos.Variable` mapping is **assumed**. If the actual database has different `Variable` values, the migration UPDATE will silently fail for those rows. A validation step after migration logs any unmapped rows.
- Existing `TenantSubscriptions` and plan enforcement logic in main app rely on the `PlanFeatureMap` shape — steps 12-15 ensure continuity.
- Rollback: the SQL migration includes `DROP COLUMN FeatureKey, FeatureValue, Description` which is irreversible without backup. A backup query before the migration is recommended.
