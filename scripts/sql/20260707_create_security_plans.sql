/* =====================================================================
   Migration: 20260707_create_security_plans.sql
   Card:      Commercial Plan System — Phase 1
   Purpose:   Plan definitions, features, tenant subscriptions, usage
              tracking, and billing records for the SaaS commercial model.
   Reglas:    Forward-only. Idempotent (IF NOT EXISTS / MERGE).
              RLS: all new tables added to SecPol_Rbac via ALTER.
   Depende de: 20260624_create_security_rbac.sql (SecPol_Rbac, fn_SecurityPredicate).
   ===================================================================== */

-- 1) Plans =================================================================
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'Security' AND t.name = 'Plans'
)
BEGIN
  CREATE TABLE Security.Plans (
    PlanId          int             IDENTITY(1,1) NOT NULL,
    Name            nvarchar(50)    NOT NULL,  -- basic | professional | enterprise
    DisplayName     nvarchar(100)   NOT NULL,
    Description     nvarchar(500)   NULL,
    MonthlyPrice    decimal(10,2)   NOT NULL,
    MaxUsers        int             NULL,       -- null = unlimited
    MaxBranches     int             NULL,
    StorageMb       int             NULL,
    SupportLevel    nvarchar(20)    NOT NULL,  -- email | priority | dedicated
    HasAdvancedReports bit          NOT NULL DEFAULT 0,
    HasBranding     bit              NOT NULL DEFAULT 0,
    IsActive        bit              NOT NULL DEFAULT 1,
    SortOrder       int              NOT NULL DEFAULT 0,
    CreatedAt       datetime2(7)    NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       datetime2(7)    NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Security_Plans PRIMARY KEY CLUSTERED (PlanId),
    CONSTRAINT UQ_Security_Plans_Name UNIQUE (Name)
  )
END
GO

-- 2) PlanFeatures ==========================================================
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'Security' AND t.name = 'PlanFeatures'
)
BEGIN
  CREATE TABLE Security.PlanFeatures (
    PlanFeatureId   int             IDENTITY(1,1) NOT NULL,
    PlanId          int             NOT NULL,
    FeatureKey      nvarchar(50)    NOT NULL,  -- e.g. dashboard, inventory, quotes
    FeatureValue    nvarchar(max)   NOT NULL,  -- 'true' | 'false' | JSON for complex
    Description     nvarchar(255)   NULL,

    CONSTRAINT PK_Security_PlanFeatures PRIMARY KEY CLUSTERED (PlanFeatureId),
    CONSTRAINT FK_PlanFeatures_Plans FOREIGN KEY (PlanId)
      REFERENCES Security.Plans (PlanId) ON DELETE CASCADE,
    CONSTRAINT UQ_Security_PlanFeatures_PlanKey UNIQUE (PlanId, FeatureKey)
  )
END
GO

-- 3) TenantSubscriptions ==================================================
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'Security' AND t.name = 'TenantSubscriptions'
)
BEGIN
  CREATE TABLE Security.TenantSubscriptions (
    SubscriptionId  uniqueidentifier NOT NULL DEFAULT NEWID(),
    TenantId        uniqueidentifier NOT NULL,
    PlanId          int              NOT NULL,
    Status          nvarchar(20)     NOT NULL DEFAULT 'TRIAL',
                      -- TRIAL | ACTIVE | EXPIRED | CANCELLED
    StartedAt       datetime2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    ExpiresAt       datetime2(7)     NULL,
    AutoRenew       bit              NOT NULL DEFAULT 1,
    CreatedAt       datetime2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    UpdatedAt       datetime2(7)    NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Security_TenantSubscriptions PRIMARY KEY CLUSTERED (SubscriptionId),
    CONSTRAINT FK_TenantSubscriptions_Tenants FOREIGN KEY (TenantId)
      REFERENCES Security.Tenants (TenantId) ON DELETE CASCADE,
    CONSTRAINT FK_TenantSubscriptions_Plans FOREIGN KEY (PlanId)
      REFERENCES Security.Plans (PlanId),
    CONSTRAINT CK_TenantSubscriptions_Status
      CHECK (Status IN ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED'))
  )
END
GO

-- Create stored procedure for TenantSubscriptions (bypasses RLS via EXECUTE AS OWNER)
IF NOT EXISTS (
  SELECT 1 FROM sys.procedures p
  INNER JOIN sys.schemas s ON s.schema_id = p.schema_id
  WHERE s.name = 'Security' AND p.name = 'usp_CreateTenantSubscription'
)
BEGIN
  EXEC('
    CREATE PROCEDURE Security.usp_CreateTenantSubscription
      @TenantId uniqueidentifier,
      @PlanId int,
      @Status nvarchar(20),
      @ExpiresAt datetime2 = NULL,
      @AutoRenew bit = 1
    WITH EXECUTE AS OWNER
    AS
    BEGIN
      INSERT INTO Security.TenantSubscriptions (TenantId, PlanId, Status, ExpiresAt, AutoRenew)
      VALUES (@TenantId, @PlanId, @Status, @ExpiresAt, @AutoRenew)
      SELECT SCOPE_IDENTITY() AS SubscriptionId
    END
  ')
END
GO

-- 4) TenantUsage ==========================================================
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'Security' AND t.name = 'TenantUsage'
)
BEGIN
  CREATE TABLE Security.TenantUsage (
    TenantId        uniqueidentifier NOT NULL,
    MetricKey       nvarchar(50)     NOT NULL,  -- users | branches | storage_mb
    CurrentValue    int              NOT NULL DEFAULT 0,
    UpdatedAt       datetime2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Security_TenantUsage PRIMARY KEY CLUSTERED (TenantId, MetricKey),
    CONSTRAINT FK_TenantUsage_Tenants FOREIGN KEY (TenantId)
      REFERENCES Security.Tenants (TenantId) ON DELETE CASCADE
  )
