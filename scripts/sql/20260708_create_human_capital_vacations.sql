/* =====================================================================
   Migration: 20260708_create_human_capital_vacations.sql
   Card:      [S5] - Capital Humano: Implementar control de vacaciones
   Purpose:   Crear control base de vacaciones por tenant con saldos,
              solicitudes, aprobacion/rechazo y auditoria posterior.
   Reglas:    Forward-only. Idempotente. RLS FILTER+BLOCK reusando
              Security.fn_SecurityPredicate sobre TenantID.
   Depende de: Security.Tenants, Security.fn_SecurityPredicate,
               Security.SecPol_Rbac, HumanCapital.Employees.
   ===================================================================== */

-- 1) Schema HumanCapital
IF NOT EXISTS (
  SELECT 1
  FROM sys.schemas
  WHERE name = 'HumanCapital'
)
EXEC('CREATE SCHEMA HumanCapital');
GO

-- 2) Validar dependencia de empleados
IF OBJECT_ID('HumanCapital.Employees') IS NULL
BEGIN
  THROW 51000, 'La tabla HumanCapital.Employees no existe. Ejecuta primero la migracion de empleados.', 1;
END
GO

-- 3) Saldos de vacaciones por empleado y periodo
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'HumanCapital' AND t.name = 'VacationBalances'
)
BEGIN
  CREATE TABLE HumanCapital.VacationBalances (
    BalanceID int IDENTITY(1,1) NOT NULL,
    TenantID uniqueidentifier NOT NULL,
    EmployeeID int NOT NULL,
    PeriodStart date NOT NULL,
    PeriodEnd date NOT NULL,
    AssignedDays decimal(6,2) NOT NULL CONSTRAINT DF_HC_VacationBalances_AssignedDays DEFAULT (0),
    UsedDays decimal(6,2) NOT NULL CONSTRAINT DF_HC_VacationBalances_UsedDays DEFAULT (0),
    Notes nvarchar(500) NULL,
    IsActive bit NOT NULL CONSTRAINT DF_HC_VacationBalances_IsActive DEFAULT (1),
    CreatedAt datetime2(7) NOT NULL CONSTRAINT DF_HC_VacationBalances_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt datetime2(7) NOT NULL CONSTRAINT DF_HC_VacationBalances_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy int NULL,
    UpdatedBy int NULL,

    CONSTRAINT PK_HC_VacationBalances PRIMARY KEY CLUSTERED (TenantID, BalanceID),
    CONSTRAINT FK_HC_VacationBalances_Tenants FOREIGN KEY (TenantID)
      REFERENCES Security.Tenants (TenantID),
    CONSTRAINT FK_HC_VacationBalances_Employees FOREIGN KEY (TenantID, EmployeeID)
      REFERENCES HumanCapital.Employees (TenantID, EmployeeID),
    CONSTRAINT CK_HC_VacationBalances_Period CHECK (PeriodEnd >= PeriodStart),
    CONSTRAINT CK_HC_VacationBalances_AssignedDays CHECK (AssignedDays >= 0),
    CONSTRAINT CK_HC_VacationBalances_UsedDays CHECK (UsedDays >= 0),
    CONSTRAINT CK_HC_VacationBalances_UsedWithinAssigned CHECK (UsedDays <= AssignedDays)
  )
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_HC_VacationBalances_Tenant_Employee_Period'
    AND object_id = OBJECT_ID('HumanCapital.VacationBalances')
)
BEGIN
  CREATE UNIQUE INDEX UX_HC_VacationBalances_Tenant_Employee_Period
    ON HumanCapital.VacationBalances (TenantID, EmployeeID, PeriodStart, PeriodEnd)
    WHERE IsActive = 1
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_HC_VacationBalances_Tenant_Employee_Active'
    AND object_id = OBJECT_ID('HumanCapital.VacationBalances')
)
BEGIN
  CREATE INDEX IX_HC_VacationBalances_Tenant_Employee_Active
    ON HumanCapital.VacationBalances (TenantID, EmployeeID, IsActive)
END
GO

