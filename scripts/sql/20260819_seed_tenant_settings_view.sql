/* =====================================================================
   Migration: <date>_seed_tenant_settings_view.sql
   Card:      Tenant Branding Settings
   Purpose:   Siembra la vista 'tenant_settings' en Security.Views para
              autorizar el acceso a la sección de branding en Ajustes.
   Reglas:    Forward-only. Idempotente: INSERT aditivo por ViewCode
              (WHERE NOT EXISTS). MenuGroup='administration' para que el
              plan gate permita acceso a tenants con el módulo admin.
   Depende de: 20260624_create_security_rbac.sql (tabla Security.Views).
   ===================================================================== */

INSERT INTO Security.Views (ViewCode, Label, MenuGroup)
SELECT 'tenant_settings', N'Tenant Settings', 'administration'
WHERE NOT EXISTS (
    SELECT 1 FROM Security.Views WHERE ViewCode = 'tenant_settings'
);
GO