END
GO

-- 5) BillingRecords =======================================================
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'Security' AND t.name = 'BillingRecords'
)
BEGIN
  CREATE TABLE Security.BillingRecords (
    BillingRecordId  uniqueidentifier NOT NULL DEFAULT NEWID(),
    TenantId         uniqueidentifier NOT NULL,
    SubscriptionId   uniqueidentifier NULL,
    Amount           decimal(10,2)   NOT NULL,
    Currency         nchar(3)        NOT NULL DEFAULT 'USD',
    Status           nvarchar(20)    NOT NULL DEFAULT 'PENDING',
                      -- PENDING | PAID | FAILED | REFUNDED
    PeriodStart      datetime2(7)    NULL,
    PeriodEnd        datetime2(7)    NULL,
    PaidAt           datetime2(7)    NULL,
    Notes            nvarchar(max)   NULL,
    CreatedAt        datetime2(7)    NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT PK_Security_BillingRecords PRIMARY KEY CLUSTERED (BillingRecordId),
    CONSTRAINT FK_BillingRecords_Tenants FOREIGN KEY (TenantId)
      REFERENCES Security.Tenants (TenantId) ON DELETE CASCADE,
    CONSTRAINT FK_BillingRecords_Subscriptions FOREIGN KEY (SubscriptionId)
      REFERENCES Security.TenantSubscriptions (SubscriptionId),
    CONSTRAINT CK_BillingRecords_Status CHECK (Status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED'))
  )
END
GO

-- 6) RLS: add all new tables to SecPol_Rbac ================================
DECLARE @sql nvarchar(max)

-- Plans (read-only catalog — no tenant column, skip RLS)
-- PlanFeatures (read-only catalog)
-- TenantSubscriptions (no RLS — has FK to Tenants and requires platform-level writes)
-- TenantUsage
IF NOT EXISTS (
  SELECT 1 FROM sys.security_predicates sp
  INNER JOIN sys.security_policies p ON p.object_id = sp.object_id
  WHERE p.name = 'SecPol_Rbac'
    AND sp.target_object_id = OBJECT_ID('Security.TenantUsage')
)
BEGIN
  EXEC('
  ALTER SECURITY POLICY Security.SecPol_Rbac
      ADD FILTER PREDICATE Security.fn_SecurityPredicate(TenantId)
        ON Security.TenantUsage,
      ADD BLOCK  PREDICATE Security.fn_SecurityPredicate(TenantId)
        ON Security.TenantUsage;
  ')
END

-- BillingRecords
IF NOT EXISTS (
  SELECT 1 FROM sys.security_predicates sp
  INNER JOIN sys.security_policies p ON p.object_id = sp.object_id
  WHERE p.name = 'SecPol_Rbac'
    AND sp.target_object_id = OBJECT_ID('Security.BillingRecords')
)
BEGIN
  EXEC('
  ALTER SECURITY POLICY Security.SecPol_Rbac
      ADD FILTER PREDICATE Security.fn_SecurityPredicate(TenantId)
        ON Security.BillingRecords,
      ADD BLOCK  PREDICATE Security.fn_SecurityPredicate(TenantId)
        ON Security.BillingRecords;
  ')
END
GO

-- 7) Seed: Plans ===========================================================
MERGE Security.Plans AS target
USING (VALUES
  (N'basic',         N'Basic',         N'Para pequeños equipos que inician.',         29.00, 5,   2,  1024, N'email',    0, 0, 1, 1),
  (N'professional', N'Professional',  N'Para empresas en crecimiento.',               99.00, 20,  10, 10240, N'priority', 1, 1, 1, 2),
  (N'enterprise',    N'Enterprise',   N'Solucion completa sin limites.',            299.00, NULL, NULL, 102400, N'dedicated', 1, 1, 1, 3)
) AS source (Name, DisplayName, Description, MonthlyPrice, MaxUsers, MaxBranches, StorageMb, SupportLevel, HasAdvancedReports, HasBranding, IsActive, SortOrder)
ON target.Name = source.Name
WHEN NOT MATCHED THEN
  INSERT (Name, DisplayName, Description, MonthlyPrice, MaxUsers, MaxBranches, StorageMb, SupportLevel, HasAdvancedReports, HasBranding, IsActive, SortOrder)
  VALUES (source.Name, source.DisplayName, source.Description, source.MonthlyPrice, source.MaxUsers, source.MaxBranches, source.StorageMb, source.SupportLevel, source.HasAdvancedReports, source.HasBranding, source.IsActive, source.SortOrder)
WHEN MATCHED AND target.IsActive = 0 THEN
  UPDATE SET IsActive = 1, MonthlyPrice = source.MonthlyPrice,
             MaxUsers = source.MaxUsers, MaxBranches = source.MaxBranches,
             StorageMb = source.StorageMb, SupportLevel = source.SupportLevel,
             HasAdvancedReports = source.HasAdvancedReports, HasBranding = source.HasBranding,
             DisplayName = source.DisplayName, Description = source.Description;
GO

-- 8) Seed: PlanFeatures ====================================================
DECLARE @basicId     int = (SELECT PlanId FROM Security.Plans WHERE Name = N'basic')
DECLARE @profId     int = (SELECT PlanId FROM Security.Plans WHERE Name = N'professional')
DECLARE @enterpriseId int = (SELECT PlanId FROM Security.Plans WHERE Name = N'enterprise')