-- 4) Solicitudes de vacaciones
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'HumanCapital' AND t.name = 'VacationRequests'
)
BEGIN
  CREATE TABLE HumanCapital.VacationRequests (
    VacationRequestID int IDENTITY(1,1) NOT NULL,
    TenantID uniqueidentifier NOT NULL,
    EmployeeID int NOT NULL,
    StartDate date NOT NULL,
    EndDate date NOT NULL,
    RequestedDays decimal(6,2) NOT NULL,
    Status varchar(20) NOT NULL CONSTRAINT DF_HC_VacationRequests_Status DEFAULT ('pending'),
    Reason nvarchar(500) NULL,
    ReviewComments nvarchar(500) NULL,
    ReviewedBy int NULL,
    ReviewedAt datetime2(7) NULL,
    CancelledBy int NULL,
    CancelledAt datetime2(7) NULL,
    CancelReason nvarchar(500) NULL,
    CreatedAt datetime2(7) NOT NULL CONSTRAINT DF_HC_VacationRequests_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt datetime2(7) NOT NULL CONSTRAINT DF_HC_VacationRequests_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy int NULL,
    UpdatedBy int NULL,

    CONSTRAINT PK_HC_VacationRequests PRIMARY KEY CLUSTERED (TenantID, VacationRequestID),
    CONSTRAINT FK_HC_VacationRequests_Tenants FOREIGN KEY (TenantID)
      REFERENCES Security.Tenants (TenantID),
    CONSTRAINT FK_HC_VacationRequests_Employees FOREIGN KEY (TenantID, EmployeeID)
      REFERENCES HumanCapital.Employees (TenantID, EmployeeID),
    CONSTRAINT CK_HC_VacationRequests_DateRange CHECK (EndDate >= StartDate),
    CONSTRAINT CK_HC_VacationRequests_RequestedDays CHECK (RequestedDays > 0),
    CONSTRAINT CK_HC_VacationRequests_Status CHECK (Status IN ('pending', 'approved', 'rejected', 'cancelled'))
  )
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_HC_VacationRequests_Tenant_Status'
    AND object_id = OBJECT_ID('HumanCapital.VacationRequests')
)
BEGIN
  CREATE INDEX IX_HC_VacationRequests_Tenant_Status
    ON HumanCapital.VacationRequests (TenantID, Status, CreatedAt DESC)
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_HC_VacationRequests_Tenant_Employee_Status'
    AND object_id = OBJECT_ID('HumanCapital.VacationRequests')
)
BEGIN
  CREATE INDEX IX_HC_VacationRequests_Tenant_Employee_Status
    ON HumanCapital.VacationRequests (TenantID, EmployeeID, Status)
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_HC_VacationRequests_Tenant_Employee_Dates'
    AND object_id = OBJECT_ID('HumanCapital.VacationRequests')
)
BEGIN
  CREATE INDEX IX_HC_VacationRequests_Tenant_Employee_Dates
    ON HumanCapital.VacationRequests (TenantID, EmployeeID, StartDate, EndDate)
END
GO

-- 5) RLS: sumar tablas de vacaciones a la politica existente.
--    ALTER ... ADD debe ir como primer statement de su batch -> guard con EXEC.
IF NOT EXISTS (
  SELECT 1
  FROM sys.security_predicates sp
  INNER JOIN sys.security_policies p ON p.object_id = sp.object_id
  WHERE p.name = 'SecPol_Rbac'
    AND sp.target_object_id = OBJECT_ID('HumanCapital.VacationBalances')
)
EXEC('
ALTER SECURITY POLICY Security.SecPol_Rbac
    ADD FILTER PREDICATE Security.fn_SecurityPredicate(TenantID) ON HumanCapital.VacationBalances,
    ADD BLOCK  PREDICATE Security.fn_SecurityPredicate(TenantID) ON HumanCapital.VacationBalances;
');
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.security_predicates sp
  INNER JOIN sys.security_policies p ON p.object_id = sp.object_id
  WHERE p.name = 'SecPol_Rbac'
    AND sp.target_object_id = OBJECT_ID('HumanCapital.VacationRequests')
)
EXEC('
ALTER SECURITY POLICY Security.SecPol_Rbac
    ADD FILTER PREDICATE Security.fn_SecurityPredicate(TenantID) ON HumanCapital.VacationRequests,
    ADD BLOCK  PREDICATE Security.fn_SecurityPredicate(TenantID) ON HumanCapital.VacationRequests;
');
GO

-- 6) Comprobacion rapida
SELECT s.name AS SchemaName, t.name AS TableName
FROM sys.tables t
INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name = 'HumanCapital'
  AND t.name IN ('VacationBalances', 'VacationRequests');

SELECT p.name,
       p.is_enabled,
       SCHEMA_NAME(o.schema_id) AS SchemaName,
       OBJECT_NAME(sp.target_object_id) AS TableName,
       sp.predicate_type_desc
FROM sys.security_policies p
INNER JOIN sys.security_predicates sp ON sp.object_id = p.object_id
INNER JOIN sys.objects o ON o.object_id = sp.target_object_id
WHERE p.name = 'SecPol_Rbac'
  AND sp.target_object_id IN (
    OBJECT_ID('HumanCapital.VacationBalances'),
    OBJECT_ID('HumanCapital.VacationRequests')
  );
GO
