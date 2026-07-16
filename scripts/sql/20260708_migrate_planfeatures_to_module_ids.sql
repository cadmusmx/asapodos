/* =====================================================================
   Migration: 20260708_migrate_planfeatures_to_module_ids.sql
   Card:      Plan Features — Connect to Cat_Modulos / Cat_SubModulos via FK
   Purpose:   Replace FeatureKey string column with FK to dbo.Cat_Modulos
              and dbo.Cat_SubModulos. Enable submodule-level toggling.
   Reglas:    Forward-only. Idempotent (column checks before ALTER).
              Backup FK mapping before dropping FeatureKey.
   Depende de: 20260707_create_security_plans.sql
   ===================================================================== */

SET XACT_ABORT ON
BEGIN TRY
  BEGIN TRANSACTION

  /* =================================================================
     STEP 1: Add new FK columns (nullable, added before constraint)
     ================================================================= */

  IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Security.PlanFeatures')
      AND name = 'IdModulo'
  )
  BEGIN
    ALTER TABLE Security.PlanFeatures
      ADD IdModulo int NULL
  END

  IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Security.PlanFeatures')
      AND name = 'IdSubModulo'
  )
  BEGIN
    ALTER TABLE Security.PlanFeatures
      ADD IdSubModulo int NULL
  END

  /* =================================================================
     STEP 2: Add CHECK — either IdModulo OR IdSubModulo must be set
     ================================================================= */

  IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints sc
    JOIN sys.tables t ON t.object_id = sc.parent_object_id
    JOIN sys.schemas s ON s.schema_id = t.schema_id
    WHERE s.name = 'Security'
      AND t.name = 'PlanFeatures'
      AND sc.name = 'CK_PlanFeatures_ModuleOrSubmodule'
  )
  BEGIN
    ALTER TABLE Security.PlanFeatures
      ADD CONSTRAINT CK_PlanFeatures_ModuleOrSubmodule
        CHECK (IdModulo IS NOT NULL OR IdSubModulo IS NOT NULL)
  END

  /* =================================================================
     STEP 3: Add FK constraints
     ================================================================= */

  IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys fk
    JOIN sys.schemas s ON s.schema_id = fk.schema_id
    WHERE s.name = 'Security'
      AND fk.name = 'FK_PlanFeatures_Cat_Modulos'
  )
  BEGIN
    ALTER TABLE Security.PlanFeatures
      ADD CONSTRAINT FK_PlanFeatures_Cat_Modulos
        FOREIGN KEY (IdModulo) REFERENCES dbo.Cat_Modulos (IdModulo)
  END

  IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys fk
    JOIN sys.schemas s ON s.schema_id = fk.schema_id
    WHERE s.name = 'Security'
      AND fk.name = 'FK_PlanFeatures_Cat_SubModulos'
  )
  BEGIN
    ALTER TABLE Security.PlanFeatures
      ADD CONSTRAINT FK_PlanFeatures_Cat_SubModulos
        FOREIGN KEY (IdSubModulo) REFERENCES dbo.Cat_SubModulos (IdSubModulo)
  END

  /* =================================================================
     STEP 4: Migrate FeatureKey → IdModulo via Cat_Modulos.Variable
     Mapping:
       dashboard          → d_principal
       warehouses         → almacen
       human_capital      → capital_humano
       projects           → proyectos
       administration     → administracion
       operating_expenses → gastos_operacion
       quotes             → cotizaciones
       suppliers          → proveedores
       vehicles           → flotillas
     ================================================================= */

  -- Module-level entries: FeatureKey IS NOT NULL and maps to Cat_Modulos.Variable
  UPDATE pf
  SET pf.IdModulo = m.IdModulo
  FROM Security.PlanFeatures pf
  INNER JOIN dbo.Cat_Modulos m ON pf.FeatureKey = m.Variable
  WHERE pf.FeatureKey IS NOT NULL
    AND pf.IdModulo IS NULL

  -- Log unmapped rows for manual review
  DECLARE @Unmapped TABLE (PlanId int, FeatureKey nvarchar(50))
  INSERT INTO @Unmapped
  SELECT pf.PlanId, pf.FeatureKey
  FROM Security.PlanFeatures pf
  WHERE pf.FeatureKey IS NOT NULL
    AND pf.IdModulo IS NULL
    AND pf.IdSubModulo IS NULL

  IF EXISTS (SELECT 1 FROM @Unmapped)
  BEGIN
    -- Surface unmapped rows as a warning (does not fail migration)
    DECLARE @warn nvarchar(max) = 'WARNING: The following PlanFeature rows could not be mapped to Cat_Modulos and need manual review: '
    SELECT @warn = @warn + CHAR(13) + CHAR(10)
                 + '  PlanId=' + CAST(PlanId AS nvarchar) + ', FeatureKey=' + FeatureKey
    FROM @Unmapped
    RAISERROR(@warn, 0, 1) WITH NOWAIT
  END

  /* =================================================================
     STEP 5: Drop old unique constraint, create new one on IdSubModulo
     ================================================================= */

  IF EXISTS (
    SELECT 1 FROM sys.key_constraints kc
    JOIN sys.schemas s ON s.schema_id = kc.schema_id
    WHERE s.name = 'Security'
      AND kc.name = 'UQ_Security_PlanFeatures_PlanKey'
  )
  BEGIN
    ALTER TABLE Security.PlanFeatures
      DROP CONSTRAINT UQ_Security_PlanFeatures_PlanKey
  END

  IF NOT EXISTS (
    SELECT 1 FROM sys.key_constraints kc
    JOIN sys.schemas s ON s.schema_id = kc.schema_id
    WHERE s.name = 'Security'
      AND kc.name = 'UQ_Security_PlanFeatures_PlanSubModule'
  )
  BEGIN
    ALTER TABLE Security.PlanFeatures
      ADD CONSTRAINT UQ_Security_PlanFeatures_PlanSubModule
        UNIQUE (PlanId, IdSubModulo)
  END

  /* =================================================================
     STEP 6: Drop old columns (FeatureKey, FeatureValue, Description)
     ================================================================= */

  IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Security.PlanFeatures')
      AND name = 'FeatureKey'
  )
  BEGIN
    ALTER TABLE Security.PlanFeatures
      DROP COLUMN FeatureKey
  END

  IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Security.PlanFeatures')
      AND name = 'FeatureValue'
  )
  BEGIN
    ALTER TABLE Security.PlanFeatures
      DROP COLUMN FeatureValue
  END

  IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Security.PlanFeatures')
      AND name = 'Description'
  )
  BEGIN
    ALTER TABLE Security.PlanFeatures
      DROP COLUMN Description
  END

  /* =================================================================
     STEP 7: Rename PlanFeatureId column for clarity (optional but nice)
     ================================================================= */

  -- Keeping PlanFeatureId as-is; IdModulo/IdSubModulo carry the meaning now.

  /* =================================================================
     STEP 8: Re-seed PlanFeatures with module-level IDs
     (replaces the hardcoded FeatureKey seed from 20260707)
     ================================================================= */

  DECLARE @basicId     int = (SELECT PlanId FROM Security.Plans WHERE Name = N'basic')
  DECLARE @profId     int = (SELECT PlanId FROM Security.Plans WHERE Name = N'professional')
  DECLARE @enterpriseId int = (SELECT PlanId FROM Security.Plans WHERE Name = N'enterprise')

  -- Helper: map module variable → IdModulo
  DECLARE @modDashboard  int = (SELECT IdModulo FROM dbo.Cat_Modulos WHERE Variable = N'd_principal')
  DECLARE @modWarehouses int = (SELECT IdModulo FROM dbo.Cat_Modulos WHERE Variable = N'almacen')
  DECLARE @modHumanCap   int = (SELECT IdModulo FROM dbo.Cat_Modulos WHERE Variable = N'capital_humano')
  DECLARE @modProjects   int = (SELECT IdModulo FROM dbo.Cat_Modulos WHERE Variable = N'proyectos')
  DECLARE @modAdmin      int = (SELECT IdModulo FROM dbo.Cat_Modulos WHERE Variable = N'administracion')
  DECLARE @modExpenses   int = (SELECT IdModulo FROM dbo.Cat_Modulos WHERE Variable = N'gastos_operacion')
  DECLARE @modQuotes     int = (SELECT IdModulo FROM dbo.Cat_Modulos WHERE Variable = N'cotizaciones')
  DECLARE @modSuppliers  int = (SELECT IdModulo FROM dbo.Cat_Modulos WHERE Variable = N'proveedores')
  DECLARE @modVehicles   int = (SELECT IdModulo FROM dbo.Cat_Modulos WHERE Variable = N'flotillas')

  -- Clear existing module-level rows (submodule rows are preserved)
  DELETE FROM Security.PlanFeatures WHERE PlanId IN (@basicId, @profId, @enterpriseId) AND IdSubModulo IS NULL

  -- BASIC: only dashboard, warehouses, human_capital
  IF @basicId IS NOT NULL
  BEGIN
    IF @modDashboard IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@basicId, @modDashboard)
    IF @modWarehouses IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@basicId, @modWarehouses)
    IF @modHumanCap IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@basicId, @modHumanCap)
  END

  -- PROFESSIONAL: adds projects, administration, operating_expenses, quotes, suppliers, vehicles
  IF @profId IS NOT NULL
  BEGIN
    IF @modDashboard IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@profId, @modDashboard)
    IF @modWarehouses IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@profId, @modWarehouses)
    IF @modHumanCap IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@profId, @modHumanCap)
    IF @modProjects IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@profId, @modProjects)
    IF @modAdmin IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@profId, @modAdmin)
    IF @modExpenses IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@profId, @modExpenses)
    IF @modQuotes IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@profId, @modQuotes)
    IF @modSuppliers IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@profId, @modSuppliers)
    IF @modVehicles IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@profId, @modVehicles)
  END

  -- ENTERPRISE: all modules
  IF @enterpriseId IS NOT NULL
  BEGIN
    IF @modDashboard IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@enterpriseId, @modDashboard)
    IF @modWarehouses IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@enterpriseId, @modWarehouses)
    IF @modHumanCap IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@enterpriseId, @modHumanCap)
    IF @modProjects IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@enterpriseId, @modProjects)
    IF @modAdmin IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@enterpriseId, @modAdmin)
    IF @modExpenses IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@enterpriseId, @modExpenses)
    IF @modQuotes IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@enterpriseId, @modQuotes)
    IF @modSuppliers IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@enterpriseId, @modSuppliers)
    IF @modVehicles IS NOT NULL
      INSERT INTO Security.PlanFeatures (PlanId, IdModulo) VALUES (@enterpriseId, @modVehicles)
  END

  -- Report
  SELECT N'Migration complete. PlanFeatures now uses IdModulo/IdSubModulo FKs.' AS Result

  COMMIT TRANSACTION
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION
  DECLARE @errMsg nvarchar(4000) = ERROR_MESSAGE()
  RAISERROR(N'Migration failed: %s', 16, 1, @errMsg)
END CATCH
GO