-- Module features: 1 = enabled, 0 = disabled
-- Basic: dashboard, warehouses, human_capital only
MERGE Security.PlanFeatures AS target
USING (VALUES
  (@basicId,     N'dashboard',          N'1',     N'Modulo de dashboard'),
  (@basicId,     N'warehouses',         N'1',     N'Modulo de almacenes'),
  (@basicId,     N'human_capital',      N'1',     N'Modulo de capital humano'),
  (@basicId,     N'projects',           N'0',     N'Modulo de proyectos'),
  (@basicId,     N'administration',     N'0',     N'Modulo de administracion'),
  (@basicId,     N'operating_expenses', N'0',     N'Modulo de gastos operativos'),
  (@basicId,     N'quotes',             N'0',     N'Modulo de cotizaciones'),
  (@basicId,     N'suppliers',          N'0',     N'Modulo de proveedores'),
  (@basicId,     N'vehicles',           N'0',     N'Modulo de vehiculos'),
  -- Professional: adds projects, quotes, suppliers, vehicles
  (@profId,      N'dashboard',          N'1',     N'Modulo de dashboard'),
  (@profId,      N'warehouses',         N'1',     N'Modulo de almacenes'),
  (@profId,      N'human_capital',      N'1',     N'Modulo de capital humano'),
  (@profId,      N'projects',           N'1',     N'Modulo de proyectos'),
  (@profId,      N'administration',     N'1',     N'Modulo de administracion'),
  (@profId,      N'operating_expenses', N'1',     N'Modulo de gastos operativos'),
  (@profId,      N'quotes',             N'1',     N'Modulo de cotizaciones'),
  (@profId,      N'suppliers',          N'1',     N'Modulo de proveedores'),
  (@profId,      N'vehicles',           N'1',     N'Modulo de vehiculos'),
  -- Enterprise: all modules enabled
  (@enterpriseId, N'dashboard',         N'1',     N'Modulo de dashboard'),
  (@enterpriseId, N'warehouses',        N'1',     N'Modulo de almacenes'),
  (@enterpriseId, N'human_capital',     N'1',     N'Modulo de capital humano'),
  (@enterpriseId, N'projects',          N'1',     N'Modulo de proyectos'),
  (@enterpriseId, N'administration',   N'1',     N'Modulo de administracion'),
  (@enterpriseId, N'operating_expenses', N'1',    N'Modulo de gastos operativos'),
  (@enterpriseId, N'quotes',            N'1',     N'Modulo de cotizaciones'),
  (@enterpriseId, N'suppliers',         N'1',     N'Modulo de proveedores'),
  (@enterpriseId, N'vehicles',          N'1',     N'Modulo de vehiculos')
) AS source (PlanId, FeatureKey, FeatureValue, Description)
ON target.PlanId = source.PlanId AND target.FeatureKey = source.FeatureKey
WHEN NOT MATCHED THEN
  INSERT (PlanId, FeatureKey, FeatureValue, Description)
  VALUES (source.PlanId, source.FeatureKey, source.FeatureValue, source.Description)
WHEN MATCHED THEN
  UPDATE SET FeatureValue = source.FeatureValue, Description = source.Description;
GO
