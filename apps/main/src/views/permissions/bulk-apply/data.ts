// Seam de datos del modal de aplicación masiva. Hoy:
// fetch real a G1 (endpoint ya levantado) + fixtures mock para desarrollar el grid aislado (Paso 2) antes de depender de la red.

import type { AssignableViewsResponse, DepartmentFacetsResponse } from './types';

/**
 * Lee las vistas asignables del PLAN del tenant (nivel tenant, sin departamento).
 * Reemplaza a `fetchDepartmentViews`: tras la migración las vistas ya no dependen del depto — son las del plan,
 * iguales para todo el tenant.
 *
 * Faithful mirror del endpoint: DEVUELVE `permissions_access`; el GRID la omite (`isProtectedView`).
 * El seam NO filtra — espejo 1:1 con el back.
 */
export async function fetchAssignableViews(signal?: AbortSignal): Promise<AssignableViewsResponse> {
  const res = await fetch('/api/permissions/assignable-views', { signal });

  if (!res.ok) throw new Error('No se pudieron cargar las vistas asignables.');

  return (await res.json()) as AssignableViewsResponse;
}

/**
 * Lee las facetas (puesto/perfil) para acotar el alcance.
 * Dependientes del depto: solo puesto/perfil con ≥1 usuario activo.
 * Mismo gate de alcance que views.
 */
export async function fetchDepartmentFacets(
  idDepartamento: number,
  signal?: AbortSignal
): Promise<DepartmentFacetsResponse> {
  const res = await fetch(`/api/permissions/department/${idDepartamento}/facets`, { signal });

  if (res.status === 403) throw new Error('No tienes alcance sobre este departamento.');
  if (!res.ok) throw new Error('No se pudieron cargar los filtros del departamento.');

  return (await res.json()) as DepartmentFacetsResponse;
}

// ---------------------------------------------------------------------------
// Fixtures para desarrollo aislado (harness dev-only).
//
// `ceilingMask` fijo en 15 (post-migración: sin techo por vista).
// Se conserva `publicMask` variado (1 en dashboard*, 0 el resto) para ejercer el piso público bloqueado-on.
// Incluye `permissions_access` a propósito: caso de prueba del filtro del grid (el endpoint la devuelve, el modal la omite).
// ---------------------------------------------------------------------------

export const MOCK_ASSIGNABLE_VIEWS: AssignableViewsResponse = {
  views: [
    // dashboard*: público R (bit 1) -> se pinta bloqueado-on.
    { viewCode: 'dashboard_home', label: 'Inicio', menuGroup: 'dashboard', ceilingMask: 15, publicMask: 1 },
    { viewCode: 'dashboard_ventas', label: 'Ventas', menuGroup: 'dashboard', ceilingMask: 15, publicMask: 1 },

    // Sin público: los 4 chips arrancan en blanco.
    { viewCode: 'inventario_articulos', label: 'Artículos', menuGroup: 'inventario', ceilingMask: 15, publicMask: 0 },
    { viewCode: 'inventario_movimientos', label: 'Movimientos', menuGroup: 'inventario', ceilingMask: 15, publicMask: 0 },
    { viewCode: 'facturas', label: 'Facturas', menuGroup: 'facturacion', ceilingMask: 15, publicMask: 0 },
    { viewCode: 'notas', label: 'Notas de crédito', menuGroup: 'facturacion', ceilingMask: 15, publicMask: 0 },

    // Protegida: el endpoint la devuelve; el modal la OMITE (verificación del filtro).
    { viewCode: 'permissions_access', label: 'Administración de permisos', menuGroup: 'seguridad', ceilingMask: 15, publicMask: 0 },
  ],
};

/** Plan sin vistas asignables: dispara el aviso, no un grid vacío silencioso. */
export const MOCK_ASSIGNABLE_VIEWS_EMPTY: AssignableViewsResponse = {
  views: [],
};
