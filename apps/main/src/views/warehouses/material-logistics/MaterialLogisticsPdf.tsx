'use client';

// React Imports
import { useEffect, useMemo, useState } from 'react';

// Base pública de S3 (llaves en BD; URL = base + llave).
const S3_BASE = process.env.NEXT_PUBLIC_S3_PUBLIC_BASE_URL ?? '';

const photoUrl = (key?: string | null): string => {
  if (!key) return '';
  if (!S3_BASE) return key;

  return `${S3_BASE.replace(/\/+$/, '')}/${String(key).replace(/^\/+/, '')}`;
};

const isPdf = (mimeType?: string, archivo?: string): boolean =>
  (mimeType ?? '').toLowerCase().includes('pdf') || (archivo ?? '').toLowerCase().endsWith('.pdf');

// Tipos (shape parseado de GET /[folio])
interface TipoRef { id: number; idTipo: number; tipo: string }
interface Evidencia { id: number; tipo: string; archivo: string; mimeType: string; orden: number }
interface Tarima { id: number; tarimaFoto: string; papeletaFoto: string; orden: number }
interface Documento { nombre: string; archivo: string; mimeType?: string }

interface Sitio {
  id: number; idSitio: string; nombreSitio: string; descripcionMaterial: string;
  materialFaltante: boolean; descripcionFaltantes: string | null; descripcionIncidencias: string | null;
  tiposMaterial: TipoRef[]; incidencias: TipoRef[]; evidencias: Evidencia[]; tarimas: Tarima[];
}

interface LMDetail {
  Folio: string; Fecha: string; Xdock: string; RE: boolean;
  NombreResponsable: string | null; UnidadPlaca: string; NombreOperador: string;
  HoraLlegada: string; HoraInicioDescarga: string; HoraSalida: string;
  Confirmado: boolean; FechaCreacion: string; FechaEdicion: string | null;
  Carrier: string; EsOtro: boolean; OtroCarrier: string | null; Responsable: string; Correo: string;
  documentos: Documento[]; sitios: Sitio[];
}

