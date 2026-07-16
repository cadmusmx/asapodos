# Guía: Proteger Rutas y Vistas con RBAC

> Documento de referencia del repositorio. Describe cómo proteger una **API Route** o una **página/vista** del ERP con el sistema RBAC de Gaso-SaaS. Pensado para que cualquier integrante del equipo pueda blindar una ruta nueva (o auditar una existente) sin haber participado en el diseño original.

---

## 1. Qué es el RBAC aquí y qué problema resuelve

El RBAC (Role-Based Access Control) de este proyecto responde una sola pregunta, server-side y de forma autoritativa:

> **¿Este usuario, en este tenant, puede ejecutar esta acción sobre esta vista?**

No es un sistema de "roles nombrados". Las reglas viven como **datos** en el esquema `Security.*`, y el código solo las *resuelve*. Una "vista" (`ViewCode`) es una capacidad protegible (p. ej. `inventory`, `audit`, `permissions_access`). Un usuario tiene un **permiso** sobre una vista expresado como un **bitmask** de acciones.

### Bitmask de permisos (invariante, nunca reordenar)

| Bit | Valor | Acción |
|-----|-------|--------|
| R   | 1     | Read   |
| W   | 2     | Write (crear) |
| U   | 4     | Update |
| D   | 8     | Delete |

Regla: cualquiera de `W`, `U`, `D` **requiere** `R`. Máscaras canónicas válidas: `0, 1, 3, 5, 7, 9, 11, 13, 15`. (`0` = sin acceso.)

### Cómo se resuelve un permiso (resumen mental)

El permiso efectivo de un usuario sobre una vista es la **unión** de:

1. **Otorgado**: `UserViews.PermMask` — el grant del usuario sobre la vista, directo (sin techo por departamento). La diferenciación entre usuarios vive aquí, por usuario.
2. **Público**: `Security.Views.PublicMask` — si la vista es pública, todos los usuarios del tenant la reciben con esa máscara, sin necesidad de grant.

Sobre esa unión se aplica una **compuerta de plan**, a nivel **módulo** (`MenuGroup`): una vista solo es accesible si su módulo está incluido en el **plan del tenant**. Esto se combina **por anotación, no por filtro**: `resolveUserViews` es puro (solo `UserViews`/público), y `getEffectiveViews` devuelve las vistas **junto a** `planMenuGroups` (los módulos del plan, vía `getEnabledMenuGroups`). El guard combina ambos y **distingue el motivo**:
- Vista ausente en la resolución → **401/403 por permiso** (no la tienes).
- Vista presente pero su módulo **fuera del plan** → **401/403 por plan** (`PLAN_RESTRICTED`; caso downgrade: el tenant bajó de plan y perdió el módulo).

> Ya **no** hay techo por departamento (`DepartmentViews`) ni disponibilidad por vista (`TenantViews`) — ambos se retiraron. La disponibilidad la gobierna el **plan del tenant** a nivel módulo. Ver el contrato `PERMISOS-PRESETS-RBAC.md` para el modelo completo.

> No necesitas entender la resolución para proteger una ruta. Solo necesitas saber: **el guard te dice sí o no, y tú confías en él.** La copia que el cliente recibe en `/api/me` (`views`, `menuGroups`, `planMenuGroups`) es **solo para pintar UI** — nunca es la autoridad.

---

## 2. Los cuatro pisos de seguridad

Proteger una ruta **no es una sola capa**. Una ruta está segura solo cuando tiene los cuatro pisos. Antes de tocar RBAC, verifica que los pisos 0, 1 y 3 ya estén:

| Piso | Pregunta | Mecanismo |
|------|----------|-----------|
| **0 · Autenticación** | ¿Hay sesión válida? | `withPermission` / `requireViewAccess` lo resuelven |
| **1 · Tenant** | ¿La query está aislada al tenant correcto? | `withTenantContext(tenantId, ...)` |
| **2 · RBAC** | ¿Tiene la vista + bit requerido, y el módulo está en el plan del tenant? | `withPermission` / `requirePermission` |
| **3 · Input** | ¿El SQL está parametrizado? | `$queryRaw` / `Prisma.sql` (NUNCA concatenación) |

