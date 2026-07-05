-- =====================================================================
-- Migration:       20260624_create_security_rbac.sql
--
-- Card:            [S2] - RBAC: Implementar roles y permisos por tenant
--
-- Purpose:         Esquema de permisos por tenant en Security.* + RLS reusando
--                  el predicado de S1 (Security.fn_SecurityPredicate).
--
-- Reglas:          Forward-only. Idempotente (re-ejecutable). Sin DROP.
--                  SQL crudo: RLS / SECURITY POLICY no son expresables en Prisma;
--                  NO pasa por `prisma migrate`. Vive en scripts/sql/*.
--
-- Depende de S1:   esquema [Security] y Security.fn_SecurityPredicate(@TenantID uniqueidentifier).
-- =====================================================================

-- 1) Catalogo GLOBAL de vistas (sin TenantID, sin RLS)
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'Security' AND t.name = 'Views'
)
BEGIN
  CREATE TABLE Security.Views (
    ViewCode  varchar(64)   NOT NULL,          -- codigo acunado en el seed (lowercase canonico)
    Label     nvarchar(150) NOT NULL,
    MenuGroup varchar(20)   NULL,              -- p.ej. d_principal, almacen (Cat_Modulos.Variable)

    CONSTRAINT PK_Security_Views PRIMARY KEY CLUSTERED (ViewCode)
  )
END
GO

-- 2) Disponibilidad/excepcion por tenant (decision A) — metadata de plataforma, SIN RLS.
--    Sin filas para una vista = global; con filas = acotada a esos tenants. La escribe
--    el super-admin (apps/admin) sin contexto de tenant; la resolucion la lee cross-tenant.
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'Security' AND t.name = 'TenantViews'
)
BEGIN
  CREATE TABLE Security.TenantViews (
    TenantID uniqueidentifier NOT NULL,
    ViewCode varchar(64)      NOT NULL,

    CONSTRAINT PK_Security_TenantViews PRIMARY KEY CLUSTERED (TenantID, ViewCode),
    CONSTRAINT FK_TenantViews_Views   FOREIGN KEY (ViewCode)
      REFERENCES Security.Views (ViewCode),
    CONSTRAINT FK_TenantViews_Tenants FOREIGN KEY (TenantID)
      REFERENCES Security.Tenants (TenantID)
  )
END
GO

-- 3) Techo por DEPARTAMENTO (tenant-scoped, RLS). PermMask = mascara CRUD canonica.
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'Security' AND t.name = 'DepartmentViews'
)
BEGIN
  CREATE TABLE Security.DepartmentViews (
    TenantID       uniqueidentifier NOT NULL,
    IdDepartamento int              NOT NULL,
    ViewCode       varchar(64)      NOT NULL,
    PermMask       tinyint          NOT NULL,

    CONSTRAINT PK_Security_DepartmentViews PRIMARY KEY CLUSTERED (TenantID, IdDepartamento, ViewCode),
    CONSTRAINT FK_DeptViews_Views   FOREIGN KEY (ViewCode)
      REFERENCES Security.Views (ViewCode),
    CONSTRAINT FK_DeptViews_Tenants FOREIGN KEY (TenantID)
      REFERENCES Security.Tenants (TenantID),
    CONSTRAINT FK_DeptViews_Depto   FOREIGN KEY (IdDepartamento)
      REFERENCES dbo.GASOCO_RH_Departamento (IdDepartamento),
    -- Canonicidad (W|U|D)=>R en BD; mascaras validas (9 de 16). Espejo de isCanonical() en app.
    CONSTRAINT CK_DeptViews_Canonical CHECK (PermMask IN (0,1,3,5,7,9,11,13,15))
  )
END
GO

-- 4) Grant por USUARIO (tenant-scoped, RLS).
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'Security' AND t.name = 'UserViews'
)
BEGIN
  CREATE TABLE Security.UserViews (
    TenantID  uniqueidentifier NOT NULL,
    IdUsuario int              NOT NULL,
    ViewCode  varchar(64)      NOT NULL,
    PermMask  tinyint          NOT NULL,

    CONSTRAINT PK_Security_UserViews PRIMARY KEY CLUSTERED (TenantID, IdUsuario, ViewCode),
    CONSTRAINT FK_UserViews_Views   FOREIGN KEY (ViewCode)
      REFERENCES Security.Views (ViewCode),
    CONSTRAINT FK_UserViews_Tenants FOREIGN KEY (TenantID)
      REFERENCES Security.Tenants (TenantID),
    CONSTRAINT FK_UserViews_Usuario FOREIGN KEY (IdUsuario)
      REFERENCES dbo.GASOCO_Cat_Usuarios (IdUsuario),
    CONSTRAINT CK_UserViews_Canonical CHECK (PermMask IN (0,1,3,5,7,9,11,13,15))
  )
END
GO

-- 5) RLS: politica DEDICADA para las tablas con mascara (no toca la politica de S1).
--    FILTER => aisla lectura/edicion por tenant. BLOCK => impide escribir filas de otro
--    tenant (defensa contra inyeccion cross-tenant en techos/grants).
--    CREATE SECURITY POLICY debe ser el primer statement de su batch (no admite IF/BEGIN),
--    por eso el guard idempotente va con EXEC().
IF NOT EXISTS (
  SELECT 1
  FROM sys.security_policies p
  INNER JOIN sys.schemas s ON s.schema_id = p.schema_id
  WHERE s.name = 'Security' AND p.name = 'SecPol_Rbac'
)
EXEC('
CREATE SECURITY POLICY Security.SecPol_Rbac
    ADD FILTER PREDICATE Security.fn_SecurityPredicate(TenantID) ON Security.DepartmentViews,
    ADD BLOCK  PREDICATE Security.fn_SecurityPredicate(TenantID) ON Security.DepartmentViews,
    ADD FILTER PREDICATE Security.fn_SecurityPredicate(TenantID) ON Security.UserViews,
    ADD BLOCK  PREDICATE Security.fn_SecurityPredicate(TenantID) ON Security.UserViews
    WITH (STATE = ON);
');
GO

-- 6) Com
-- (a) 4 tablas creadas
SELECT name FROM sys.tables
WHERE schema_id = SCHEMA_ID('Security')
  AND name IN ('Views','TenantViews','DepartmentViews','UserViews');

-- (b) Politica ON y predicados ligados SOLO a DepartmentViews y UserViews
SELECT p.name, p.is_enabled,
       OBJECT_NAME(sp.target_object_id) AS tabla,
       sp.predicate_type_desc
FROM sys.security_policies p
JOIN sys.security_predicates sp ON sp.object_id = p.object_id
WHERE p.name = 'SecPol_Rbac';


/* =====================================================================
   Migration: 20260626_add_views_public_mask.sql
   Card:      [S2] - RBAC (Paso 6) — vistas publicas
   Purpose:   PublicMask en Security.Views. NULL = vista privada (RBAC normal);
              valor canonico (>0) = vista publica: todos los usuarios la reciben
              con esa mascara sin grant ni techo, sujeta a disponibilidad (TenantViews).
   Reglas:    Forward-only. Idempotente. Aditiva (columna NULL, no rompe filas).
   Nota:      Independiente de 20260626_create_assignable_departments.sql (orden libre).
   ===================================================================== */

IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('Security.Views') AND name = 'PublicMask'
)
BEGIN
  ALTER TABLE Security.Views
    ADD PublicMask tinyint NULL
        CONSTRAINT CK_Views_PublicMask
        CHECK (PublicMask IS NULL OR PublicMask IN (1,3,5,7,9,11,13,15))
END
GO
