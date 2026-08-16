// Espejo de los catálogos GLOBALES de expediente. Los IDs son fijos y deben
// coincidir exactamente con HumanCapital.DocumentTypes / ContactRelationships.

export type EmployeeDocument =
  | 'ActaNacimiento'
  | 'AcuerdoConfidencial'
  | 'BAjaIMSS'
  | 'CertificadoMedico'
  | 'ComprobanteDomicilio'
  | 'CSFiscal'
  | 'Curp'
  | 'ECBancaria'
  | 'FotoDigital'
  | 'FotoPerfil'
  | 'Ine'
  | 'LicenciaConducir'
  | 'NSS'
  | 'Otro'
  | 'UGEstudios';

export const EMPLOYEE_DOCUMENTS: Record<EmployeeDocument, number> = {
  ActaNacimiento: 1,
  AcuerdoConfidencial: 2,
  BAjaIMSS: 3,
  CertificadoMedico: 4,
  ComprobanteDomicilio: 5,
  CSFiscal: 6,
  Curp: 7,
  ECBancaria: 8,
  FotoDigital: 9,
  FotoPerfil: 10,
  Ine: 11,
  LicenciaConducir: 12,
  NSS: 13,
  Otro: 14,
  UGEstudios: 15
};

// Reconciliado a los valores reales de EmployeeContacts + catch-all 'Otro'.
export type EmployeeRelationship =
  | 'Padre'
  | 'Madre'
  | 'Conyuge'
  | 'Hijo'
  | 'Hermano'
  | 'Suegro'
  | 'Cunado'
  | 'Otro';

export const EMPLOYEE_RELATIONSHIPS: Record<EmployeeRelationship, number> = {
  Padre: 1,
  Madre: 2,
  Conyuge: 3,
  Hijo: 4,
  Hermano: 5,
  Suegro: 6,
  Cunado: 7,
  Otro: 8
};
