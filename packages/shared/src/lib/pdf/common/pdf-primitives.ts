// Primitivas de layout para los builders de PDF (LM y VM): paleta, títulos de
// sección, campos etiqueta/valor, filas, chips, badges, celdas de foto y grids.
// Portado verbatim del legacy (sin cambios de comportamiento). Agnósticas del
// módulo: reciben datos ya resueltos (texto o base64) y devuelven nodos pdfmake.

import type { Content, StyleDictionary } from 'pdfmake/interfaces'

// Ancho útil de A4 con márgenes de 36pt: 595.28 - 72 ≈ 523.
export const CONTENT_WIDTH = 523

export const COLORS = {
  ink: '#274989',
  inkLight: '#d1e8ff',
  muted: '#a3a3a3',
  label: '#1b325e',
  danger: '#c0392b',
  ok: '#27ae60',
  link: '#2980b9',
  chipInfoBg: '#d1ecf1', chipInfoFg: '#0c5460',
  chipWarnBg: '#fff3cd', chipWarnFg: '#856404',
  badgeSiBg: '#f8d7da', badgeNoBg: '#d4edda',
} as const

// Estilos base compartidos por ambos documentos. Un builder puede expandir/override.
export const BASE_STYLES: StyleDictionary = {
  docTitle: { fontSize: 16, bold: true, alignment: 'center', color: COLORS.ink },
  docSubtitle: { fontSize: 12, alignment: 'center', color: COLORS.muted },
  sectionTitle: { fontSize: 12, bold: true, color: '#ffffff' },
  sitioHead: { fontSize: 12 },
  fieldLabel: { fontSize: 8, bold: true, color: COLORS.label },
  fieldValue: { fontSize: 10, color: '#000000' },
  evSubtitle: { fontSize: 10, bold: true, color: COLORS.ink, margin: [0, 10, 0, 4] },
  photoLabel: { fontSize: 8, color: COLORS.muted },
  link: { color: COLORS.link, decoration: 'underline' },
  muted: { italics: true, color: COLORS.muted },
  tdCell: { fontSize: 9, color: COLORS.ink, margin: [0, 3, 0, 3] },
} as const

export function sectionTitle(text: string): Content {
  return {
    table: { widths: ['*'], body: [[{ text, style: 'sectionTitle', fillColor: COLORS.ink, margin: [10, 6, 10, 6] }]] },
    layout: 'noBorders',
    margin: [0, 0, 0, 10],
  }
}

// Un campo = etiqueta pequeña + valor. `value` puede ser string o un nodo pdfmake ya armado.
export function field(label: string, value: unknown, valueStyle?: string): Content {
  const valueNode: Content = (value !== null && typeof value === 'object')
    ? (value as Content)
    : { text: (value === '' || value == null) ? '—' : String(value), style: valueStyle || 'fieldValue' }

  return { stack: [{ text: label, style: 'fieldLabel' }, valueNode] }
}

// Campo a ancho completo (sin envoltorio de columnas → sin hueco lateral).
export function fieldFull(label: string, value: unknown): Content {
  return {
    stack: [
      { text: label, style: 'fieldLabel' },
      { text: (value === '' || value == null) ? '—' : String(value), style: 'fieldValue' },
    ],
    margin: [0, 0, 0, 8],
  }
}

export function fieldRow(fields: Content[]): Content {
  return { columns: fields, columnGap: 16, margin: [0, 0, 0, 8] }
}

// Chips como pastillas con fondo. NBSP (\u00A0) como padding para que el fondo
// no se recorte al hacer trim de espacios.
export function chipsValue(arr: string[], bg: string, fg: string): Content {
  if (!arr.length) return { text: '—', style: 'fieldValue' }

  const runs: Content[] = []

  arr.forEach((t, i) => {
    if (i > 0) runs.push({ text: '  ', fontSize: 9 })
    runs.push({ text: `\u00A0${t}\u00A0`, background: bg, color: fg, fontSize: 9 })
  })

  return { text: runs }
}

// Pastilla Sí/No (rojo/verde) para banderas booleanas.
export function faltanteBadge(flag: boolean): Content {
  return flag
    ? { text: '\u00A0Sí\u00A0', background: COLORS.badgeSiBg, color: COLORS.danger, bold: true }
    : { text: '\u00A0No\u00A0', background: COLORS.badgeNoBg, color: COLORS.ok, bold: true }
}

// Celda Sí/No coloreada para tablas resumen. "No" = bueno (verde); "Sí" = alerta (rojo).
export function siNoCell(flag: boolean): Content {
  return flag
    ? { text: 'Sí', color: COLORS.danger, bold: true, alignment: 'center', style: 'tdCell' }
    : { text: 'No', color: COLORS.ok, bold: true, alignment: 'center', style: 'tdCell' }
}

// Celda de foto: imagen embebida si hay base64; si falló la descarga, enlace real.
export function photoCell(dataUrl: string | null, url: string | null, label: string, fit?: [number, number]): Content {
  const box = fit || [155, 120]
  const media: Content = dataUrl
    ? { image: dataUrl, fit: box, alignment: 'center' }
    : (url
      ? { text: 'Ver imagen', link: url, style: 'link', alignment: 'center', margin: [0, 24, 0, 24] }
      : { text: 'Sin imagen', style: 'muted', alignment: 'center', margin: [0, 24, 0, 24] })

  return { stack: [media, { text: label, style: 'photoLabel', alignment: 'center' }], margin: [0, 0, 0, 8] }
}

// Grid de N columnas a partir de celdas ya armadas.
export function imageGrid(cells: Content[], cols: number): Content {
  const rows: Content[][] = []

  for (let i = 0; i < cells.length; i += cols) {
    const row = cells.slice(i, i + cols)

    while (row.length < cols) row.push({ text: '' })
    rows.push(row)
  }

  return { table: { widths: Array(cols).fill('*'), body: rows }, layout: 'noBorders', margin: [0, 0, 0, 4] }
}

export function groupLabel(text: string): Content {
  return { text, bold: true, fontSize: 9, color: '#34495e', margin: [0, 4, 0, 4] }
}