// Diferencia entre dos horas "HH:MM:SS" -> "Xh Ym" (server-side en el legacy).
const diffHoras = (desde?: string, hasta?: string): string => {
  if (!desde || !hasta) return '—';
  const [h1, m1] = desde.split(':').map(Number);
  const [h2, m2] = hasta.split(':').map(Number);

  if ([h1, m1, h2, m2].some(n => isNaN(n))) return '—';

  let mins = h2 * 60 + m2 - (h1 * 60 + m1);

  if (mins < 0) mins += 24 * 60; // cruza medianoche

  const h = Math.floor(mins / 60);
  const m = mins % 60;

  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const MaterialLogisticsPdf = ({ folio }: { folio: string }) => {
  const [data, setData] = useState<LMDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/warehouses/material-logistics/${encodeURIComponent(folio)}`, { signal: controller.signal })
      .then(res => {
        if (res.status === 404) throw new Error('Registro no encontrado.');
        if (!res.ok) throw new Error('No se pudo cargar el registro.');

        return res.json();
      })
      .then((json: LMDetail) => setData(json))
      .catch(e => {
        if ((e as Error).name !== 'AbortError') setError((e as Error).message);
      });

    return () => controller.abort();
  }, [folio]);

  // Dispara el diálogo de impresión cuando el registro (e imágenes) está listo.
  useEffect(() => {
    if (!data) return;
    const t = setTimeout(() => window.print(), 600);

    return () => clearTimeout(t);
  }, [data]);

  const carrier = useMemo(() => (data ? (data.EsOtro ? data.OtroCarrier ?? '' : data.Carrier) : ''), [data]);

  if (error) return <div className='lm-msg'>{error}</div>;
  if (!data) return <div className='lm-msg'>Cargando…</div>;

  const field = (label: string, value: React.ReactNode) => (
    <div className='lm-field'>
      <div className='lm-field-label'>{label}</div>
      <div className='lm-field-value'>{value ?? '—'}</div>
    </div>
  );

  return (
    <div className='lm-pdf'>
      <style>{PRINT_CSS}</style>

      <div className='lm-toolbar'>
        <button onClick={() => window.print()}>Imprimir / Guardar PDF</button>
        <button onClick={() => window.close()}>Cerrar</button>
      </div>

      <div className='lm-header'>
        <h1>GASO · Logística de Material</h1>
        <div className='lm-sub'>
          {data.RE ? 'Recepción' : 'Entrega'} · {data.Folio}
        </div>
      </div>

      {/* Información general */}
      <div className='lm-section'>
        <div className='lm-section-title'>Información general</div>
        <div className='lm-grid'>
          {field('Folio', data.Folio)}
          {field('Tipo', data.RE ? 'Recepción' : 'Entrega')}
          {field('Fecha', data.Fecha)}
          {field('XDOCK', data.Xdock)}
          {field('Responsable', data.Responsable)}
          {field('Correo', data.Correo)}
          {field('Unidad / Placa', data.UnidadPlaca)}
          {field('Operador', data.NombreOperador)}
          {field('Carrier', data.EsOtro ? `${carrier} (fuera de catálogo)` : carrier)}
          {field('Confirmado', data.Confirmado ? 'Sí' : 'No')}
          {field('Captura', data.FechaCreacion ? new Date(data.FechaCreacion).toLocaleString('es-MX') : '—')}
          {field('Última edición', data.FechaEdicion ? new Date(data.FechaEdicion).toLocaleString('es-MX') : '—')}
        </div>
      </div>

      {/* Control de arribo */}
      <div className='lm-section'>
        <div className='lm-section-title'>Control de arribo</div>
        <div className='lm-grid'>
          {field('Llegada de la unidad', data.HoraLlegada)}
          {field('Inicio de carga / descarga', data.HoraInicioDescarga)}
          {field('Salida de la unidad', data.HoraSalida)}
          {field('Tiempo de estadía', diffHoras(data.HoraLlegada, data.HoraSalida))}
          {field('Tiempo de descarga', diffHoras(data.HoraInicioDescarga, data.HoraSalida))}
        </div>
      </div>

      {/* Documentos del arribo */}
      <div className='lm-section'>
        <div className='lm-section-title'>Documentos del arribo ({data.documentos.length})</div>
        {data.documentos.length === 0 ? (
          <span className='lm-muted'>Sin documentos generales</span>
        ) : (
          <table className='lm-ev-table'>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              {data.documentos.map((d, i) => {
                const url = photoUrl(d.archivo);

                return (
                  <tr key={`${d.archivo}-${i}`}>
                    <td>{d.nombre || `Documento ${i + 1}`}</td>
                    <td className='lm-center'>{isPdf(d.mimeType, d.archivo) ? 'PDF' : 'Imagen'}</td>
                    <td className='lm-url'>
                      <a href={url} target='_blank' rel='noreferrer'>
                        {url}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Sitios */}
      <div className='lm-section'>
        <div className='lm-section-title'>Sitios ({data.sitios.length})</div>
        {data.sitios.length === 0 ? (
          <span className='lm-muted'>Sin sitios</span>
        ) : (
          data.sitios.map((s, i) => (
            <div className='lm-sitio' key={s.id}>
              <div className='lm-sitio-head'>
                Sitio {i + 1}: {s.nombreSitio} <span className='lm-sitio-id'>({s.idSitio})</span>
              </div>
              <div className='lm-grid'>
                {field(
                  'Tipos de material',
                  s.tiposMaterial.length ? s.tiposMaterial.map(t => t.tipo).join(', ') : '—',
                )}
                {field('Material faltante', s.materialFaltante ? 'Sí' : 'No')}
                {field('Descripción del material', s.descripcionMaterial || '—')}
                {s.materialFaltante && field('Detalle de faltantes', s.descripcionFaltantes || '—')}
                {field('Incidencias', s.incidencias.length ? s.incidencias.map(x => x.tipo).join(', ') : '—')}
                {s.incidencias.length > 0 && field('Descripción de incidencias', s.descripcionIncidencias || '—')}
              </div>

              {/* Evidencias: tabla con URL (fiel al PDF legacy; sobrevive al print) */}
              <div className='lm-ev-subtitle'>Evidencias ({s.evidencias.length})</div>
              {s.evidencias.length === 0 ? (
                <span className='lm-muted'>Sin evidencias</span>
              ) : (
                <table className='lm-ev-table'>
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Archivo</th>
                      <th>URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.evidencias.map(ev => {
                      const url = photoUrl(ev.archivo);

                      return (
                        <tr key={ev.id}>
                          <td>{ev.tipo || 'Evidencia'}</td>
                          <td className='lm-center'>{isPdf(ev.mimeType, ev.archivo) ? 'PDF' : 'Imagen'}</td>
                          <td className='lm-url'>
                            <a href={url} target='_blank' rel='noreferrer'>
                              {url}
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {/* Tarimas: pares de URLs */}
              <div className='lm-ev-subtitle'>Tarimas ({s.tarimas.length})</div>
              {s.tarimas.length === 0 ? (
                <span className='lm-muted'>Sin tarimas</span>
              ) : (
                <table className='lm-ev-table'>
                  <thead>
                    <tr>
                      <th>Tarima</th>
                      <th>Foto tarima</th>
                      <th>Foto papeleta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.tarimas.map((t, idx) => (
                      <tr key={t.id}>
                        <td className='lm-center'>{t.orden ?? idx + 1}</td>
                        <td className='lm-url'>
                          <a href={photoUrl(t.tarimaFoto)} target='_blank' rel='noreferrer'>
                            {photoUrl(t.tarimaFoto)}
                          </a>
                        </td>
                        <td className='lm-url'>
                          <a href={photoUrl(t.papeletaFoto)} target='_blank' rel='noreferrer'>
                            {photoUrl(t.papeletaFoto)}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Estilos de impresión calcando logistica_material_pdf.ejs. Autónomos (no dependen
// de MUI/Materio) para que el print salga consistente. La toolbar se oculta al imprimir.
const PRINT_CSS = `
  .lm-pdf { max-width: 900px; margin: 0 auto; padding: 24px; color: #1a1a1a;
            font-family: Arial, Helvetica, sans-serif; font-size: 12px; background: #fff; }
  .lm-toolbar { display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 16px; }
  .lm-toolbar button { padding: 6px 14px; border: 1px solid #666; border-radius: 6px;
                       background: #f5f5f5; cursor: pointer; font-size: 12px; }
  .lm-msg { padding: 40px; text-align: center; font-family: Arial, sans-serif; color: #666; }
  .lm-header { text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; margin-bottom: 18px; }
  .lm-header h1 { font-size: 18px; margin: 0; }
  .lm-sub { font-size: 13px; color: #444; margin-top: 4px; }
  .lm-section { margin-bottom: 18px; break-inside: avoid; }
  .lm-section-title { font-size: 13px; font-weight: bold; background: #eee; padding: 5px 8px;
                      border-left: 3px solid #444; margin-bottom: 8px; }
  .lm-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 16px; }
  .lm-field-label { font-size: 10px; color: #777; text-transform: uppercase; }
  .lm-field-value { font-size: 12px; }
  .lm-muted { color: #999; font-style: italic; }
  .lm-sitio { border: 1px solid #ccc; border-radius: 6px; padding: 10px; margin-bottom: 12px; break-inside: avoid; }
  .lm-sitio-head { font-weight: bold; font-size: 13px; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .lm-sitio-id { color: #888; font-weight: normal; }
  .lm-ev-subtitle { font-size: 11px; font-weight: bold; color: #444; margin: 10px 0 4px; }
  .lm-ev-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  .lm-ev-table th, .lm-ev-table td { border: 1px solid #ddd; padding: 4px 6px; text-align: left; vertical-align: top; }
  .lm-ev-table th { background: #f5f5f5; }
  .lm-center { text-align: center; }
  .lm-url { word-break: break-all; }
  .lm-url a { color: #0645ad; text-decoration: none; }
  @page { margin: 14mm; }
  @media print {
    .lm-toolbar { display: none; }
    .lm-pdf { padding: 0; max-width: none; }
    a { color: #000; }
  }
`;

export default MaterialLogisticsPdf;