> **Advertencia crítica.** Agregar solo el piso 2 (RBAC) a una ruta que no tiene los pisos 0/1/3 da una **falsa sensación de seguridad**. Gatear *quién* llama a una ruta que igual es inyectable o que fuga datos cross-tenant no la hace segura. Si una ruta no tiene auth, ni aislamiento de tenant, ni parametrización, **no se "protege con RBAC": se reconstruye o se elimina.**

---

## 3. Requisitos previos (checklist antes de empezar)

Antes de proteger una ruta o vista, confirma:

- [ ] **La vista existe en el catálogo.** Debe haber una fila en `Security.Views` con el `ViewCode` que vas a usar. Si no existe, créala primero (ver §7).
- [ ] **La ruta es tenant-scoped.** El RBAC de tenant aplica a operaciones *dentro de un tenant*. Operaciones de **plataforma** (super-admin, sin tenant) **no** llevan RBAC de tenant — su autoridad es otra (ver §8).
- [ ] **El middleware resuelve tenant para esa ruta.** El guard lee el tenant de los headers (`x-tenant-id`), que **inyecta el middleware**. Si la ruta está bajo un prefijo excluido del middleware (p. ej. `/api/admin/`), el header no llegará y el guard fallará con `401 "Contexto de tenant no disponible"`. Ver §8.
- [ ] **Los pisos 0/1/3 ya están** (o los vas a agregar en el mismo cambio). Si la ruta usa `$queryRawUnsafe` o concatena strings en SQL, arréglalo en este mismo trabajo.
- [ ] **No estás pisando trabajo en progreso de otra persona.** Si la ruta/vista la está implementando alguien más, coordina antes de blindarla (evita conflictos de merge).

---

## 4. Proteger una API Route (caso estándar)

Para una ruta tenant-scoped normal (un solo tenant, sin cross-tenant), el patrón canónico es el HOF `withPermission`.

### Paso 1 — Envolver el handler

```ts
import { withPermission, PERM } from '@gaso/shared'

export const GET = withPermission(
  'inventory',                 // ViewCode que protege esta ruta
  async (req, { auth, tenantId, mask }) => {
    // auth     -> identidad resuelta (userId, email, tenantId, source)
    // tenantId -> tenant ya validado (úsalo en withTenantContext)
    // mask     -> máscara efectiva del usuario sobre la vista (por si la necesitas)

    // ... tu lógica, usando tenantId ...
  },
  { bit: PERM.R }              // bit requerido (ver Paso 2)
)
```

`withPermission` hace, en orden, antes de ejecutar tu handler:
1. Resuelve la sesión (cookie web o Bearer móvil). Si no hay → `401`.
2. Lee el tenant del header. Si no hay → `401`.
3. Si la sesión trae tenant, exige que coincida con el del header (anti-suplantación de slug). Si no → `403`.
4. Llama `requirePermission(identity, viewCode, bit)`. Si no tiene el permiso → `403`.

Errores de RBAC se traducen automáticamente a 400/401/403. Errores no-RBAC se relanzan para que tu `try/catch` los maneje.

### Paso 2 — Elegir el bit

Por defecto, `withPermission` deriva el bit del verbo HTTP:

| Verbo | Bit por defecto |
|-------|-----------------|
| GET   | R (1) |
| POST  | W (2) |
| PUT / PATCH | U (4) |
| DELETE | D (8) |

Puedes **sobrescribirlo** con `{ bit: PERM.X }` cuando el verbo no refleje la acción real. Ejemplo: un `POST` que *actualiza* permisos usa `{ bit: PERM.U }`, no `W`.

### Paso 3 — Usar el `tenantId` resuelto en las queries

Dentro del handler, usa el `tenantId` que te da el guard, siempre vía `withTenantContext`:

```ts
const data = await withTenantContext(tenantId, async tx => {
  return tx.$queryRaw`
    SELECT ... FROM ...
    WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
  `
})
```

(Sobre `withTenantContext` vs `setTenantContext`, ver §6.)

### Paso 4 — Validar el body manualmente (si aplica)

`withPermission` no valida el cuerpo. Valida la **forma** en la ruta (tipos), deja la **semántica** al servicio. Envuelve `req.json()` en try/catch (lanza si el body no es JSON) y lanza `ValidationError` para los tipos incorrectos (el HOF la traduce a `400`).

---

## 5. Proteger una Página / Vista (server component)

Las páginas no usan `withPermission` (es para handlers con `Request`). Usan el guard equivalente para server components: `requireViewAccess`.

