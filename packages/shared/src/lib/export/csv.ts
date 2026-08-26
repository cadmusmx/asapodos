// Exportación CSV transversal. Server-side: cada módulo re-consulta su universo
// filtrado (mismos filtros que su /search) y arma el CSV con estas utilidades.
// Generaliza la lógica que estaba inline en apps/admin/.../audit/export.

/** Tope de filas exportables (revalidado en server; el modal solo lo refleja). */
export const EXPORT_MAX_ROWS = 500;

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
  /**
   * Fuerza el valor como texto literal (="...") para que Excel NO lo reinterprete:
   * folios, números de serie, cuentas, cualquier cosa con ceros a la izquierda o
   * que Excel volvería notación científica.
   */
  text?: boolean;
}

/** Escapa una celda CSV (comillas dobladas, envuelto en comillas). */
const cell = (v: unknown): string => `"${String(v ?? '').replace(/"/g, '""')}"`;

/**
 * Serializa filas a CSV. Antepone BOM (\uFEFF) para que Excel lea bien los acentos.
 * Las columnas con `text: true` salen como ="valor" (a prueba de autoconversión).
 */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map(c => cell(c.header)).join(',');
  const body = rows
    .map(row =>
      columns
        .map(col => {
          const v = col.value(row);

          return col.text ? cell(`="${String(v ?? '')}"`) : cell(v);
        })
        .join(','),
    )
    .join('\n');

  return `\uFEFF${head}\n${body}`;
}

/** Respuesta HTTP de descarga para un CSV ya serializado. */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8;',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

/** Nombre de archivo con fecha: `<base>_YYYY-MM-DD.csv`. */
export function csvFilename(base: string): string {
  return `${base}_${new Date().toISOString().slice(0, 10)}.csv`;
}
