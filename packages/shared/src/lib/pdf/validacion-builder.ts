// Builder pdfmake del PDF de Validación de Material (VM). Registro plano (sin
// jerarquía de sitios). Portado verbatim del legacy; solo arma el docDefinition
// a partir del view-model de `prepareValidacionData`. El Buffer se genera fuera:
//   renderToBuffer(buildValidacionPdf(vm))
//
// Nota tipos: si algún literal choca con los tipos estrictos de pdfmake/interfaces
// (el legacy era JS sin tipos), castear puntualmente a Content.

import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';

import {
  COLORS, BASE_STYLES, sectionTitle, field, fieldFull, fieldRow, photoCell, imageGrid, groupLabel,
} from './common/pdf-primitives';

interface Foto { dataUrl: string | null; url: string | null }
interface Tarima { orden: number; tarima: Foto | null; papeleta: Foto | null }
interface Pieza { etiqueta?: string; piezas?: string }

export interface ValidacionViewModel {
  folio: string; tipoTxt: string; fechaTxt: string; cancelada: boolean;
  proyecto: string; tipoMaterial: string; idSitio: string; nombreSitio: string;
  cuentaCliente: string; regionTxt: string; carrierTxt: string; almacenDestino: string;
  responsable: string; correo: string; placasTransporte: string;
  totalPiezas: string | number; numTarimas: string | number;
  fechaCapturaTxt: string; fechaEdicionTxt: string;
  aspNombre: string; nombreContacto: string;
  piezasMotivo: Pieza[]; piezasEstadoF: Pieza[];
  notas: string | null;
  fotos: { transporte?: Foto; placas?: Foto; materialEnTransporte?: Foto; materialDescargado?: Foto };
  tarimas: Tarima[];
  documentos: Array<{ name: string; url: string }>;
  firmaDataUrl: string | null;
}

// Tabla simple para piezas (motivo o estado físico).
function piezasTable(rows: Pieza[], etiquetaCol: string): Content {
  const th = (t: string, align?: string): Content => ({ text: t, bold: true, fontSize: 9, alignment: align || 'left', margin: [0, 4, 0, 4] } as Content);
  const body: Content[][] = [[th('#', 'center'), th(etiquetaCol), th('Piezas')]];

  rows.forEach((r, i) => {
    body.push([
      { text: String(i + 1), alignment: 'center', style: 'tdCell' },
      { text: r.etiqueta || '—', style: 'tdCell' },
      { text: r.piezas || '—', style: 'tdCell' },
    ]);
  });

  return { table: { headerRows: 1, widths: [24, '*', '*'], body }, layout: 'lightHorizontalLines', margin: [0, 0, 0, 8] };
}

// Grid de las fotos fijas. Sólo incluye las que existen.
function fotosContent(fotos: ValidacionViewModel['fotos']): Content[] {
  const fit: [number, number] = [200, 150];
  const items = ([
    ['Transporte', fotos.transporte],
    ['Placas', fotos.placas],
    ['Material en transporte', fotos.materialEnTransporte],
    ['Material descargado', fotos.materialDescargado],
  ] as Array<[string, Foto | undefined]>).filter(([, f]) => f) as Array<[string, Foto]>;

  if (!items.length) return [{ text: 'Sin fotografías', style: 'muted' }];

  const cells = items.map(([label, f]) => photoCell(f.dataUrl, f.url, label, fit));

  return [imageGrid(cells, 2)];
}

// Pares tarima/papeleta.
function tarimasContent(tarimas: Tarima[]): Content[] {
  if (!tarimas.length) return [];

  const blocks: Content[] = [];
  const emptyCell: Content = { stack: [{ text: '—', style: 'muted', alignment: 'center', margin: [0, 24, 0, 24] }] };
  const fit: [number, number] = [200, 150];

  tarimas.forEach(t => {
    blocks.push(groupLabel(`Tarima ${t.orden}`));

    const cells: Content[] = [
      t.tarima ? photoCell(t.tarima.dataUrl, t.tarima.url, 'Tarima', fit) : emptyCell,
      t.papeleta ? photoCell(t.papeleta.dataUrl, t.papeleta.url, 'Papeleta', fit) : emptyCell,
    ];

    blocks.push(imageGrid(cells, 2));
  });

  return blocks;
}

