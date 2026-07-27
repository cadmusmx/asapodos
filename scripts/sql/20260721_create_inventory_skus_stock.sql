/* =====================================================================
   Migration: 20260721_create_inventory_skus_stock.sql
   Card:      [S4] - Almacenes: Implementar inventario de SKUs y stock

   Purpose:
     Crear la base multitenant del módulo de almacenes e inventario:
       - Catálogo mínimo de almacenes.
       - Catálogo de artículos.
       - Catálogo de SKUs.
       - Existencia actual por tenant, almacén, SKU y estado.

   Reglas:
     - Forward-only.
     - Idempotente y reejecutable.
     - Sin DROP.
     - RLS FILTER + BLOCK mediante Security.fn_SecurityPredicate.
     - Las cantidades no se modificarán directamente desde la UI.
     - Los movimientos transaccionales se implementarán en otra tarjeta.

   Depende de:
     - Security.Tenants.
     - Security.fn_SecurityPredicate.
     - Security.SecPol_Rbac.
   ===================================================================== */

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

/* =========================================================
   1. Validación de dependencias
   ========================================================= */

IF OBJECT_ID('Security.Tenants', 'U') IS NULL
BEGIN
    THROW 51000,
          'La tabla Security.Tenants no existe. Ejecuta primero las migraciones de seguridad.',
          1;
END
GO

IF OBJECT_ID('Security.fn_SecurityPredicate') IS NULL
BEGIN
    THROW 51001,
          'La función Security.fn_SecurityPredicate no existe.',
          1;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.security_policies AS policy
    INNER JOIN sys.schemas AS schemaInfo
        ON schemaInfo.schema_id = policy.schema_id
    WHERE schemaInfo.name = 'Security'
      AND policy.name = 'SecPol_Rbac'
)
BEGIN
    THROW 51002,
          'La política Security.SecPol_Rbac no existe.',
          1;
END
GO

/* =========================================================
   2. Esquemas
   ========================================================= */

IF NOT EXISTS (
    SELECT 1
    FROM sys.schemas
    WHERE name = 'Warehouses'
)
BEGIN
    EXEC('CREATE SCHEMA Warehouses');
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.schemas
    WHERE name = 'Inventory'
)
BEGIN
    EXEC('CREATE SCHEMA Inventory');
END
GO

/* =========================================================
   3. Catálogo base de almacenes
   ========================================================= */

IF OBJECT_ID('Warehouses.Warehouses', 'U') IS NULL
BEGIN
    CREATE TABLE Warehouses.Warehouses (
        WarehouseID int IDENTITY(1,1) NOT NULL,
        TenantID uniqueidentifier NOT NULL,

        Code nvarchar(50) NOT NULL,
        Name nvarchar(150) NOT NULL,
        Region nvarchar(100) NULL,
        Address nvarchar(500) NULL,

        Latitude decimal(9,6) NULL,
        Longitude decimal(9,6) NULL,

        IsActive bit NOT NULL
            CONSTRAINT DF_Warehouses_IsActive DEFAULT (1),

        CreatedAt datetime2(7) NOT NULL
            CONSTRAINT DF_Warehouses_CreatedAt DEFAULT SYSUTCDATETIME(),

        UpdatedAt datetime2(7) NOT NULL
            CONSTRAINT DF_Warehouses_UpdatedAt DEFAULT SYSUTCDATETIME(),

        CreatedBy int NULL,
        UpdatedBy int NULL,

        CONSTRAINT PK_Warehouses
            PRIMARY KEY CLUSTERED (TenantID, WarehouseID),

        CONSTRAINT FK_Warehouses_Tenants
            FOREIGN KEY (TenantID)
            REFERENCES Security.Tenants (TenantID),

        CONSTRAINT CK_Warehouses_Code_NotBlank
            CHECK (LEN(LTRIM(RTRIM(Code))) > 0),

        CONSTRAINT CK_Warehouses_Name_NotBlank
            CHECK (LEN(LTRIM(RTRIM(Name))) > 0),

        CONSTRAINT CK_Warehouses_Latitude
            CHECK (
                Latitude IS NULL
                OR Latitude BETWEEN -90 AND 90
            ),

        CONSTRAINT CK_Warehouses_Longitude
            CHECK (
                Longitude IS NULL
                OR Longitude BETWEEN -180 AND 180
            )
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('Warehouses.Warehouses')
      AND name = 'UX_Warehouses_Tenant_Code'
)
BEGIN
    CREATE UNIQUE INDEX UX_Warehouses_Tenant_Code
        ON Warehouses.Warehouses (TenantID, Code);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('Warehouses.Warehouses')
      AND name = 'IX_Warehouses_Tenant_Active_Name'
)
BEGIN
    CREATE INDEX IX_Warehouses_Tenant_Active_Name
        ON Warehouses.Warehouses (TenantID, IsActive, Name);
