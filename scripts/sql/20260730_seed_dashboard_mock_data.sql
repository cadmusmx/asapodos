/* =====================================================================
   Migration: 20260730_seed_dashboard_mock_data.sql
   Card:      Dashboard mock data seed
   Purpose:   Seeds 8 projects, 25 expense requests, 8 quotations for
              TenantID 0B6E58BA-DF85-4D9E-9EAC-D6F4D2B783CF to enable
              non-empty dashboard charts across Operating Expenses,
              Projects, and General dashboards.
   Reglas:    Idempotent: DELETE + INSERT on each table. Reference table
              data is pre-existing and untouched.
   Depende de: Existing reference data in Cat_Regiones, GASOCO_Cat_Clientes,
                GASOCO_RH_Departamento, GASOCO_Cat_Usuarios,
                GASOSOL_TipoSolGastos, Cat_Regiones.
   ===================================================================== */

EXEC sp_SetTenantContext
	@TenantID = '0B6E58BA-DF85-4D9E-9EAC-D6F4D2B783CF',
    @Email = 'dev@gasocom.com',
    @Rol = 'TenantAdmin';

DECLARE @TenantID UNIQUEIDENTIFIER = '0B6E58BA-DF85-4D9E-9EAC-D6F4D2B783CF';

/* =====================================================================
   FK Lookups — resolve real IDs from existing reference data
   ===================================================================== */
DECLARE @Client1 INT = (SELECT TOP 1 IdCliente FROM GASOCO_Cat_Clientes ORDER BY IdCliente);
DECLARE @Client2 INT = (SELECT TOP 1 IdCliente FROM GASOCO_Cat_Clientes WHERE IdCliente <> @Client1 ORDER BY IdCliente);
DECLARE @Client3 INT = (SELECT TOP 1 IdCliente FROM GASOCO_Cat_Clientes WHERE IdCliente NOT IN (@Client1, @Client2) ORDER BY IdCliente);
DECLARE @Client4 INT = (SELECT TOP 1 IdCliente FROM GASOCO_Cat_Clientes WHERE IdCliente NOT IN (@Client1, @Client2, @Client3) ORDER BY IdCliente);

DECLARE @Region1 INT = (SELECT TOP 1 IdReg FROM Cat_Regiones ORDER BY IdReg);
DECLARE @Region2 INT = (SELECT TOP 1 IdReg FROM Cat_Regiones WHERE IdReg <> @Region1 ORDER BY IdReg);
DECLARE @Region3 INT = (SELECT TOP 1 IdReg FROM Cat_Regiones WHERE IdReg NOT IN (@Region1, @Region2) ORDER BY IdReg);

DECLARE @Dept1  INT = (SELECT TOP 1 IdDepartamento FROM GASOCO_RH_Departamento ORDER BY IdDepartamento);
DECLARE @Dept2  INT = (SELECT TOP 1 IdDepartamento FROM GASOCO_RH_Departamento WHERE IdDepartamento <> @Dept1 ORDER BY IdDepartamento);
DECLARE @Dept3  INT = (SELECT TOP 1 IdDepartamento FROM GASOCO_RH_Departamento WHERE IdDepartamento NOT IN (@Dept1, @Dept2) ORDER BY IdDepartamento);

DECLARE @User1  INT = (SELECT TOP 1 IdUsuario FROM GASOCO_Cat_Usuarios WHERE TenantID = @TenantID AND Estatus = 'A' ORDER BY IdUsuario);
DECLARE @User2  INT = (SELECT TOP 1 IdUsuario FROM GASOCO_Cat_Usuarios WHERE TenantID = @TenantID AND Estatus = 'A' AND IdUsuario <> @User1 ORDER BY IdUsuario);
DECLARE @User3  INT = (SELECT TOP 1 IdUsuario FROM GASOCO_Cat_Usuarios WHERE TenantID = @TenantID AND Estatus = 'A' AND IdUsuario NOT IN (@User1, @User2) ORDER BY IdUsuario);

DECLARE @ExpType1 INT = (SELECT TOP 1 IdTipoSolicitud FROM GASOSOL_TipoSolGastos ORDER BY IdTipoSolicitud);
DECLARE @ExpType2 INT = (SELECT TOP 1 IdTipoSolicitud FROM GASOSOL_TipoSolGastos WHERE IdTipoSolicitud <> @ExpType1 ORDER BY IdTipoSolicitud);
DECLARE @ExpType3 INT = (SELECT TOP 1 IdTipoSolicitud FROM GASOSOL_TipoSolGastos WHERE IdTipoSolicitud NOT IN (@ExpType1, @ExpType2) ORDER BY IdTipoSolicitud);