// Enlaces a documentos (URLs ya resueltas).
function documentosContent(documentos: Array<{ name: string; url: string }>): Content[] {
  if (!documentos.length) return [];

  return [{
    stack: documentos.map(d => ({
      text: [{ text: `${d.name}: `, bold: true }, { text: 'Abrir PDF', link: d.url, style: 'link' }],
      margin: [0, 1, 0, 1],
    })),
  }];
}

// Bloque de firma de conformidad (imagen base64 + nombre).
function firmaBlock(firmaDataUrl: string | null, aspNombre: string): Content {
  const firmaNode: Content = firmaDataUrl
    ? { image: firmaDataUrl, fit: [200, 80], alignment: 'center', margin: [0, 0, 0, 6] }
    : { text: 'Sin firma', style: 'muted', alignment: 'center', margin: [0, 30, 0, 6] };

  return {
    stack: [
      firmaNode,
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 220, y2: 0, lineWidth: 1, lineColor: '#6b7280' }], alignment: 'center' },
      { text: aspNombre || '—', style: 'photoLabel', alignment: 'center', margin: [0, 6, 0, 0] },
      { text: 'Nombre y firma de conformidad (ASP)', style: 'photoLabel', alignment: 'center' },
    ],
    margin: [0, 6, 0, 0],
  };
}

export function buildValidacionPdf(data: ValidacionViewModel): TDocumentDefinitions {
  const content: Content[] = [];

  // Título
  content.push({ text: 'GASO - Validación de Material', style: 'docTitle' });
  content.push({ text: `${data.tipoTxt} · ${data.folio}`, style: 'docSubtitle', margin: [0, 0, 0, 4] });

  if (data.cancelada) {
    content.push({ text: 'REGISTRO CANCELADO', color: COLORS.danger, bold: true, alignment: 'center', margin: [0, 0, 0, 12] });
  } else {
    content.push({ text: '', margin: [0, 0, 0, 12] });
  }

  // Información general
  content.push(sectionTitle('Información general'));
  content.push(fieldRow([field('Folio', data.folio), field('Tipo', data.tipoTxt), field('Fecha', data.fechaTxt)]));
  content.push(fieldRow([field('Proyecto', data.proyecto), field('Tipo de material', data.tipoMaterial)]));
  content.push(fieldRow([field('Sitio', `${data.idSitio} - ${data.nombreSitio}`.trim()), field('Cuenta cliente', data.cuentaCliente)]));
  content.push(fieldRow([field('Región', data.regionTxt), field('Carrier', data.carrierTxt), field('Almacén destino', data.almacenDestino)]));
  content.push(fieldRow([field('Responsable', data.responsable), field('Correo', data.correo)]));
  content.push(fieldRow([field('Placas del transporte', data.placasTransporte), field('Total de piezas', data.totalPiezas), field('N.º de tarimas', data.numTarimas)]));
  content.push(fieldRow([field('Fecha de captura', data.fechaCapturaTxt), field('Última edición', data.fechaEdicionTxt)]));

  // Contacto / ASP
  content.push(sectionTitle('Contacto y ASP'));
  content.push(fieldRow([field('ASP (firma)', data.aspNombre), field('Nombre de contacto', data.nombreContacto)]));

  // Piezas por motivo
  if (data.piezasMotivo.length) {
    content.push(sectionTitle('Piezas por motivo'));
    content.push(piezasTable(data.piezasMotivo, 'Motivo'));
  }

  // Piezas por estado físico
  if (data.piezasEstadoF.length) {
    content.push(sectionTitle('Piezas por estado físico'));
    content.push(piezasTable(data.piezasEstadoF, 'Estado físico'));
  }

  // Notas
  if (data.notas) {
    content.push(sectionTitle('Notas'));
    content.push(fieldFull('Observaciones', data.notas));
  }

  // Fotografías
  content.push(sectionTitle('Fotografías'));
  content.push(...fotosContent(data.fotos));

  // Tarimas
  const tarimas = tarimasContent(data.tarimas);

  if (tarimas.length) {
    content.push(sectionTitle('Tarimas'));
    content.push(...tarimas);
  }

  // Documentos
  const documentos = documentosContent(data.documentos);

  if (documentos.length) {
    content.push(sectionTitle('Documentos'));
    content.push(...documentos);
  }

  // Firma
  content.push(sectionTitle('Conformidad'));
  content.push(firmaBlock(data.firmaDataUrl, data.aspNombre));

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
  };
}
