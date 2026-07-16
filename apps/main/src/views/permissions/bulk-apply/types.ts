// Contrato de la aplicación masiva de permisos (modal "Aplicar permisos en bloque").
// Aplicación PUNTUAL: el body carga alcance + grants inline, SIN presetId.
// La persistencia de plantillas re-aplicables es fase posterior (§13 del contrato).

import type { AssignableView } from '../types';

// ---------------------------------------------------------------------------
// Lectura: vistas asignables (nivel TENANT — del plan del tenant)
// GET /api/permissions/assignable-views
//
// Migración: antes eran las vistas + techo de un DEPARTAMENTO (`department/[id]/views`);
// ahora son las del PLAN, iguales para todo el tenant.
// El departamento ya NO decide qué vistas existen, solo a quién se aplica.
// `ceilingMask` viene fijo en 15 (deprecado: sin techo, todo es full-CRUD asignable).
// ---------------------------------------------------------------------------

/**
 * Vista asignable (nivel tenant): mismo shape que `AssignableView` pero SIN `currentMask`.
 * En un preset no hay permiso base heredado; la máscara de trabajo arranca en 0 (regla de emisión, Paso 3).
 *
 * NOTA: el nombre `DepartmentView` es legado de la etapa "por depto";
 * ya es tenant-level. `ceilingMask` es constante 15 — no tratarlo como límite variable.
 */
export type DepartmentView = Omit<AssignableView, 'currentMask'>;

export interface AssignableViewsResponse {
  views: DepartmentView[];
}

// ---------------------------------------------------------------------------
// Lectura: facetas de alcance (puesto/perfil) por departamento
// GET /api/permissions/department/[id]/facets
// Dependientes del depto: cada opción = puesto/perfil de ≥1 usuario ACTIVO del depto.
// NULL no aparece (no es targeteable); ausencia de selección = comodín "cualquiera".
// ---------------------------------------------------------------------------

export interface PuestoFacet {
  idPuesto: number;
  nombre: string;
}

export interface PerfilFacet {
  idPerfil: number;
  nombre: string;
}

export interface DepartmentFacetsResponse {
  idDepartamento: number;
  puestos: PuestoFacet[];
  perfiles: PerfilFacet[];
}

// ---------------------------------------------------------------------------
// Escritura: POST /api/permissions/presets/apply  (contrato congelado, no tocar)
// ---------------------------------------------------------------------------

export type ApplyMode = 'OR' | 'SET';

/** Un grant = una vista con su máscara canónica NO-CERO (R=1,W=2,U=4,D=8; W/U/D⇒R). */
export interface PresetGrant {
  viewCode: string;
  permMask: number;
}

export interface PresetApplyRequest {
  idDepartamento: number;
  idPuesto: number | null;
  idPerfil: number | null;
  grants: PresetGrant[];
  mode: ApplyMode;
  dryRun: boolean;
}

/**
 * Snapshot de invalidación del preview: TODO el body salvo `dryRun`.
 * El commit (`dryRun:false`) solo se habilita si este snapshot casa con el del body ya previsualizado (`dryRun:true`).
 * Cualquier edición de alcance/grants/modo lo invalida y obliga a re-previsualizar. (Paso 4.)
 */
export type PresetApplySnapshot = Omit<PresetApplyRequest, 'dryRun'>;

// ---------------------------------------------------------------------------
// Respuesta del apply  (RECONCILIADO contra el output real del endpoint)
//
// La respuesta ENVUELVE el eco del request (`scope`, `target`, `mode`, `dryRun`,
// `grants` enriquecidos) + `preview` + `applied?` (solo dryRun:false).
//
// OJO — las máscaras dentro de `preview` vienen como STRINGS ya formateados (`describeMask`: "R|W", "-", "R|W|U|D"),
// no como números. La UI las pinta directo; no re-calcula sobre ellas.
// ---------------------------------------------------------------------------

/** Eco del alcance resuelto del actor. */
export interface ApplyScope {
  actorDept: number;
  hasFullScope: boolean;
}

/** Eco del alcance objetivo (trío) — en la RESPUESTA va anidado bajo `target`. */
export interface ApplyTarget {
  idDepartamento: number;
  idPuesto: number | null;
  idPerfil: number | null;
}

/**
 * Grant tal como lo DEVUELVE el server: el request `{viewCode, permMask}` + la metadata computada (máscara legible).
 * `ceiling`/`ceilingMask`/`exceedsCeiling` quedaron deprecados tras la migración a plan (sin techo por vista).
 */
export interface EnrichedGrant {
  viewCode: string;
  permMask: number;
  mask: string;         // describeMask(permMask), p.ej. "R|W"
  /** @deprecated Constante 15 tras migración a plan; sin techo por vista. */
  ceiling: number;

  /** @deprecated Constante "R|W|U|D" tras migración a plan. */
  ceilingMask: string;

  /** @deprecated Constante false tras migración a plan. */
  exceedsCeiling: boolean;
}

export interface PreviewTotals {
  usersInScope: number;     // radio de impacto: SIEMPRE al frente en la UI
  usersWithWrites: number;
  writes: number;
  removals: number;
}

/** Agregado por vista. `writes`/`removals`/`unchanged` cuentan USUARIOS. */
export interface PreviewPerViewRow {
  viewCode: string;
  granted: number;          // permMask del grant (numérico)
  grantedMask: string;      // "R|W"
  /** @deprecated Constante "R|W|U|D" tras migración a plan. */
  ceilingMask: string;

  /** @deprecated Constante false tras migración a plan. */
  exceedsCeiling: boolean;
  writes: number;
  removals: number;
  unchanged: number;        // usuarios ya en el objetivo (no aparecen en perUser)
}

/** Cambio por vista de UN usuario. Máscaras como strings ya formateados. */
export interface PreviewUserChange {
  viewCode: string;
  current: string;              // "-" o "R|W|U|D" ...
  nuevo: string;                // máscara resultante
  removedMask: string | null;   // "U|D" en SET; null si no remueve nada
}

/** perUser lista SOLO usuarios con cambio neto; los `unchanged` no aparecen aquí. */
export interface PreviewPerUserRow {
  idUsuario: number; // se muestra SIEMPRE en la UI: hay homónimos (484 y 584 = mismo nombre)
  nombre: string;
  changes: PreviewUserChange[];
}

export interface ApplyPreview {
  perView: PreviewPerViewRow[];
  perUser: PreviewPerUserRow[];
  totals: PreviewTotals;
}

export interface ApplyApplied {
  inserts: number;
  updates: number;
  deletes: number;
}

export interface PresetApplyResponse {
  scope: ApplyScope;
  target: ApplyTarget;
  mode: ApplyMode;
  dryRun: boolean;
  grants: EnrichedGrant[];
  preview: ApplyPreview;

  /** Presente solo cuando `dryRun:false` y el paso 6 (escritura) está abierto. */
  applied?: ApplyApplied;
}

// Errores

/** 400 de validación: `{ message, errors[] }`. `field` apunta a la ruta ofensora. */
export interface ApplyFieldError {
  field: string;   // p.ej. "grants[0].viewCode", "grants[1].permMask", "mode", "grants"
  message: string;
}

export interface ApplyErrorResponse {
  message: string;
  errors: ApplyFieldError[];
}
