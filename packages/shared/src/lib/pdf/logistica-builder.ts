// Builder pdfmake del PDF de Logística de Material (LM). Estructura: página 1
// (info general + control de arribo + resumen de sitios) + una página por sitio.
// Portado verbatim del legacy; consume las primitivas compartidas. El Buffer se
// genera fuera: renderToBuffer(buildLogisticaPdf(vm)).

import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'

import {
  COLORS, BASE_STYLES, sectionTitle, field, fieldFull, fieldRow,
  chipsValue, faltanteBadge, siNoCell, photoCell, imageGrid, groupLabel
} from './common/pdf-primitives'
import { SitioVM, Tarima, LogisticaViewModel } from './types'

// Página 1: tabla resumen de sitios.
function sitiosResumenTable(sitios: SitioVM[]): Content {
  const th = (t: string, align?: string): Content => ({ text: t, bold: true, fontSize: 9, alignment: align || 'left', margin: [0, 4, 0, 4] } as Content)
  const body: Content[][] = [[th('#', 'center'), th('Sitio'), th('Faltantes', 'center'), th('Incidencias', 'center')]]

  sitios.forEach((s, i) => {
    body.push([
      { text: String(i + 1), alignment: 'center', style: 'tdCell' },
      { text: s.titulo, style: 'tdCell' },
      siNoCell(s.faltante),
      siNoCell(s.incidenciasTxt.length > 0),
    ])
  })

  return { table: { headerRows: 1, widths: [24, '*', 70, 70], body }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 8] }
}

// Bloques de evidencias por sitio (imágenes embebidas + enlaces a documentos).
function evidenciasContent(ev: SitioVM['evidencias']): Content[] {
  const { imagenes, documentos } = ev

  if (!imagenes.length && !documentos.length) return [{ text: 'Sin evidencias', style: 'muted' }]

  const blocks: Content[] = []

  if (imagenes.length) {
    const fit: [number, number] = [200, 150]

    blocks.push(imageGrid(imagenes.map(i => photoCell(i.dataUrl, i.url, i.tipo, fit)), 2))
  }

  if (documentos.length) {
    blocks.push({
      stack: documentos.map(d => ({
        text: [{ text: `${d.tipo}: `, bold: true }, { text: 'Abrir archivo', link: d.url, style: 'link' }],
        margin: [0, 1, 0, 1],
      })),
    })
  }

  return blocks
}

// Pares tarima/papeleta (idéntico a VM).
function tarimasContent(tarimas: Tarima[]): Content[] {
  if (!tarimas.length) return []

  const blocks: Content[] = []
  const emptyCell: Content = { stack: [{ text: '—', style: 'muted', alignment: 'center', margin: [0, 24, 0, 24] }] }
  const fit: [number, number] = [200, 150]

  tarimas.forEach(t => {
    blocks.push(groupLabel(`Tarima ${t.orden}`))

    const cells: Content[] = [
      t.tarima ? photoCell(t.tarima.dataUrl, t.tarima.url, 'Tarima', fit) : emptyCell,
      t.papeleta ? photoCell(t.papeleta.dataUrl, t.papeleta.url, 'Papeleta', fit) : emptyCell,
    ]

    blocks.push(imageGrid(cells, 2))
  })

  return blocks
}

// Detalle de un sitio en su propia página (encabezado primero, con pageBreak antes).
function sitioDetalle(s: SitioVM, num: number): Content[] {
  const blocks: Content[] = []

  blocks.push({
    table: { widths: ['*'], body: [[{ text: `${num} · ${s.titulo}`, style: 'sitioHead', fillColor: COLORS.inkLight, margin: [10, 6, 10, 6] }]] },
    layout: 'noBorders',
    pageBreak: 'before',
    margin: [0, 0, 0, 10],
  })

  blocks.push(fieldRow([
    field('Tipos de material', chipsValue(s.tiposMaterialTxt, COLORS.chipInfoBg, COLORS.chipInfoFg)),
    field('Material faltante', faltanteBadge(s.faltante)),
  ]))

  blocks.push(fieldFull('Descripción del material', s.descripcionMaterial))

  if (s.faltante) {
    blocks.push(fieldFull('Detalle de faltantes', s.descripcionFaltantes))
  }

  // Mostrar solo si hubo incidencias.
  if (s.incidenciasTxt && s.incidenciasTxt.length) {
    blocks.push(fieldRow([
      field('Incidencias', chipsValue(s.incidenciasTxt, COLORS.chipWarnBg, COLORS.chipWarnFg)),
      field('Descripción de incidencias', s.descripcionIncidencias),
    ]))
  }

  blocks.push({ text: 'Evidencias', style: 'evSubtitle' })
  blocks.push(...evidenciasContent(s.evidencias))

  const tarimas = tarimasContent(s.tarimas)

  if (tarimas && tarimas.length > 0) {
    blocks.push({ text: 'Tarimas', style: 'evSubtitle' })
    blocks.push(...tarimas)
  }

  return blocks
}

export function buildLogisticaPdf(data: LogisticaViewModel): TDocumentDefinitions {
  const content: Content[] = []

  // Título
  content.push({ text: 'GASO - Logística de Material', style: 'docTitle' })
  content.push({ text: `${data.tipoTxt} · ${data.folio}`, style: 'docSubtitle', margin: [0, 0, 0, 16] })

  // Información general
  content.push(sectionTitle('Información general'))
  content.push(fieldRow([field('Folio', data.folio), field('Tipo', data.tipoTxt), field('Fecha', data.fechaTxt)]))
  content.push(fieldRow([field('XDOCK', data.xdock), field('Carrier', data.carrierTxt)]))
  content.push(fieldRow([field('Responsable', data.responsable), field('Correo', data.correo)]))
  content.push(fieldRow([field('Unidad / Placa', data.unidadPlaca), field('Operador', data.nombreOperador)]))
  content.push(fieldRow([field('Fecha de captura', data.fechaCreacionTxt), field('Última edición', data.fechaEdicionTxt)]))

  // Control de arribo
  content.push(sectionTitle('Control de arribo'))
  content.push(fieldRow([field('Llegada de la unidad', data.llegadaTxt), field('Inicio de carga / descarga', data.inicioDescargaTxt), field('Salida de la unidad', data.salidaTxt)]))
  content.push(fieldRow([field('Tiempo de estadía', data.estadiaTxt), field('Tiempo de descarga', data.descargaTxt)]))

  // Resumen de sitios (índice de la página 1)
  content.push(sectionTitle('Resumen de sitios'))

  if (!data.sitios.length) {
    content.push({ text: 'Sin sitios', style: 'muted' })
  } else {
    content.push(sitiosResumenTable(data.sitios))
    // Una página por sitio.
    data.sitios.forEach((s, i) => content.push(...sitioDetalle(s, i + 1)))
  }

  return {
    pageSize: 'A4',
    pageMargins: [36, 40, 36, 44],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: '#000000' },
    styles: BASE_STYLES,
    content,
    footer: (currentPage: number, pageCount: number): Content => ({
      text: `${currentPage} / ${pageCount}`,
      alignment: 'center',
      fontSize: 8,
      color: COLORS.label,
      margin: [0, 10, 0, 0],
    }),
  }
}