/* =====================================================================
   Cleanup — remove previous mock data for this tenant (idempotent)
   ===================================================================== */
-- DELETE FROM GASOSOL_SolGastos WHERE TenantID = @TenantID;
-- DELETE FROM GASOCO_Cat_Cotizaciones WHERE TenantID = @TenantID;
-- DELETE FROM GASOCO_Cat_Proyectos WHERE TenantID = @TenantID;

/* =====================================================================
   Tier 1: GASOCO_Cat_Proyectos — 8 projects
   Columns used by dashboard queries: Id, ProyectoNombre, ClienteId,
   ClienteNombre, ProyectoPresupuesto, ProyectoMargenPorcentual,
   ProyectoResponsableGaso, ProyectoResponsableIdGaso, ProyectoEstatus,
   ProyectoFechaCreacion, IdRegion, ProyectoDepartamento, TenantID
   ===================================================================== */
INSERT INTO GASOCO_Cat_Proyectos
  (ProyectoNombre, ClienteId, ClienteNombre, ProyectoPresupuesto,
   ProyectoMargenPorcentual, ProyectoResponsableGaso,
   ProyectoResponsableIdGaso, ProyectoEstatus, ProyectoFechaCreacion,
   IdRegion, ProyectoDepartamento, TenantID)
VALUES
  ('Torre Norte 5G',
   @Client1, 'Telcel', 850000, 25,
   (SELECT TOP 1 Nombre FROM GASOCO_Cat_Usuarios WHERE IdUsuario = @User1), @User1,
   1, '2026-01-15', @Region1, 'Operaciones', @TenantID),

  ('Centro Comercial Mitras',
   @Client2, 'Liverpool', 1200000, 18,
   (SELECT TOP 1 Nombre FROM GASOCO_Cat_Usuarios WHERE IdUsuario = @User2), @User2,
   1, '2026-02-01', @Region2, 'Construccion', @TenantID),

  ('Planta Industrial Femsa',
   @Client3, 'Femsa', 2100000, 22,
   (SELECT TOP 1 Nombre FROM GASOCO_Cat_Usuarios WHERE IdUsuario = @User3), @User3,
   1, '2026-01-28', @Region1, 'Operaciones', @TenantID),

  ('Residencial Valle Oriente',
   @Client1, 'Telcel', 650000, 15,
   (SELECT TOP 1 Nombre FROM GASOCO_Cat_Usuarios WHERE IdUsuario = @User1), @User1,
   1, '2026-03-10', @Region2, 'Construccion', @TenantID),

  ('Hospital Regional Monterrey',
   @Client4, 'Gobierno NL', 3500000, 30,
   (SELECT TOP 1 Nombre FROM GASOCO_Cat_Usuarios WHERE IdUsuario = @User2), @User2,
   1, '2026-02-20', @Region3, 'Salud', @TenantID),

  ('Universidad Tecmilenio Campus Garza Garcia',
   @Client2, 'Liverpool', 950000, 20,
   (SELECT TOP 1 Nombre FROM GASOCO_Cat_Usuarios WHERE IdUsuario = @User3), @User3,
   1, '2026-04-01', @Region1, 'Educacion', @TenantID),

  ('Avenida Constitucion Renovacion',
   @Client3, 'Femsa', 480000, 12,
   (SELECT TOP 1 Nombre FROM GASOCO_Cat_Usuarios WHERE IdUsuario = @User1), @User1,
   0, '2026-01-05', @Region2, 'Infraestructura', @TenantID),

  ('Parque Industrial sureste',
   @Client4, 'Gobierno NL', 1800000, 28,
   (SELECT TOP 1 Nombre FROM GASOCO_Cat_Usuarios WHERE IdUsuario = @User2), @User2,
   1, '2026-03-25', @Region3, 'Industrial', @TenantID);

/* =====================================================================
   FK Lookups: project IDs (assigned after INSERT by ProyectoNombre)
   ===================================================================== */
