/* =====================================================================
   Migration: 20260626_create_assignable_departments.sql
   Card:      [S2] - RBAC: Implementar roles y permisos por tenant (Paso 5)
   Purpose:   Deptos "privilegiados" de delegacion: un admin cuyo depto este
              en este set administra a CUALQUIER usuario del tenant; si no,
              solo a los de su propio depto. La escribe el super-admin.
   Reglas:    Forward-only. Idempotente. RLS (FILTER+BLOCK) reusando
              Security.fn_SecurityPredicate; se SUMA a la politica existente
              SecPol_Rbac via ALTER (no se recrea).
   Depende de: 20260624_create_security_rbac.sql (SecPol_Rbac, fn_SecurityPredicate).
   ===================================================================== */

-- 1) Tabla tenant-scoped
IF NOT EXISTS (
  SELECT 1
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  WHERE s.name = 'Security' AND t.name = 'AssignableDepartments'
)
BEGIN
  CREATE TABLE Security.AssignableDepartments (
    TenantID       uniqueidentifier NOT NULL,
    IdDepartamento int              NOT NULL,

    CONSTRAINT PK_Security_AssignableDepartments PRIMARY KEY CLUSTERED (TenantID, IdDepartamento),
    CONSTRAINT FK_AssignableDepartments_Tenants FOREIGN KEY (TenantID)
      REFERENCES Security.Tenants (TenantID),
    CONSTRAINT FK_AssignableDepartments_Depto FOREIGN KEY (IdDepartamento)
      REFERENCES dbo.GASOCO_RH_Departamento (IdDepartamento)
  )
END
GO

-- 2) RLS: sumar la tabla a la politica dedicada existente (no recrear la politica).
--    ALTER ... ADD debe ser el primer statement de su batch -> guard con EXEC.
IF NOT EXISTS (
  SELECT 1
  FROM sys.security_predicates sp
  INNER JOIN sys.security_policies p ON p.object_id = sp.object_id
  WHERE p.name = 'SecPol_Rbac'
    AND sp.target_object_id = OBJECT_ID('Security.AssignableDepartments')
)
EXEC('
ALTER SECURITY POLICY Security.SecPol_Rbac
    ADD FILTER PREDICATE Security.fn_SecurityPredicate(TenantID) ON Security.AssignableDepartments,
    ADD BLOCK  PREDICATE Security.fn_SecurityPredicate(TenantID) ON Security.AssignableDepartments;
');
GO
