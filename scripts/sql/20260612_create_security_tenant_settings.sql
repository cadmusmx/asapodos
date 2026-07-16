IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'Security'
    AND t.name = 'TenantSettings'
)
BEGIN
  CREATE TABLE Security.TenantSettings (
    TenantID uniqueidentifier NOT NULL,
    BrandingJson nvarchar(max) NOT NULL
      CONSTRAINT DF_TenantSettings_BrandingJson DEFAULT (N'{"displayName":"","logoUrl":null,"primaryColor":null}'),
    ModulesJson nvarchar(max) NOT NULL
      CONSTRAINT DF_TenantSettings_ModulesJson DEFAULT (N'{"dashboard":true,"warehouses":true,"human-capital":true,"projects":true,"administration":true,"roles":true}'),
    LimitsJson nvarchar(max) NOT NULL
      CONSTRAINT DF_TenantSettings_LimitsJson DEFAULT (N'{"maxUsers":null,"maxStorageMb":null,"maxProjects":null}'),
    CreatedAt datetime2(7) NOT NULL
      CONSTRAINT DF_TenantSettings_CreatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedAt datetime2(7) NOT NULL
      CONSTRAINT DF_TenantSettings_UpdatedAt DEFAULT SYSUTCDATETIME(),
    UpdatedBy int NULL,

    CONSTRAINT PK_TenantSettings PRIMARY KEY CLUSTERED (TenantID),
    CONSTRAINT FK_TenantSettings_Tenants FOREIGN KEY (TenantID)
      REFERENCES Security.Tenants (TenantID),
    CONSTRAINT CK_TenantSettings_BrandingJson_IsJson CHECK (ISJSON(BrandingJson) = 1),
    CONSTRAINT CK_TenantSettings_ModulesJson_IsJson CHECK (ISJSON(ModulesJson) = 1),
    CONSTRAINT CK_TenantSettings_LimitsJson_IsJson CHECK (ISJSON(LimitsJson) = 1)
  )
END
GO

/* ModulesJson ya no forma parte de la configuracion, ahora los "modulos" se resuelven via plan del tenant y se autoriza por rbac
