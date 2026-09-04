// interfaces compartidas del módulo PDF (VM + LM). Fuente única: builders,
// prepare-data y composición importan de aquí para no redeclarar.

export interface Foto {
  dataUrl: string | null
  url: string | null
}

export interface Tarima {
  orden: number
  tarima: Foto | null
  papeleta: Foto | null
}

export interface Pieza {
  etiqueta?: string
  piezas?: string
}

// ── VM ──

export interface ValidacionViewModel {
  folio: string
  tipoTxt: string
  fechaTxt: string
  cancelada: boolean
  proyecto: string
  tipoMaterial: string
  idSitio: string
  nombreSitio: string
  cuentaCliente: string
  regionTxt: string
  carrierTxt: string
  almacenDestino: string
  responsable: string
  correo: string
  placasTransporte: string
  totalPiezas: string | number
  numTarimas: string | number
  fechaCapturaTxt: string
  fechaEdicionTxt: string
  aspNombre: string
  nombreContacto: string
  piezasMotivo: Pieza[]
  piezasEstadoF: Pieza[]
  notas: string | null
  fotos: { transporte?: Foto; placas?: Foto; materialEnTransporte?: Foto; materialDescargado?: Foto }
  tarimas: Tarima[]
  documentos: Array<{ name: string; url: string }>
  firmaDataUrl: string | null
}

// Registro de detalle VM que consume el PDF (subconjunto de lo que devuelve getVMDetail).
export interface VMDetailForPdf {
  Folio: string
  ES: boolean | number
  Fecha: unknown
  Cancelada: boolean | number
  Proyecto?: string
  TipoMaterial?: string
  NombreSitio?: string
  IdSitio?: string
  CuentaCliente?: string
  IdRegion?: number | string | null
  IdCarrier?: number | string | null
  Carrier?: string
  OtroCarrier?: string | null
  AlmacenDestino?: string
  Responsable?: string
  Correo?: string
  AspNombre?: string
  NombreContacto?: string
  PlacasTransporte?: string
  TotalPiezas?: number | null
  NumTarimas?: number | null
  Notas?: string | null
  FechaCaptura?: unknown
  FechaEdicion?: unknown
  UsuarioEditor?: string | null
  TransporteFoto?: string | null
  PlacasFoto?: string | null
  MaterialEnTransporteFoto?: string | null
  MaterialDescargadoFoto?: string | null
  AspFirma?: string | null
  Tarimas?: unknown
  MaterialDocumentos?: unknown
  PiezasMotivo?: unknown
  PiezasEstadoF?: unknown
}

// ── LM ──

export interface EvidenciaImg {
  dataUrl: string | null
  url: string | null
  tipo: string
}

export interface EvidenciaDoc {
  tipo: string
  url: string
}

export interface SitioVM {
  titulo: string
  faltante: boolean
  tiposMaterialTxt: string[]
  descripcionMaterial: string
  descripcionFaltantes: string
  incidenciasTxt: string[]
  descripcionIncidencias: string
  evidencias: { imagenes: EvidenciaImg[]; documentos: EvidenciaDoc[] }
  tarimas: Tarima[]
}

export interface LogisticaViewModel {
  folio: string
  tipoTxt: string
  fechaTxt: string
  xdock: string
  carrierTxt: string
  responsable: string
  correo: string
  unidadPlaca: string
  nombreOperador: string
  fechaCreacionTxt: string
  fechaEdicionTxt: string
  llegadaTxt: string
  inicioDescargaTxt: string
  salidaTxt: string
  estadiaTxt: string
  descargaTxt: string
  sitios: SitioVM[]
}