```ts
import { requireViewAccess } from '@/lib/auth/require-view-access'
import { redirect } from 'next/navigation'

const InventoryPage = async (props: { params: Promise<{ lang: Locale }> }) => {
  const { lang } = await props.params

  const access = await requireViewAccess('inventory') // bit R por defecto

  if (!access.ok) {
    // getTargetByReason mapea el motivo al destino: UNAUTHENTICATED -> /login,
    // PLAN_RESTRICTED -> 401 con ?reason=plan (mensaje "tu plan no incluye este módulo"),
    // FORBIDDEN/MISSING_TENANT -> 401 genérico.
    redirect(getLocalizedUrl(getTargetByReason(access.reason), lang))
  }

  return <InventoryView />
}
```

`requireViewAccess(viewCode, bit?)`:
- Resuelve la sesión vía NextAuth y el tenant desde los headers inyectados por el middleware.
- Llama `requirePermission` (misma autoridad que la API), que aplica RBAC **y** la compuerta de plan.
- Devuelve un resultado discriminado (`ok: true | false` con `reason`). Los `reason` posibles: `UNAUTHENTICATED`, `MISSING_TENANT`, `FORBIDDEN` (sin permiso) y `PLAN_RESTRICTED` (módulo fuera del plan del tenant). Usa `getTargetByReason(reason)` para el destino del `redirect` — no ramifiques a mano (las páginas **redirigen**, no devuelven 401/403).

> **El guard de página es defensa en profundidad de UX, NO la protección de los datos.** Evita que se *renderice* el cascarón a quien no debe. Pero **los datos los protege la API**. Una página protegida que llama a una API sin proteger sigue filtrando datos. Protege SIEMPRE la API; la página es complementaria.

### Relación con el menú

El menú (`getVisibleErpNavigation`) ya oculta lo que el usuario no puede ver, leyendo `me.views`/`me.menuGroups`. Pero **ocultar en el menú no protege nada** — es solo UX. Un usuario puede navegar por URL directa a una página que el menú le oculta. Por eso la página **debe** tener su propio `requireViewAccess`, y la API su `withPermission`. El menú, la página y la API deben contar la misma historia, pero solo las dos últimas *autorizan*.

---

## 6. Advertencias técnicas (errores que ya costaron caro)

Estas son trampas reales que han causado bugs en este proyecto. Léelas antes de implementar.

### 6.1 `withTenantContext`, no `setTenantContext`

- **`withTenantContext(tenantId, tx => ...)`**: abre una **transacción con conexión aislada**, fija el `SESSION_CONTEXT` en *esa* conexión, y corre el callback sobre *ese* `tx`. **Úsalo siempre** para lecturas/escrituras RBAC, auditoría y cualquier query bajo RLS.
- **`setTenantContext(tenantId)`** (pooled): fija el contexto sobre una conexión del pool que puede **reusarse en otro request** con el contexto sucio. Riesgo de fuga cross-tenant. **No lo uses** en rutas nuevas.

### 6.2 El contexto debe estar en la MISMA conexión que la query

Un bug crítico ya ocurrido: fijar el contexto en `tx` pero correr la query sobre el `prisma` global (otra conexión del pool). La RLS falla en silencio y devuelve cero filas (o las equivocadas). **Regla:** si fijas contexto en `tx`, todas las queries de esa operación van sobre `tx`, nunca sobre `prisma`.

### 6.3 Solo `$queryRaw` parametrizado

Nunca `$queryRawUnsafe` ni concatenación de strings en SQL. Usa tagged templates (`tx.$queryRaw\`... ${param} ...\``) o `Prisma.sql` + `Prisma.join` para cláusulas componibles. Los valores siempre como `${param}` (parámetro SQL real), jamás interpolados en el string.

### 6.4 Normalización de GUID (casing)

SQL Server devuelve `uniqueidentifier` en **mayúsculas**; los headers/JWT lo traen en **minúsculas**. Normaliza con `.toLowerCase()` en ambos lados antes de comparar tenants.

### 6.5 `isAdmin` no es un bypass