END
GO

/* =========================================================
   4. Catálogo de artículos
   ========================================================= */

IF OBJECT_ID('Inventory.Items', 'U') IS NULL
BEGIN
    CREATE TABLE Inventory.Items (
        ItemID int IDENTITY(1,1) NOT NULL,
        TenantID uniqueidentifier NOT NULL,

        Name nvarchar(200) NOT NULL,
        Description nvarchar(1000) NULL,
        Category nvarchar(120) NULL,
        Manufacturer nvarchar(120) NULL,

        IsActive bit NOT NULL
            CONSTRAINT DF_Inventory_Items_IsActive DEFAULT (1),

        CreatedAt datetime2(7) NOT NULL
            CONSTRAINT DF_Inventory_Items_CreatedAt DEFAULT SYSUTCDATETIME(),

        UpdatedAt datetime2(7) NOT NULL
            CONSTRAINT DF_Inventory_Items_UpdatedAt DEFAULT SYSUTCDATETIME(),

        CreatedBy int NULL,
        UpdatedBy int NULL,

        CONSTRAINT PK_Inventory_Items
            PRIMARY KEY CLUSTERED (TenantID, ItemID),

        CONSTRAINT FK_Inventory_Items_Tenants
            FOREIGN KEY (TenantID)
            REFERENCES Security.Tenants (TenantID),

        CONSTRAINT CK_Inventory_Items_Name_NotBlank
            CHECK (LEN(LTRIM(RTRIM(Name))) > 0)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('Inventory.Items')
      AND name = 'IX_Inventory_Items_Tenant_Active_Name'
)
BEGIN
    CREATE INDEX IX_Inventory_Items_Tenant_Active_Name
        ON Inventory.Items (
            TenantID,
            IsActive,
            Name
        )
        INCLUDE (
            Category,
            Manufacturer
        );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('Inventory.Items')
      AND name = 'IX_Inventory_Items_Tenant_Category'
)
BEGIN
    CREATE INDEX IX_Inventory_Items_Tenant_Category
        ON Inventory.Items (
            TenantID,
            Category,
            IsActive
        );
END
GO

/* =========================================================
   5. Catálogo de SKUs
   ========================================================= */

