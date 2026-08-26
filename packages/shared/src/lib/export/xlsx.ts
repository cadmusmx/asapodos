// packages/shared/src/lib/export/xlsx.ts
//
// Motor XLSX transversal. Escrito UNA vez; no sabe de dominio. Recibe hojas con
// filas YA planas (el módulo desanida antes) y devuelve el Buffer del .xlsx.
// El límite de filas NO vive aquí: es parte del ExportConfig de cada módulo
// (VM=500, LM menor porque un registro = N sitios).

import * as XLSX from 'xlsx';

export interface SheetColumn {
  header: string;
  key: string;
  /** Fuerza texto (folios, series, cuentas) contra la autoconversión de Excel. */
  text?: boolean;
}

export interface SheetSpec {
  name: string;
  columns: SheetColumn[];
  /** Filas ya desanidadas/planas por el módulo. */
  rows: Array<Record<string, unknown>>;
  /**
   * Inserta una fila en blanco entre grupos consecutivos (por el valor de esta
   * key, típicamente 'Folio'). Default OFF: tabular puro es mejor para análisis;
   * el separador es solo legibilidad humana.
   */
  separator?: boolean;
  separatorKey?: string;
}

/** Config de exportación que aporta cada módulo (patrón factory). */
export interface ExportConfig<TRow> {
  /** Tope de registros de la hoja PRINCIPAL (no cuenta filas desanidadas). */
  maxRows: number;
  /** Base del nombre de archivo (sin fecha ni extensión). */
  filenameBase: string;
  /** Convierte las filas crudas del query en las hojas del libro. */
  toSheets: (rows: TRow[]) => SheetSpec[];
}

function sheetToAoa(sheet: SheetSpec): { aoa: unknown[][]; textCols: Set<number> } {
  const textCols = new Set<number>();

  sheet.columns.forEach((c, i) => { if (c.text) textCols.add(i); });

  const header = sheet.columns.map(c => c.header);
  const aoa: unknown[][] = [header];

  let prev: unknown;

  for (const row of sheet.rows) {
    if (sheet.separator && sheet.separatorKey) {
      const cur = row[sheet.separatorKey];

      if (prev !== undefined && cur !== prev) aoa.push([]);
      prev = cur;
    }

    aoa.push(sheet.columns.map(c => row[c.key] ?? ''));
  }

  return { aoa, textCols };
}

/** Materializa el libro. Las columnas `text` se escriben como celdas string. */
export function buildWorkbook(sheets: SheetSpec[]): Buffer {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const { aoa, textCols } = sheetToAoa(sheet);
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Forzar tipo string en columnas `text` (evita notación científica / pérdida
    // de ceros a la izquierda en folios y series). Fila 0 es el header.
    if (textCols.size > 0) {
      const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');

      for (let r = 1; r <= range.e.r; r++) {
        for (const c of textCols) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = ws[addr];

          if (cell && cell.v !== '' && cell.v != null) {
            cell.t = 's';
            cell.v = String(cell.v);
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31)); // Excel: máx 31 chars
  }

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

/** Respuesta HTTP de descarga para un libro XLSX. */
export function xlsxResponse(buffer: Buffer, filename: string): Response {
  // Buffer es un Uint8Array, pero los tipos de Response (BodyInit) no lo aceptan
  // directamente en este proyecto -> se envuelve (mismo runtime, tipo correcto).
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

/** Nombre de archivo con fecha: `<base>_YYYY-MM-DD.xlsx`. */
export function xlsxFilename(base: string): string {
  return `${base}_${new Date().toISOString().slice(0, 10)}.xlsx`;
}