El flag `isAdmin` significa "puede asignar permisos" (autoridad para otorgar), **no** "ve todo". No lo uses como atajo para saltarte el RBAC en la resolución: la autoridad viva es siempre la vista + bit (y el plan). La antigua "red de seguridad" que dejaba pasar `administration` a cualquier admin **se retiró** — hoy el acceso a cualquier módulo, incluido `administration`, es RBAC puro (vista `permissions_access`) combinado con el plan.

### 6.6 El prefijo `/api/admin/` está excluido del middleware

El `matcher` del middleware **excluye `/api/admin/`**. Las rutas ahí **no reciben** `x-tenant-id`. Si pones una ruta tenant-scoped bajo `/api/admin/`, `withPermission` fallará con `401 "Contexto de tenant no disponible"`. **`/api/admin/` es para plataforma/super-admin (sin tenant).** Una ruta de admin-de-tenant va fuera de ese prefijo (p. ej. `/api/<recurso>`).

---

## 7. Crear una vista nueva en el catálogo

Si la capacidad que vas a proteger no tiene `ViewCode`, créala primero. Migración idempotente, forward-only, aplicada manualmente:

```sql
-- scripts/sql/AAAAMMDD_seed_view_<nombre>.sql
IF NOT EXISTS (SELECT 1 FROM Security.Views WHERE ViewCode = 'mi_vista')
BEGIN
  INSERT INTO Security.Views (ViewCode, Label, MenuGroup, PublicMask)
  VALUES ('mi_vista', 'Mi Vista', 'administration', NULL)
END
```

- **`ViewCode`**: identificador estable, `snake_case`. Es el que usarás en `withPermission`/`requireViewAccess` y en el catálogo de navegación (`viewCode` por ítem).
- **`Label`**: texto para la UI de asignación de permisos (no para el menú; el menú usa i18n). Homologa este texto con el del diccionario para la misma vista.
- **`MenuGroup`**: el grupo al que pertenece (debe coincidir 1:1 con `ErpModuleKey`).
- **`PublicMask`**: `NULL` = privada (requiere grant). Un valor canónico (`1,3,...,15`) = pública con esa máscara para todos los usuarios del tenant.

> Si la vista tendrá ítem de menú, recuerda atarla en `erp-navigation.ts` (campo `viewCode` del ítem) para que el menú la muestre solo a quien la tenga.

---

## 8. Clasificar una ruta antes de tocarla

No todas las rutas se protegen igual. Clasifícala en uno de estos baldes:

| Balde | Qué es | Protección |
|-------|--------|------------|
| **RBAC de tenant** | Datos/acciones del ERP dentro de un tenant | `withPermission(view, {bit})` |
| **Solo autenticación** | Requiere sesión pero no una vista específica (p. ej. `/api/me`) | Resolver sesión, sin `requirePermission` |
| **Plataforma / super-admin** | Sin tenant; autoridad de plataforma | Guard de plataforma (NO RBAC de tenant); vive bajo `/api/admin/` |
| **Interna (middleware)** | La llama el middleware, no el usuario (p. ej. `resolve-tenant`) | Secreto compartido / header interno; NO alcanzable desde fuera; NO RBAC |
| **Muerta / plantilla** | Demo de Materio o legacy sin uso | **Eliminar**, no proteger |

> Antes de "proteger" en masa, clasifica. Blindar una ruta muerta es trabajo tirado; "proteger" una ruta de plataforma con RBAC de tenant la rompe; dejar una interna alcanzable desde fuera es un hueco.

---

## 9. Verificación (obligatoria tras implementar)

Para cada ruta/página protegida, verifica los cuatro casos contra la BD real. No se considera "hecho" sin esto.

### Para una API Route

| Caso | Setup | Esperado |
|------|-------|----------|
| **Happy path** | Usuario CON la vista + bit | `200` + datos |
| **Sin permiso** | Usuario SIN la vista (o con bit insuficiente) | `403` "Permiso denegado" |
| **Sin sesión** | Sin cookie/Bearer | `401` |
| **Body inválido** (si aplica) | JSON mal formado o tipos incorrectos | `400` |

```bash
# Ejemplo (ajusta host, token, slug):
curl -i -X GET https://<host>/api/<ruta> \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-tenant-slug: $SLUG" -H "x-origin-id: 3"
```

### Para una Página

| Caso | Setup | Esperado |
|------|-------|----------|
| Con la vista | Usuario CON la vista | Renderiza la página |
| Sin la vista | Usuario SIN la vista | **Redirect** a `401-not-authorized` |
| Sin sesión | Sin sesión | Redirect a `login` |