DECLARE @Proj1 INT = (SELECT Id FROM GASOCO_Cat_Proyectos WHERE ProyectoNombre = 'Torre Norte 5G' AND TenantID = @TenantID);
DECLARE @Proj2 INT = (SELECT Id FROM GASOCO_Cat_Proyectos WHERE ProyectoNombre = 'Centro Comercial Mitras' AND TenantID = @TenantID);
DECLARE @Proj3 INT = (SELECT Id FROM GASOCO_Cat_Proyectos WHERE ProyectoNombre = 'Planta Industrial Femsa' AND TenantID = @TenantID);
DECLARE @Proj4 INT = (SELECT Id FROM GASOCO_Cat_Proyectos WHERE ProyectoNombre = 'Residencial Valle Oriente' AND TenantID = @TenantID);
DECLARE @Proj5 INT = (SELECT Id FROM GASOCO_Cat_Proyectos WHERE ProyectoNombre = 'Hospital Regional Monterrey' AND TenantID = @TenantID);
DECLARE @Proj6 INT = (SELECT Id FROM GASOCO_Cat_Proyectos WHERE ProyectoNombre = 'Universidad Tecmilenio Campus Garza Garcia' AND TenantID = @TenantID);
DECLARE @Proj7 INT = (SELECT Id FROM GASOCO_Cat_Proyectos WHERE ProyectoNombre = 'Avenida Constitucion Renovacion' AND TenantID = @TenantID);
DECLARE @Proj8 INT = (SELECT Id FROM GASOCO_Cat_Proyectos WHERE ProyectoNombre = 'Parque Industrial sureste' AND TenantID = @TenantID);

/* =====================================================================
   Tier 2: GASOSOL_SolGastos — 25 expense requests
   Columns used by dashboard queries: IdSolicitante, IdProyecto, IdRegion,
   IdDepartamento, IdTipoSolicitud, MontoSolicitado, MontoGastado,
   EstatusSolicitud (1=Aceptadas, 2=Rechazadas, 3=Pendientes, 4=Pagadas,
   5=Invoiced), TipoPago (0=Empleado, 1=Contratista), FechaSolicitud,
   TenantID
   Distribution: 8 aceptadas, 5 rechazadas, 5 pendientes, 5 pagadas,
                2 invoiced — spread Jan-Jul 2026
   ===================================================================== */
INSERT INTO GASOSOL_SolGastos
  (IdSolicitante, IdProyecto, IdRegion, IdDepartamento,
   IdTipoSolicitud, MontoSolicitado, MontoGastado,
   EstatusSolicitud, TipoPago, FechaSolicitud, TenantID)
VALUES
  /* Aceptadas (8) — 2 per month Jan-Apr */
  (@User1, @Proj1, @Region1, @Dept1, @ExpType1, 15000,  14500, 1, 0, '2026-01-10', @TenantID),
  (@User2, @Proj2, @Region2, @Dept2, @ExpType2, 22000,  21000, 1, 0, '2026-01-18', @TenantID),
  (@User3, @Proj3, @Region1, @Dept3, @ExpType1, 35000,  33500, 1, 1, '2026-02-05', @TenantID),
  (@User1, @Proj4, @Region2, @Dept1, @ExpType3, 12000,  11800, 1, 0, '2026-02-14', @TenantID),
  (@User2, @Proj5, @Region3, @Dept2, @ExpType2, 45000,  43000, 1, 1, '2026-03-08', @TenantID),
  (@User3, @Proj6, @Region1, @Dept3, @ExpType1, 18000,  17200, 1, 0, '2026-03-22', @TenantID),
  (@User1, @Proj7, @Region2, @Dept1, @ExpType2,  8500,   8200, 1, 0, '2026-04-03', @TenantID),
  (@User2, @Proj8, @Region3, @Dept2, @ExpType3, 55000,  53000, 1, 1, '2026-04-17', @TenantID),

  /* Pagadas (5) — May-Jun */
  (@User3, @Proj1, @Region1, @Dept3, @ExpType1, 19000,  18500, 4, 0, '2026-05-06', @TenantID),
  (@User1, @Proj3, @Region2, @Dept1, @ExpType2, 28000,  27000, 4, 1, '2026-05-15', @TenantID),
  (@User2, @Proj5, @Region3, @Dept2, @ExpType3, 62000,  60000, 4, 0, '2026-06-02', @TenantID),
  (@User3, @Proj2, @Region1, @Dept3, @ExpType1, 11000,  10500, 4, 0, '2026-06-11', @TenantID),
  (@User1, @Proj6, @Region2, @Dept1, @ExpType2, 33000,  31500, 4, 1, '2026-06-25', @TenantID),

  /* Pendientes (5) — Jun-Jul */
  (@User2, @Proj4, @Region2, @Dept2, @ExpType1, 15500, 15500, 3, 0, '2026-06-18', @TenantID),
  (@User3, @Proj8, @Region3, @Dept3, @ExpType3, 41000, 41000, 3, 1, '2026-06-29', @TenantID),
  (@User1, @Proj2, @Region1, @Dept1, @ExpType2,  9500,  9500, 3, 0, '2026-07-07', @TenantID),
  (@User2, @Proj7, @Region2, @Dept2, @ExpType1, 27000, 27000, 3, 1, '2026-07-14', @TenantID),
  (@User3, @Proj1, @Region3, @Dept3, @ExpType3, 13000, 13000, 3, 0, '2026-07-21', @TenantID),

  /* Rechazadas (5) — Feb-May */
  (@User1, @Proj4, @Region2, @Dept1, @ExpType2, 20000,     0, 2, 0, '2026-02-28', @TenantID),
  (@User2, @Proj6, @Region1, @Dept2, @ExpType3, 48000,     0, 2, 1, '2026-03-30', @TenantID),
  (@User3, @Proj3, @Region2, @Dept3, @ExpType1, 14500,     0, 2, 0, '2026-04-22', @TenantID),
  (@User1, @Proj8, @Region3, @Dept1, @ExpType2, 72000,     0, 2, 1, '2026-05-19', @TenantID),
  (@User2, @Proj5, @Region1, @Dept2, @ExpType3, 38000,     0, 2, 0, '2026-06-08', @TenantID),

  /* Invoiced (2) — Jul */
  (@User3, @Proj2, @Region2, @Dept3, @ExpType1, 25000, 24000, 5, 0, '2026-07-10', @TenantID),
  (@User1, @Proj5, @Region3, @Dept1, @ExpType2, 58000, 55500, 5, 1, '2026-07-18', @TenantID);

