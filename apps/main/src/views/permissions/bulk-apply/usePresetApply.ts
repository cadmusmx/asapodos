'use client';

// React Imports
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Local Imports
import { fetchAssignableViews, fetchDepartmentFacets } from './data';
import { collectGrants } from './grants';
import type {
  ApplyApplied,
  ApplyFieldError,
  ApplyMode,
  ApplyPreview,
  DepartmentView,
  PerfilFacet,
  PresetApplyRequest,
  PresetApplyResponse,
  PresetApplySnapshot,
  PresetGrant,
  PuestoFacet
} from './types';

const APPLY_URL = '/api/permissions/presets/apply';

/**
 * Clave canónica del snapshot para detectar preview obsoleto.
 * Ordena grants por viewCode: el orden de emisión no debe causar un falso "stale".
 */
function snapshotKey(s: PresetApplySnapshot): string {
  const grants = [...s.grants].sort((a, b) => a.viewCode.localeCompare(b.viewCode));

  return JSON.stringify({ d: s.idDepartamento, pu: s.idPuesto, pe: s.idPerfil, m: s.mode, g: grants });
}

type PostResult =
  | { kind: 'ok'; data: PresetApplyResponse }
  | { kind: 'fail'; message: string; fieldErrors: ApplyFieldError[] };

async function postApply(body: PresetApplyRequest, signal: AbortSignal): Promise<PostResult> {
  const res = await fetch(APPLY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal
  });

  const json = await res.json().catch(() => null);

  if (res.ok) return { kind: 'ok', data: json as PresetApplyResponse };

  // 403 PLAN_RESTRICTED: grant de un módulo fuera del plan.
  // No debería ocurrir si el modal solo ofrece assignable-views; se maneja por defensa.
  if (json?.code === 'PLAN_RESTRICTED') {
    return { kind: 'fail', message: 'Una o más vistas no están en el plan del tenant.', fieldErrors: [] };
  }

  // 400 validación: { message, errors[] }. 403/500: { message }.
  const message = json && typeof json.message === 'string' ? json.message : 'No se pudo procesar la solicitud.';
  const fieldErrors: ApplyFieldError[] = Array.isArray(json?.errors) ? json.errors : [];

  return { kind: 'fail', message, fieldErrors };
}

export interface UsePresetApply {

  // Alcance
  idDepartamento: number | null;
  idPuesto: number | null;
  idPerfil: number | null;
  setDepartamento: (id: number | null) => void;
  setPuesto: (id: number | null) => void;
  setPerfil: (id: number | null) => void;

  // Vistas asignables del plan (nivel tenant; se cargan una vez al montar)
  views: DepartmentView[];
  viewsLoading: boolean;
  viewsError: string | null;

  // Facetas de alcance del departamento (seam facets)
  puestos: PuestoFacet[];
  perfiles: PerfilFacet[];
  facetsLoading: boolean;

  // Máscaras de trabajo
  workingMasks: Record<string, number>;
  setMask: (viewCode: string, nextMask: number) => void;

  // Modo
  mode: ApplyMode;
  setMode: (m: ApplyMode) => void;

  // Emisión
  grants: PresetGrant[];

  // Máquina de dos fases
  preview: ApplyPreview | null;
  isPreviewStale: boolean;
  previewLoading: boolean;
  committing: boolean;
  applied: ApplyApplied | null;
  error: string | null;
  fieldErrors: ApplyFieldError[];

  canPreview: boolean;
  canCommit: boolean;

  runPreview: () => void;
  runCommit: () => void;
  resetGrants: () => void;
}

