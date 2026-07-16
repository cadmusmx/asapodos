/* =====================================================================
   Migration: 20260629_create_human_capital_employees.sql
   Card:      [S5] - Capital Humano: Crear gestion de empleados
   Purpose:   Expediente basico de empleados por tenant con departamento,
              puesto y estado.
   Reglas:    Forward-only. Idempotente. RLS FILTER+BLOCK reusando
              Security.fn_SecurityPredicate sobre TenantID.
   Depende de: Security.Tenants, Security.fn_SecurityPredicate,
               Security.SecPol_Rbac.
   ===================================================================== */

-- 1) Schema HumanCapital
IF NOT EXISTS (
  SELECT 1
  FROM sys.schemas
  WHERE name = 'HumanCapital'
)
EXEC('CREATE SCHEMA HumanCapital');
GO

-- 2) Catalogo de departamentos por tenant
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'HumanCapital' AND t.name = 'Departments'
)
BEGIN
  CREATE TABLE HumanCapital.Departments (
    DepartmentID int IDENTITY(1,1) NOT NULL,
    TenantID uniqueidentifier NOT NULL,
    Name nvarchar(150) NOT NULL,
    Description nvarchar(500) NULL,
    IsActive bit NOT NULL CONSTRAINT DF_HC_Departments_IsActive DEFAULT (1),
    CreatedAt datetime2(7) NOT NULL CONSTRAINT DF_HC_Departments_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt datetime2(7) NOT NULL CONSTRAINT DF_HC_Departments_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy int NULL,
    UpdatedBy int NULL,

    CONSTRAINT PK_HC_Departments PRIMARY KEY CLUSTERED (TenantID, DepartmentID),
    CONSTRAINT FK_HC_Departments_Tenants FOREIGN KEY (TenantID)
      REFERENCES Security.Tenants (TenantID),
    CONSTRAINT CK_HC_Departments_Name_NotBlank CHECK (LEN(LTRIM(RTRIM(Name))) > 0)
  )
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_HC_Departments_Tenant_Name'
    AND object_id = OBJECT_ID('HumanCapital.Departments')
)
BEGIN
  CREATE UNIQUE INDEX UX_HC_Departments_Tenant_Name
    ON HumanCapital.Departments (TenantID, Name)
END
GO

-- 3) Catalogo de puestos por tenant
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'HumanCapital' AND t.name = 'Positions'
)
BEGIN
  CREATE TABLE HumanCapital.Positions (
    PositionID int IDENTITY(1,1) NOT NULL,
    TenantID uniqueidentifier NOT NULL,
    DepartmentID int NULL,
    Name nvarchar(150) NOT NULL,
    Description nvarchar(500) NULL,
    IsActive bit NOT NULL CONSTRAINT DF_HC_Positions_IsActive DEFAULT (1),
    CreatedAt datetime2(7) NOT NULL CONSTRAINT DF_HC_Positions_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt datetime2(7) NOT NULL CONSTRAINT DF_HC_Positions_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy int NULL,
    UpdatedBy int NULL,

    CONSTRAINT PK_HC_Positions PRIMARY KEY CLUSTERED (TenantID, PositionID),
    CONSTRAINT FK_HC_Positions_Tenants FOREIGN KEY (TenantID)
      REFERENCES Security.Tenants (TenantID),
    CONSTRAINT FK_HC_Positions_Departments FOREIGN KEY (TenantID, DepartmentID)
      REFERENCES HumanCapital.Departments (TenantID, DepartmentID),
    CONSTRAINT CK_HC_Positions_Name_NotBlank CHECK (LEN(LTRIM(RTRIM(Name))) > 0)
  )
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_HC_Positions_Tenant_Department'
    AND object_id = OBJECT_ID('HumanCapital.Positions')
)
BEGIN
  CREATE INDEX IX_HC_Positions_Tenant_Department
    ON HumanCapital.Positions (TenantID, DepartmentID)
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_HC_Positions_Tenant_Name'
    AND object_id = OBJECT_ID('HumanCapital.Positions')
)
BEGIN
  CREATE UNIQUE INDEX UX_HC_Positions_Tenant_Name
    ON HumanCapital.Positions (TenantID, Name)
END
GO