IF OBJECT_ID('Inventory.SKUs', 'U') IS NULL
BEGIN
    CREATE TABLE Inventory.SKUs (
        SkuID int IDENTITY(1,1) NOT NULL,
        TenantID uniqueidentifier NOT NULL,
        ItemID int NOT NULL,

        SkuCode nvarchar(100) NOT NULL,
        ManufacturerPartNumber nvarchar(100) NULL,
        UnitOfMeasure nvarchar(30) NOT NULL
            CONSTRAINT DF_Inventory_SKUs_UnitOfMeasure DEFAULT (N'PIECE'),

        IsSerialized bit NOT NULL
            CONSTRAINT DF_Inventory_SKUs_IsSerialized DEFAULT (0),

        IsLotTracked bit NOT NULL
            CONSTRAINT DF_Inventory_SKUs_IsLotTracked DEFAULT (0),

        IsPalletTracked bit NOT NULL
            CONSTRAINT DF_Inventory_SKUs_IsPalletTracked DEFAULT (0),

        AllowsReverseLogistics bit NOT NULL
            CONSTRAINT DF_Inventory_SKUs_AllowsReverseLogistics DEFAULT (0),

        IsActive bit NOT NULL
            CONSTRAINT DF_Inventory_SKUs_IsActive DEFAULT (1),

        CreatedAt datetime2(7) NOT NULL
            CONSTRAINT DF_Inventory_SKUs_CreatedAt DEFAULT SYSUTCDATETIME(),

        UpdatedAt datetime2(7) NOT NULL
            CONSTRAINT DF_Inventory_SKUs_UpdatedAt DEFAULT SYSUTCDATETIME(),

        CreatedBy int NULL,
        UpdatedBy int NULL,

        CONSTRAINT PK_Inventory_SKUs
            PRIMARY KEY CLUSTERED (TenantID, SkuID),

        CONSTRAINT FK_Inventory_SKUs_Tenants
            FOREIGN KEY (TenantID)
            REFERENCES Security.Tenants (TenantID),

        CONSTRAINT FK_Inventory_SKUs_Items
            FOREIGN KEY (TenantID, ItemID)
            REFERENCES Inventory.Items (TenantID, ItemID),

        CONSTRAINT CK_Inventory_SKUs_Code_NotBlank
            CHECK (LEN(LTRIM(RTRIM(SkuCode))) > 0),

        CONSTRAINT CK_Inventory_SKUs_UnitOfMeasure_NotBlank
            CHECK (LEN(LTRIM(RTRIM(UnitOfMeasure))) > 0)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('Inventory.SKUs')
      AND name = 'UX_Inventory_SKUs_Tenant_Code'
)
BEGIN
    CREATE UNIQUE INDEX UX_Inventory_SKUs_Tenant_Code
        ON Inventory.SKUs (TenantID, SkuCode);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('Inventory.SKUs')
      AND name = 'IX_Inventory_SKUs_Tenant_Item_Active'
)
BEGIN
    CREATE INDEX IX_Inventory_SKUs_Tenant_Item_Active
        ON Inventory.SKUs (
            TenantID,
            ItemID,
            IsActive
        )
        INCLUDE (
            SkuCode,
            ManufacturerPartNumber,
            UnitOfMeasure
        );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('Inventory.SKUs')
      AND name = 'IX_Inventory_SKUs_Tenant_ManufacturerPartNumber'
)
BEGIN
    CREATE INDEX IX_Inventory_SKUs_Tenant_ManufacturerPartNumber
        ON Inventory.SKUs (
            TenantID,
            ManufacturerPartNumber
        )
        WHERE ManufacturerPartNumber IS NOT NULL;
END
GO

/* =========================================================
   6. Existencia actual por almacén y SKU
   ========================================================= */

