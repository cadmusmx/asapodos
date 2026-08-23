export interface CatOption { Id: number; Nombre: string };

export interface FormCatalogs {
  marcas: CatOption[];
  colores: CatOption[];
  combustibles: CatOption[];
  tiposVehiculo: CatOption[];
  estatuses: CatOption[];
  estadosPlaca: CatOption[];
  aseguradoras: CatOption[];
  propietarios: CatOption[];
  departamentos: CatOption[];
}

export const EMPTY_CATALOGS: FormCatalogs = {
  marcas: [], colores: [], combustibles: [], tiposVehiculo: [],
  estatuses: [], estadosPlaca: [], aseguradoras: [], propietarios: [], departamentos: [],
};

export interface ConductorOption { id: number; label: string };

// Respuesta de GET /api/fleets/vehicles/[id]
export interface VehicleDetailData {
  IdAuto: number;
  Placa: string | null;
  NoEconomico: string | null;
  SerialVehiculo: string | null;
  SerialMotor: string | null;
  Modelo: string | null;
  Linea: string | null;
  Kilometraje: number;
  Poliza: string | null;
  Ubicacion: string | null;
  Region: number | null;
  Notas: string | null;
  Puertas: number | null;
  Traccion: string | null;
  Marca: number | null; MarcaNombre: string | null;
  Color: number | null; ColorNombre: string | null;
  Combustible: number | null; CombustibleNombre: string | null;
  TipoVehiculo: number | null; TipoVehiculoNombre: string | null;
  Estatus: number | null; EstatusNombre: string | null;
  IdEstadoPlaca: number | null; EstadoPlacaNombre: string | null;
  Empresa: number | null; AseguradoraNombre: string | null;
  Propietario: number | null; PropietarioNombre: string | null;
  Departamento: number | null; DepartamentoNombre: string | null;
  ConductorEmployeeID: number | null; ConductorNombre: string | null; ConductorNumero: string | null;
  FechaVencimientoPoliza: string | null;
  FechaVencimientoTarjeta: string | null;
  FechaVerificacion: string | null;
  FechaProximaVerificacion: string | null;
  VigenciaPoliza: 'VIGENTE' | 'VENCIDA' | null;
  VigenciaTarjeta: 'VIGENTE' | 'VENCIDA' | null;
  VerificacionDiasRestantes: number | null;
  CreatedAt: string;
  UpdatedAt: string | null;
}

// Selects numéricos: number | '' (vacío).
export interface VehicleFormValues {
  placa: string; noEconomico: string; serialVehiculo: string; serialMotor: string;
  modelo: string; linea: string; marca: number | ''; kilometraje: number | '';
  idEstadoPlaca: number | ''; color: number | ''; poliza: string; empresa: number | '';
  fechaVencimientoPoliza: string; estatus: number | ''; departamento: number | '';
  ubicacion: string; region: number | ''; propietario: number | ''; fechaVencimientoTarjeta: string;
  tipoVehiculo: number | ''; fechaVerificacion: string; fechaProximaVerificacion: string;
  combustible: number | ''; notas: string; puertas: number | ''; traccion: string;
  conductor: ConductorOption | null;
}

export const EMPTY_FORM: VehicleFormValues = {
  placa: '', noEconomico: '', serialVehiculo: '', serialMotor: '', modelo: '', linea: '',
  marca: '', kilometraje: '', idEstadoPlaca: '', color: '', poliza: '', empresa: '',
  fechaVencimientoPoliza: '', estatus: '', departamento: '', ubicacion: '', region: '',
  propietario: '', fechaVencimientoTarjeta: '', tipoVehiculo: '', fechaVerificacion: '',
  fechaProximaVerificacion: '', combustible: '', notas: '', puertas: '', traccion: '',
  conductor: null,
};

const toDateInput = (iso: string | null): string => (iso ? iso.slice(0, 10) : '');
const numOrEmpty = (v: number | null): number | '' => (v === null ? '' : v);

// Detalle -> valores del form (para reset()).
export function toFormValues(d: VehicleDetailData): VehicleFormValues {
  return {
    placa: d.Placa ?? '', noEconomico: d.NoEconomico ?? '', serialVehiculo: d.SerialVehiculo ?? '',
    serialMotor: d.SerialMotor ?? '', modelo: d.Modelo ?? '', linea: d.Linea ?? '',
    marca: numOrEmpty(d.Marca), kilometraje: d.Kilometraje ?? '', idEstadoPlaca: numOrEmpty(d.IdEstadoPlaca),
    color: numOrEmpty(d.Color), poliza: d.Poliza ?? '', empresa: numOrEmpty(d.Empresa),
    fechaVencimientoPoliza: toDateInput(d.FechaVencimientoPoliza), estatus: numOrEmpty(d.Estatus),
    departamento: numOrEmpty(d.Departamento), ubicacion: d.Ubicacion ?? '', region: numOrEmpty(d.Region),
    propietario: numOrEmpty(d.Propietario), fechaVencimientoTarjeta: toDateInput(d.FechaVencimientoTarjeta),
    tipoVehiculo: numOrEmpty(d.TipoVehiculo), fechaVerificacion: toDateInput(d.FechaVerificacion),
    fechaProximaVerificacion: toDateInput(d.FechaProximaVerificacion), combustible: numOrEmpty(d.Combustible),
    notas: d.Notas ?? '', puertas: numOrEmpty(d.Puertas), traccion: d.Traccion ?? '',
    conductor: d.ConductorEmployeeID
      ? { id: d.ConductorEmployeeID, label: `${d.ConductorNombre ?? ''}${d.ConductorNumero ? ` (${d.ConductorNumero})` : ''}`.trim() }
      : null,
  };
}

// Valores del form -> body POST/PUT ('' -> null).
export function toPayload(v: VehicleFormValues): Record<string, unknown> {
  const s = (x: string): string | null => (x.trim() === '' ? null : x.trim());
  const n = (x: number | ''): number | null => (x === '' ? null : Number(x));

  return {
    placa: s(v.placa), noEconomico: s(v.noEconomico), serialVehiculo: s(v.serialVehiculo),
    serialMotor: s(v.serialMotor), modelo: s(v.modelo), linea: s(v.linea), marca: n(v.marca),
    kilometraje: n(v.kilometraje), idEstadoPlaca: n(v.idEstadoPlaca), color: n(v.color), poliza: s(v.poliza),
    empresa: n(v.empresa), fechaVencimientoPoliza: s(v.fechaVencimientoPoliza), estatus: n(v.estatus),
    departamento: n(v.departamento), ubicacion: s(v.ubicacion), region: n(v.region), propietario: n(v.propietario),
    fechaVencimientoTarjeta: s(v.fechaVencimientoTarjeta), tipoVehiculo: n(v.tipoVehiculo),
    fechaVerificacion: s(v.fechaVerificacion), fechaProximaVerificacion: s(v.fechaProximaVerificacion),
    combustible: n(v.combustible), notas: s(v.notas), puertas: n(v.puertas), traccion: s(v.traccion),
    conductorEmployeeID: v.conductor?.id ?? null,
  };
}