-- 4) Expediente basico de empleados por tenant
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'HumanCapital' AND t.name = 'Employees'
)
BEGIN
  CREATE TABLE HumanCapital.Employees (
    EmployeeID int IDENTITY(1,1) NOT NULL,
    TenantID uniqueidentifier NOT NULL,
    EmployeeNumber nvarchar(50) NULL,
    FirstName nvarchar(120) NOT NULL,
    LastName nvarchar(120) NOT NULL,
    Email nvarchar(255) NULL,
    Phone nvarchar(50) NULL,
    DepartmentID int NULL,
    PositionID int NULL,
    EmploymentStatus varchar(20) NOT NULL CONSTRAINT DF_HC_Employees_Status DEFAULT ('active'),
    HireDate date NULL,
    TerminationDate date NULL,
    IsActive bit NOT NULL CONSTRAINT DF_HC_Employees_IsActive DEFAULT (1),
    CreatedAt datetime2(7) NOT NULL CONSTRAINT DF_HC_Employees_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt datetime2(7) NOT NULL CONSTRAINT DF_HC_Employees_UpdatedAt DEFAULT SYSUTCDATETIME(),
    CreatedBy int NULL,
    UpdatedBy int NULL,

    CONSTRAINT PK_HC_Employees PRIMARY KEY CLUSTERED (TenantID, EmployeeID),
    CONSTRAINT FK_HC_Employees_Tenants FOREIGN KEY (TenantID)
      REFERENCES Security.Tenants (TenantID),
    CONSTRAINT FK_HC_Employees_Departments FOREIGN KEY (TenantID, DepartmentID)
      REFERENCES HumanCapital.Departments (TenantID, DepartmentID),
    CONSTRAINT FK_HC_Employees_Positions FOREIGN KEY (TenantID, PositionID)
      REFERENCES HumanCapital.Positions (TenantID, PositionID),
    CONSTRAINT CK_HC_Employees_FirstName_NotBlank CHECK (LEN(LTRIM(RTRIM(FirstName))) > 0),
    CONSTRAINT CK_HC_Employees_LastName_NotBlank CHECK (LEN(LTRIM(RTRIM(LastName))) > 0),
    CONSTRAINT CK_HC_Employees_Status CHECK (EmploymentStatus IN ('active', 'inactive', 'on_leave', 'terminated')),
    CONSTRAINT CK_HC_Employees_TerminationDate CHECK (TerminationDate IS NULL OR HireDate IS NULL OR TerminationDate >= HireDate)
  )
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_HC_Employees_Tenant_Status'
    AND object_id = OBJECT_ID('HumanCapital.Employees')
)
BEGIN
  CREATE INDEX IX_HC_Employees_Tenant_Status
    ON HumanCapital.Employees (TenantID, EmploymentStatus, IsActive)
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'IX_HC_Employees_Tenant_Department'
    AND object_id = OBJECT_ID('HumanCapital.Employees')
)
BEGIN
  CREATE INDEX IX_HC_Employees_Tenant_Department
    ON HumanCapital.Employees (TenantID, DepartmentID)
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_HC_Employees_Tenant_EmployeeNumber'
    AND object_id = OBJECT_ID('HumanCapital.Employees')
)
BEGIN
  CREATE UNIQUE INDEX UX_HC_Employees_Tenant_EmployeeNumber
    ON HumanCapital.Employees (TenantID, EmployeeNumber)
    WHERE EmployeeNumber IS NOT NULL
END
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'UX_HC_Employees_Tenant_Email'
    AND object_id = OBJECT_ID('HumanCapital.Employees')
)
BEGIN
  CREATE UNIQUE INDEX UX_HC_Employees_Tenant_Email
    ON HumanCapital.Employees (TenantID, Email)
    WHERE Email IS NOT NULL
END
GO

-- 5) RLS: sumar tablas HumanCapital a la politica existente.
IF NOT EXISTS (
  SELECT 1
  FROM sys.security_predicates sp
  INNER JOIN sys.security_policies p ON p.object_id = sp.object_id
  WHERE p.name = 'SecPol_Rbac'
    AND sp.target_object_id = OBJECT_ID('HumanCapital.Departments')
)
EXEC('
ALTER SECURITY POLICY Security.SecPol_Rbac
    ADD FILTER PREDICATE Security.fn_SecurityPredicate(TenantID) ON HumanCapital.Departments,
    ADD BLOCK  PREDICATE Security.fn_SecurityPredicate(TenantID) ON HumanCapital.Departments;
');
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.security_predicates sp
  INNER JOIN sys.security_policies p ON p.object_id = sp.object_id
  WHERE p.name = 'SecPol_Rbac'
    AND sp.target_object_id = OBJECT_ID('HumanCapital.Positions')
)
EXEC('
ALTER SECURITY POLICY Security.SecPol_Rbac
    ADD FILTER PREDICATE Security.fn_SecurityPredicate(TenantID) ON HumanCapital.Positions,
    ADD BLOCK  PREDICATE Security.fn_SecurityPredicate(TenantID) ON HumanCapital.Positions;
');
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.security_predicates sp
  INNER JOIN sys.security_policies p ON p.object_id = sp.object_id
  WHERE p.name = 'SecPol_Rbac'
    AND sp.target_object_id = OBJECT_ID('HumanCapital.Employees')
)
EXEC('
ALTER SECURITY POLICY Security.SecPol_Rbac
    ADD FILTER PREDICATE Security.fn_SecurityPredicate(TenantID) ON HumanCapital.Employees,
    ADD BLOCK  PREDICATE Security.fn_SecurityPredicate(TenantID) ON HumanCapital.Employees;
');
GO

-- 6) Comprobacion rapida
SELECT s.name AS SchemaName, t.name AS TableName
FROM sys.tables t
INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE s.name = 'HumanCapital'
  AND t.name IN ('Departments', 'Positions', 'Employees');

SELECT p.name, p.is_enabled,
       SCHEMA_NAME(o.schema_id) AS SchemaName,
       OBJECT_NAME(sp.target_object_id) AS TableName,
       sp.predicate_type_desc
FROM sys.security_policies p
INNER JOIN sys.security_predicates sp ON sp.object_id = p.object_id
INNER JOIN sys.objects o ON o.object_id = sp.target_object_id
WHERE p.name = 'SecPol_Rbac'
  AND sp.target_object_id IN (
    OBJECT_ID('HumanCapital.Departments'),
    OBJECT_ID('HumanCapital.Positions'),
    OBJECT_ID('HumanCapital.Employees')
  );
GO