IF OBJECT_ID('Inventory.InventoryStock', 'U') IS NULL
BEGIN
    CREATE TABLE Inventory.InventoryStock (
        InventoryStockID bigint IDENTITY(1,1) NOT NULL,
        TenantID uniqueidentifier NOT NULL,
        WarehouseID int NOT NULL,
        SkuID int NOT NULL,

        /*
          Código flexible definido por el tenant.

          Ejemplos:
            AVAILABLE
            REFURBISHED
            SCRAP
            SPARE_PART
            REVERSE_LOGISTICS
            QUARANTINE
            DAMAGED

          No se restringe a una lista fija para permitir configuraciones
          distintas entre Ericsson y otros tenants.
        */
        StockStatus varchar(40) NOT NULL
            CONSTRAINT DF_InventoryStock_Status DEFAULT ('AVAILABLE'),

        OnHandQuantity decimal(18,4) NOT NULL
            CONSTRAINT DF_InventoryStock_OnHand DEFAULT (0),

        ReservedQuantity decimal(18,4) NOT NULL
            CONSTRAINT DF_InventoryStock_Reserved DEFAULT (0),

        AvailableQuantity AS (
            OnHandQuantity - ReservedQuantity
        ) PERSISTED,

        RowVersion rowversion NOT NULL,

        CreatedAt datetime2(7) NOT NULL
            CONSTRAINT DF_InventoryStock_CreatedAt DEFAULT SYSUTCDATETIME(),

        UpdatedAt datetime2(7) NOT NULL
            CONSTRAINT DF_InventoryStock_UpdatedAt DEFAULT SYSUTCDATETIME(),

        CreatedBy int NULL,
        UpdatedBy int NULL,

        CONSTRAINT PK_InventoryStock
            PRIMARY KEY CLUSTERED (
                TenantID,
                InventoryStockID
            ),

        CONSTRAINT FK_InventoryStock_Tenants
            FOREIGN KEY (TenantID)
            REFERENCES Security.Tenants (TenantID),

        CONSTRAINT FK_InventoryStock_Warehouses
            FOREIGN KEY (TenantID, WarehouseID)
            REFERENCES Warehouses.Warehouses (
                TenantID,
                WarehouseID
            ),

        CONSTRAINT FK_InventoryStock_SKUs
            FOREIGN KEY (TenantID, SkuID)
            REFERENCES Inventory.SKUs (
                TenantID,
                SkuID
            ),

        CONSTRAINT CK_InventoryStock_Status_NotBlank
            CHECK (LEN(LTRIM(RTRIM(StockStatus))) > 0),

        CONSTRAINT CK_InventoryStock_OnHand_NonNegative
            CHECK (OnHandQuantity >= 0),

        CONSTRAINT CK_InventoryStock_Reserved_NonNegative
            CHECK (ReservedQuantity >= 0),

        CONSTRAINT CK_InventoryStock_ReservedWithinOnHand
            CHECK (ReservedQuantity <= OnHandQuantity)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('Inventory.InventoryStock')
      AND name = 'UX_InventoryStock_Tenant_Warehouse_SKU_Status'
)
BEGIN
    CREATE UNIQUE INDEX UX_InventoryStock_Tenant_Warehouse_SKU_Status
        ON Inventory.InventoryStock (
            TenantID,
            WarehouseID,
            SkuID,
            StockStatus
        );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('Inventory.InventoryStock')
      AND name = 'IX_InventoryStock_Tenant_Warehouse_Status'
)
BEGIN
    CREATE INDEX IX_InventoryStock_Tenant_Warehouse_Status
        ON Inventory.InventoryStock (
            TenantID,
            WarehouseID,
            StockStatus
        )
        INCLUDE (
            SkuID,
            OnHandQuantity,
            ReservedQuantity
        );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID('Inventory.InventoryStock')
      AND name = 'IX_InventoryStock_Tenant_SKU_Status'
)
BEGIN
    CREATE INDEX IX_InventoryStock_Tenant_SKU_Status
        ON Inventory.InventoryStock (
            TenantID,
            SkuID,
            StockStatus
        )
        INCLUDE (
            WarehouseID,
            OnHandQuantity,
            ReservedQuantity
        );
END
GO

/* =========================================================
   7. Row Level Security
   ========================================================= */