> El caso "sin la vista → redirect" por **URL directa** es el que cierra el hueco más común: que el menú oculte algo pero la URL siga accesible.

### Sembrar un permiso de prueba (en contexto de tenant, DBeaver)

```sql
DECLARE @T uniqueidentifier = CAST('<tenant-guid>' AS uniqueidentifier);
EXEC sp_SetTenantContext @TenantID = @T;

-- Grant del usuario (directo, sin techo por departamento).
INSERT INTO Security.UserViews (TenantID, IdUsuario, ViewCode, PermMask)
VALUES (@T, <idUsuario>, 'mi_vista', 5);
```

> **El grant solo es efectivo si el módulo de la vista (`Security.Views.MenuGroup`) está en el
> plan del tenant.** Si el plan no incluye ese módulo, el guard responde `PLAN_RESTRICTED` aunque
> exista el `UserViews`. Para pruebas, usa una vista de un módulo que el plan del tenant sí tenga
> (o confirma el plan con `getEnabledMenuGroups` / el `planMenuGroups` de `/api/me`).

---

## 10. Advertencias post-implementación

Después de proteger una ruta o vista, ten presente:

- **Fail-closed por diseño.** Si `/api/me` falla o el usuario no tiene grants, verá menús vacíos / páginas denegadas. Es correcto, no un bug. Para demos, **siembra grants** o usa un usuario representativo; no "abras" la seguridad para que se vea lleno.
- **El menú es consistencia eventual.** Se cachea en sesión; un permiso revocado a media sesión puede seguir mostrándose en el menú hasta el próximo `/api/me`. **No es un hueco**: el guard de página/API es la autoridad viva y rechazará la acción aunque el menú la muestre.
- **Doble apertura de contexto.** `withPermission` (o `requireViewAccess`) abre un `withTenantContext` para el chequeo de permiso, y tu handler abre otro para los datos. Son dos transacciones por request. Es correcto; optimízalo solo si perfilas latencia, nunca preventivamente.
- **No metas autorización en el middleware.** El middleware resuelve **tenant** (identidad), no permisos. La autorización vive en los handlers/páginas. Mezclarlas rompe la separación de capas y duplica lógica.
- **Coordina los cambios compartidos.** Tocar el `matcher` del middleware, mover rutas entre prefijos, o cambiar archivos de `packages/shared` afecta a otros. Avisa a quien corresponda y, idealmente, sepáralo en su propio PR (no lo mezcles con el hardening de una ruta puntual).
- **Verifica el blast radius antes de borrar.** Antes de eliminar una ruta "muerta", confirma con búsqueda en el repo que nada del ERP la consume. Lo que parece legacy a veces tiene un consumidor olvidado.

---

## 11. Verificación de tipos del proyecto

Tras cambios que tocan tipos compartidos (vistas, `ErpModuleKey`, props), corre el chequeo completo — el IDE no muestra errores de archivos que no abriste:

```bash
cd apps/main
pnpm exec tsc --noEmit
```

Debe terminar en 0 errores (o solo errores preexistentes ajenos a tu cambio, que conviene dejar anotados).

---

## Apéndice — Referencias en el código

| Pieza | Ubicación |
|-------|-----------|
| HOF para APIs | `withPermission` (`packages/shared`) |
| Guard para páginas | `requireViewAccess` (`apps/main/src/lib/auth/require-view-access.ts`) |
| Core de permiso (puro) | `requirePermission` (`packages/shared`) |
| Apertura de contexto + anotación de plan | `getEffectiveViews` → `withTenantContext` (devuelve `views` + `planMenuGroups`) (`packages/shared`) |
| Resolución RBAC pura (otorgado + público) | `resolveUserViews` (`packages/shared`) |
| Compuerta de plan (módulos del tenant) | `getEnabledMenuGroups` (`packages/shared/src/lib/plans`) |
| Bitmask y helpers | `permission-mask` (`packages/shared`) |
| Catálogo de navegación + filtro (RBAC ∧ plan) | `erp-navigation.ts` / `erp-access.ts` (`apps/main`) |
| Ruta de referencia (solo-lectura) | `GET /api/audit` |
| Ruta de referencia (lectura + escritura con guardarraíl) | `POST /api/permissions` |