export function usePresetApply(): UsePresetApply {
  const [idDepartamento, setIdDepartamento] = useState<number | null>(null);
  const [idPuesto, setIdPuesto] = useState<number | null>(null);
  const [idPerfil, setIdPerfil] = useState<number | null>(null);

  const [views, setViews] = useState<DepartmentView[]>([]);
  const [viewsLoading, setViewsLoading] = useState(false);
  const [viewsError, setViewsError] = useState<string | null>(null);

  const [puestos, setPuestos] = useState<PuestoFacet[]>([]);
  const [perfiles, setPerfiles] = useState<PerfilFacet[]>([]);
  const [facetsLoading, setFacetsLoading] = useState(false);

  const [workingMasks, setWorkingMasks] = useState<Record<string, number>>({});
  const [mode, setModeState] = useState<ApplyMode>('OR');

  const [preview, setPreview] = useState<ApplyPreview | null>(null);
  const [previewSnapshotKey, setPreviewSnapshotKey] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [applied, setApplied] = useState<ApplyApplied | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ApplyFieldError[]>([]);

  // Un solo controller para el request de apply en vuelo (preview o commit).
  const applyAbortRef = useRef<AbortController | null>(null);

  const grants = useMemo(() => collectGrants(workingMasks, views), [workingMasks, views]);

  const snapshot = useMemo<PresetApplySnapshot | null>(() => {
    if (idDepartamento === null) return null;

    return { idDepartamento, idPuesto, idPerfil, grants, mode };
  }, [idDepartamento, idPuesto, idPerfil, grants, mode]);

  const currentKey = useMemo(() => (snapshot ? snapshotKey(snapshot) : null), [snapshot]);

  const isPreviewStale = preview !== null && previewSnapshotKey !== currentKey;

  // Vistas asignables: NIVEL TENANT — se cargan UNA vez al montar, no dependen del depto.
  useEffect(() => {
    const controller = new AbortController();

    const loadViews = async () => {
      setViewsLoading(true);
      setViewsError(null);

      try {
        const res = await fetchAssignableViews(controller.signal);

        setViews(res.views);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setViewsError((e as Error).message);
        setViews([]);
      } finally {
        setViewsLoading(false);
      }
    };

    loadViews();

    return () => controller.abort();
  }, []);

  // Facetas (puesto/perfil): SIGUEN dependiendo del depto.
  // Al cambiar de depto se recargan y se resetean los ejes (las opciones cambian).
  // Las vistas y los grants NO se tocan (son del plan, estables); el preview queda stale por el snapshot.
  useEffect(() => {
    if (idDepartamento === null) {
      setPuestos([]);
      setPerfiles([]);

      return;
    }

    const controller = new AbortController();

    const loadFacets = async () => {
      setFacetsLoading(true);

      try {
        const res = await fetchDepartmentFacets(idDepartamento, controller.signal);

        setPuestos(res.puestos);
        setPerfiles(res.perfiles);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;

        // Silencioso: sin facetas, puesto/perfil quedan en "cualquiera".
        setPuestos([]);
        setPerfiles([]);
      } finally {
        setFacetsLoading(false);
      }
    };

    // Cambió el depto: resetea ejes de alcance y limpia el resultado/errores previos.
    // (No toca vistas ni grants; el preview se invalida solo vía snapshot.)
    setIdPuesto(null);
    setIdPerfil(null);
    setApplied(null);
    setError(null);
    setFieldErrors([]);

    loadFacets();

    return () => controller.abort();
  }, [idDepartamento]);

  // Toda mutación de intención limpia el resultado del commit previo y errores.
  const clearOutcome = useCallback(() => {
    setApplied(null);
    setError(null);
    setFieldErrors([]);
  }, []);

  const setDepartamento = useCallback((id: number | null) => setIdDepartamento(id), []);

  const setPuesto = useCallback(
    (id: number | null) => {
      setIdPuesto(id);
      clearOutcome();
    },
    [clearOutcome]
  );

  const setPerfil = useCallback(
    (id: number | null) => {
      setIdPerfil(id);
      clearOutcome();
    },
    [clearOutcome]
  );

  const setMask = useCallback(
    (viewCode: string, nextMask: number) => {
      setWorkingMasks(prev => ({ ...prev, [viewCode]: nextMask }));
      clearOutcome();
    },
    [clearOutcome]
  );

  const setMode = useCallback(
    (m: ApplyMode) => {
      setModeState(m);
      clearOutcome();
    },
    [clearOutcome]
  );

  const canPreview = snapshot !== null && grants.length > 0 && !previewLoading && !committing;
  const canCommit = preview !== null && !isPreviewStale && !previewLoading && !committing && applied === null;

  const runPreview = useCallback(() => {
    if (snapshot === null || grants.length === 0) return;

    applyAbortRef.current?.abort();
    const controller = new AbortController();

    applyAbortRef.current = controller;

    const key = snapshotKey(snapshot);
    const body: PresetApplyRequest = { ...snapshot, dryRun: true };

    setPreviewLoading(true);
    setError(null);
    setFieldErrors([]);

    postApply(body, controller.signal)
      .then(result => {
        if (result.kind === 'ok') {
          setPreview(result.data.preview);
          setPreviewSnapshotKey(key); // fija la key CON QUE se pidió, no la actual
        } else {
          setError(result.message);
          setFieldErrors(result.fieldErrors);
        }
      })
      .catch(e => {
        if ((e as Error).name === 'AbortError') return;
        setError('No se pudo contactar el servidor.');
      })
      .finally(() => {
        if (applyAbortRef.current === controller) setPreviewLoading(false);
      });
  }, [snapshot, grants.length]);

  const runCommit = useCallback(() => {
    if (snapshot === null || preview === null || isPreviewStale || applied !== null) return;

    applyAbortRef.current?.abort();
    const controller = new AbortController();

    applyAbortRef.current = controller;

    const body: PresetApplyRequest = { ...snapshot, dryRun: false };

    setCommitting(true);
    setError(null);
    setFieldErrors([]);

    postApply(body, controller.signal)
      .then(result => {
        if (result.kind === 'ok') {
          if (result.data.applied) {
            setApplied(result.data.applied);
            setPreview(result.data.preview); // el preview del commit es la verdad final
          } else {
            // Gate de escritura cerrado (paso 6): NO asumir éxito.
            setError('La escritura no está disponible por ahora.');
          }
        } else {
          setError(result.message);
          setFieldErrors(result.fieldErrors);
        }
      })
      .catch(e => {
        if ((e as Error).name === 'AbortError') return;
        setError('No se pudo contactar el servidor.');
      })
      .finally(() => {
        if (applyAbortRef.current === controller) setCommitting(false);
      });
  }, [snapshot, preview, isPreviewStale, applied]);

  const resetGrants = useCallback(() => {
    applyAbortRef.current?.abort();
    setWorkingMasks({});
    setModeState('OR');
    setPreview(null);
    setPreviewSnapshotKey(null);
    setApplied(null);
    setError(null);
    setFieldErrors([]);
  }, []);

  return {
    idDepartamento,
    idPuesto,
    idPerfil,
    setDepartamento,
    setPuesto,
    setPerfil,
    views,
    viewsLoading,
    viewsError,
    puestos,
    perfiles,
    facetsLoading,
    workingMasks,
    setMask,
    mode,
    setMode,
    grants,
    preview,
    isPreviewStale,
    previewLoading,
    committing,
    applied,
    error,
    fieldErrors,
    canPreview,
    canCommit,
    runPreview,
    runCommit,
    resetGrants
  };
}