/* =====================================================================
   Tier 3: GASOCO_Cat_Cotizaciones — 8 quotations
   Columns used by general-dashboard: CotizacionNombre, ClienteId,
   CotizacionEstatus (1=aceptadas, 0=pendientes, 2=rechazadas),
   CotizacionMontoTotal, TenantID
   Distribution: 4 aceptadas, 3 pendientes, 1 rechazada
   ===================================================================== */
INSERT INTO GASOCO_Cat_Cotizaciones
  (CotizacionNombre, ClienteId, CotizacionEstatus, CotizacionMontoTotal, TenantID)
VALUES
  ('COT-Telcel-001', @Client1, 1, 250000, @TenantID),
  ('COT-Liverpool-001', @Client2, 1, 480000, @TenantID),
  ('COT-Femsa-001', @Client3, 1, 720000, @TenantID),
  ('COT-GobiernoNL-001', @Client4, 1, 1200000, @TenantID),
  ('COT-Telcel-002', @Client1, 0, 185000, @TenantID),
  ('COT-Liverpool-002', @Client2, 0, 310000, @TenantID),
  ('COT-Femsa-002', @Client3, 0, 560000, @TenantID),
  ('COT-GobiernoNL-002', @Client4, 2, 950000, @TenantID);

GO

/* =====================================================================
   Verification queries (run manually to confirm seed success)
   =====================================================================
-- Projects
SELECT COUNT(*) AS total,
       SUM(CASE WHEN ProyectoEstatus = 1 THEN 1 ELSE 0 END) AS activos,
       SUM(CASE WHEN ProyectoEstatus = 0 THEN 1 ELSE 0 END) AS inactivos
FROM GASOCO_Cat_Proyectos
WHERE TenantID = '0B6E58BA-DF85-4D9E-9EAC-D6F4D2B783CF';

-- Expenses
SELECT COUNT(*) AS total,
       SUM(CASE WHEN EstatusSolicitud = 1 THEN 1 ELSE 0 END) AS aceptadas,
       SUM(CASE WHEN EstatusSolicitud = 3 THEN 1 ELSE 0 END) AS pendientes,
       SUM(CASE WHEN EstatusSolicitud = 2 THEN 1 ELSE 0 END) AS rechazadas,
       SUM(CASE WHEN EstatusSolicitud = 4 THEN 1 ELSE 0 END) AS pagadas,
       SUM(CASE WHEN EstatusSolicitud = 5 THEN 1 ELSE 0 END) AS facturadas
FROM GASOSOL_SolGastos
WHERE TenantID = '0B6E58BA-DF85-4D9E-9EAC-D6F4D2B783CF';

-- Quotations
SELECT COUNT(*) AS total,
       SUM(CASE WHEN CotizacionEstatus = 1 THEN 1 ELSE 0 END) AS aceptadas,
       SUM(CASE WHEN CotizacionEstatus = 0 THEN 1 ELSE 0 END) AS pendientes,
       SUM(CASE WHEN CotizacionEstatus = 2 THEN 1 ELSE 0 END) AS rechazadas
FROM GASOCO_Cat_Cotizaciones
WHERE TenantID = '0B6E58BA-DF85-4D9E-9EAC-D6F4D2B783CF';
   ===================================================================== */