IF NOT EXISTS (
    SELECT 1
    FROM sys.security_predicates AS predicateInfo
    INNER JOIN sys.security_policies AS policy
        ON policy.object_id = predicateInfo.object_id
    INNER JOIN sys.schemas AS schemaInfo
        ON schemaInfo.schema_id = policy.schema_id
    WHERE schemaInfo.name = 'Security'
      AND policy.name = 'SecPol_Rbac'
      AND predicateInfo.target_object_id =
          OBJECT_ID('Warehouses.Warehouses')
)
BEGIN
    EXEC('
        ALTER SECURITY POLICY Security.SecPol_Rbac
            ADD FILTER PREDICATE
                Security.fn_SecurityPredicate(TenantID)
                ON Warehouses.Warehouses,

            ADD BLOCK PREDICATE
                Security.fn_SecurityPredicate(TenantID)
                ON Warehouses.Warehouses;
    ');
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.security_predicates AS predicateInfo
    INNER JOIN sys.security_policies AS policy
        ON policy.object_id = predicateInfo.object_id
    INNER JOIN sys.schemas AS schemaInfo
        ON schemaInfo.schema_id = policy.schema_id
    WHERE schemaInfo.name = 'Security'
      AND policy.name = 'SecPol_Rbac'
      AND predicateInfo.target_object_id =
          OBJECT_ID('Inventory.Items')
)
BEGIN
    EXEC('
        ALTER SECURITY POLICY Security.SecPol_Rbac
            ADD FILTER PREDICATE
                Security.fn_SecurityPredicate(TenantID)
                ON Inventory.Items,

            ADD BLOCK PREDICATE
                Security.fn_SecurityPredicate(TenantID)
                ON Inventory.Items;
    ');
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.security_predicates AS predicateInfo
    INNER JOIN sys.security_policies AS policy
        ON policy.object_id = predicateInfo.object_id
    INNER JOIN sys.schemas AS schemaInfo
        ON schemaInfo.schema_id = policy.schema_id
    WHERE schemaInfo.name = 'Security'
      AND policy.name = 'SecPol_Rbac'
      AND predicateInfo.target_object_id =
          OBJECT_ID('Inventory.SKUs')
)
BEGIN
    EXEC('
        ALTER SECURITY POLICY Security.SecPol_Rbac
            ADD FILTER PREDICATE
                Security.fn_SecurityPredicate(TenantID)
                ON Inventory.SKUs,

            ADD BLOCK PREDICATE
                Security.fn_SecurityPredicate(TenantID)
                ON Inventory.SKUs;
    ');
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.security_predicates AS predicateInfo
    INNER JOIN sys.security_policies AS policy
        ON policy.object_id = predicateInfo.object_id
    INNER JOIN sys.schemas AS schemaInfo
        ON schemaInfo.schema_id = policy.schema_id
    WHERE schemaInfo.name = 'Security'
      AND policy.name = 'SecPol_Rbac'
      AND predicateInfo.target_object_id =
          OBJECT_ID('Inventory.InventoryStock')
)
BEGIN
    EXEC('
        ALTER SECURITY POLICY Security.SecPol_Rbac
            ADD FILTER PREDICATE
                Security.fn_SecurityPredicate(TenantID)
                ON Inventory.InventoryStock,

            ADD BLOCK PREDICATE
                Security.fn_SecurityPredicate(TenantID)
                ON Inventory.InventoryStock;
    ');
END
GO

/* =========================================================
   8. Comprobación rápida
   ========================================================= */

SELECT
    schemaInfo.name AS SchemaName,
    tableInfo.name AS TableName
FROM sys.tables AS tableInfo
INNER JOIN sys.schemas AS schemaInfo
    ON schemaInfo.schema_id = tableInfo.schema_id
WHERE schemaInfo.name IN ('Warehouses', 'Inventory')
  AND tableInfo.name IN (
      'Warehouses',
      'Items',
      'SKUs',
      'InventoryStock'
  )
ORDER BY
    schemaInfo.name,
    tableInfo.name;
GO

SELECT
    policy.name AS SecurityPolicy,
    policy.is_enabled,
    OBJECT_SCHEMA_NAME(predicateInfo.target_object_id)
        AS TargetSchema,
    OBJECT_NAME(predicateInfo.target_object_id)
        AS TargetTable,
    predicateInfo.predicate_type_desc
FROM sys.security_policies AS policy
INNER JOIN sys.security_predicates AS predicateInfo
    ON predicateInfo.object_id = policy.object_id
WHERE policy.name = 'SecPol_Rbac'
  AND predicateInfo.target_object_id IN (
      OBJECT_ID('Warehouses.Warehouses'),
      OBJECT_ID('Inventory.Items'),
      OBJECT_ID('Inventory.SKUs'),
      OBJECT_ID('Inventory.InventoryStock')
  )
ORDER BY
    TargetSchema,
    TargetTable,
    predicateInfo.predicate_type_desc;
GO
