/* =====================================================================
   Migration: 20260625_seed_security_views.sql
   Card:      [S2] - RBAC: Implementar roles y permisos por tenant
   Purpose:   Siembra el catalogo GLOBAL de vistas (Security.Views) desde el
              catalogo curado del brief (23 vistas). Codigos normalizados a
              snake_case minusculas; MenuGroup en snake_case.
   Reglas:    Forward-only. Idempotente: INSERT aditivo por ViewCode
              (WHERE NOT EXISTS). NO actualiza ni borra filas existentes.
              Si un Label/MenuGroup cambia a futuro -> migracion explicita aparte.
   Depende de: 20260624_create_security_rbac.sql (tabla Security.Views).
   ===================================================================== */

;WITH src (ViewCode, Label, MenuGroup) AS (
    SELECT v.ViewCode, v.Label, v.MenuGroup
    FROM (VALUES
        ('inventario',               N'Inventario',                    'almacenes'),
        ('inventario_ericsson',      N'Inventario Ericsson',           'almacenes'),
        ('catalogo_almacenes',       N'Catálogo de Almacenes',         'almacenes'),
        ('mapa_almacenes',           N'Mapa de Almacenes',             'almacenes'),
        ('movimientos_inventario',   N'Movimientos de Inventario',     'almacenes'),
        ('validacion_material',      N'Validación de Material',        'almacenes'),
        ('inspeccion_calidad',       N'Inspección de Calidad',         'almacenes'),
        ('catalogo_autos',           N'Catálogo de Autos',             'flotillas'),
        ('catalogo_hallazgos',       N'Catálogo de Hallazgos',         'flotillas'),
        ('gps_vehicular',            N'GPS Vehicular',                 'flotillas'),
        ('gasoline_receipt',         N'Comprobante de Gasolina',       'flotillas'),
        ('responsivas_vehiculares',  N'Responsivas Vehiculares',       'flotillas'),
        ('km_semanal',               N'Kilometraje Semanal',           'flotillas'),
        ('control_gastos_vehicular', N'Control de Gastos Vehiculares', 'flotillas'),
        ('catalogo_usuarios',        N'Catálogo de Usuarios',          'capital_humano'),
        ('catalogo_vacaciones',      N'Catálogo de Vacaciones',        'capital_humano'),
        ('cotizaciones',             N'Cotizaciones',                  'cotizaciones'),
        ('proyectos',                N'Proyectos',                     'proyectos'),
        ('proyectos_finalizados',    N'Proyectos Finalizados',         'proyectos'),
        ('proyectos_gestion',        N'Gestión de Proyectos',          'gestion_proyectos'),
        ('requests_expenses',        N'Solicitudes de Gastos',         'gastos_operacion'),
        ('catalogo_contratistas',    N'Catálogo de Contratistas',      'proveedores'),
        ('roles_permisos',           N'Roles y Permisos',              'administracion')
    ) v(ViewCode, Label, MenuGroup)
)
INSERT INTO Security.Views (ViewCode, Label, MenuGroup)
SELECT s.ViewCode, s.Label, s.MenuGroup
FROM src s
WHERE NOT EXISTS (
    SELECT 1 FROM Security.Views t WHERE t.ViewCode = s.ViewCode
);
GO
