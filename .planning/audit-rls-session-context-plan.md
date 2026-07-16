# Plan: Audit Module RLS Bypass with Tenant-Aware Session Context

## Problem Summary

- `Audit.TransactionLog` has RLS via `Security.PedidosPolicy` using `fn_SecurityPredicate`
- The predicate: `SESSION_CONTEXT(N'TenantID') = @TenantID AND SESSION_CONTEXT(N'TenantID') <> '<excluded-tenant-guid>'` — filters by tenant context, with one tenant always excluded
- `sp_SetTenantContext` (from S1 migration) sets `TenantID` as **read-only** in the session context
- Prisma reuses connections from a pool, so once TenantID is set read-only, it can't be changed
- The admin audit module needs to query TransactionLog with different tenant contexts per request

## Core Architecture Decisions

1. **Tenant filter is mandatory** — no null option for the tenant filter in the UI
2. **Default tenant is resolved from the database** — queried via `ADMIN_DOMAIN` env var, not hardcoded
3. **Session context resets on every SP call** — via a custom SP that sets SESSION_CONTEXT without read-only flag
4. **Separate PrismaClient for admin audit queries** — isolates audit session context from the main app

## Implementation Steps

### Step 1: SQL — Create `sp_SetAuditContext`

Create `scripts/sql/20260630_create_audit_context_procedure.sql`:

```sql
CREATE OR ALTER PROCEDURE Security.sp_SetAuditContext
    @TenantID UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    -- Sets SESSION_CONTEXT WITHOUT read_only flag, allowing subsequent overwrites
    EXEC sys.sp_set_session_context 
        @key = N'TenantID', 
        @value = @TenantID,
        @read_only = 0;
END;
GO
```

**Key difference from `sp_SetTenantContext`**: `@read_only = 0` instead of `@read_only = 1`, so the context can be overwritten on every call.

### Step 2: SQL — Create `Audit.sp_GetGlobalTransactionLog`

Create `scripts/sql/20260630_create_global_audit_procedure.sql`:

```sql
CREATE OR ALTER PROCEDURE Audit.sp_GetGlobalTransactionLog
    @TenantID       NVARCHAR(36),     -- REQUIRED, no default NULL
    @UserID         INT          = NULL,
    @TableName      NVARCHAR(200) = NULL,
    @Action         NVARCHAR(100) = NULL,
    @StartDate      DATETIME2    = NULL,
    @EndDate        DATETIME2    = NULL,
    @AppUser        NVARCHAR(200) = NULL,
    @Page           INT          = 1,
    @PageSize       INT          = 50
AS
BEGIN
    SET NOCOUNT ON;

    -- Reset session context on every call (read_only=0 allows overwrite)
    EXEC Security.sp_SetAuditContext @TenantID = CAST(@TenantID AS UNIQUEIDENTIFIER);

    DECLARE @Offset INT = (@Page - 1) * @PageSize;
    DECLARE @TenantIDGuid UNIQUEIDENTIFIER = CAST(@TenantID AS UNIQUEIDENTIFIER);

    DECLARE @Total INT;
    DECLARE @EntriesJson NVARCHAR(MAX);

    SELECT @Total = COUNT(*)
    FROM Audit.TransactionLog l
    WHERE l.TenantID = @TenantIDGuid
      AND (@UserID IS NULL OR l.UserID = @UserID)
      AND (@TableName IS NULL OR l.TableName = @TableName)
      AND (@Action IS NULL OR l.Action = @Action)
      AND (@StartDate IS NULL OR l.ChangedAt >= @StartDate)
      AND (@EndDate IS NULL OR l.ChangedAt <= @EndDate)
      AND (@AppUser IS NULL OR l.AppUser LIKE '%' + @AppUser + '%');

    SELECT @EntriesJson = (
        SELECT
            l.AuditID,
            l.TenantID AS tenantId,
            l.UserID AS userId,
            l.TableName AS tableName,
            l.Action AS action,
            l.OldData AS oldData,
            l.NewData AS newData,
            l.ChangedAt AS changedAt,
            l.AppUser AS appUser,
            l.IdOrigin AS idOrigin,
            t.CompanyName AS tenantName
        FROM Audit.TransactionLog l
        LEFT JOIN Security.Tenants t ON l.TenantID = t.TenantID
        WHERE l.TenantID = @TenantIDGuid
          AND (@UserID IS NULL OR l.UserID = @UserID)
          AND (@TableName IS NULL OR l.TableName = @TableName)
          AND (@Action IS NULL OR l.Action = @Action)
          AND (@StartDate IS NULL OR l.ChangedAt >= @StartDate)
          AND (@EndDate IS NULL OR l.ChangedAt <= @EndDate)
          AND (@AppUser IS NULL OR l.AppUser LIKE '%' + @AppUser + '%')
        ORDER BY l.ChangedAt DESC
        OFFSET @Offset ROWS FETCH NEXT @PageSize ROWS ONLY
        FOR JSON PATH
    );

    SELECT CONCAT(
        '{"total":', @Total,
        ',"entries":',
        ISNULL(@EntriesJson, '[]'),
        '}'
    ) AS result;
END;
GO
```

### Step 3: TypeScript — Create `prismaAdmin` client

Modify `packages/shared/src/lib/prisma.ts`:
- Add a second `PrismaClient` instance for admin audit queries
- Uses the same `DATABASE_URL` but maintains its own independent connection pool
- Each PrismaClient instance has its own client-side pool, so admin audit connections start fresh

```ts
export const prismaAdmin = 
  globalForPrismaAdmin.prismaAdmin || 
  new PrismaClient()
```

### Step 4: TypeScript — Export `prismaAdmin` from shared

Modify `packages/shared/src/index.ts`:
- Export `prismaAdmin` alongside `prisma`

### Step 5: TypeScript — Resolve admin tenant ID

The admin tenant ID must not be hardcoded. It should be resolved from the database using the existing `ADMIN_DOMAIN` environment variable.

Create `apps/admin/src/services/admin-tenant.ts`:

```ts
import { prisma } from '@gaso/shared'

let cachedAdminTenantId: string | null = null

export async function getAdminTenantId(): Promise<string> {
  if (cachedAdminTenantId) return cachedAdminTenantId

  const adminDomain = process.env.ADMIN_DOMAIN
  if (!adminDomain) {
    throw new Error('ADMIN_DOMAIN environment variable is required')
  }

  const result = await prisma.$queryRaw<[{ TenantID: string }]>`
    SELECT TOP 1 t.TenantID
    FROM Security.Tenants t
    WHERE t.Domain = ${adminDomain}
  `

  if (!result[0]?.TenantID) {
    throw new Error(`No tenant found for ADMIN_DOMAIN: ${adminDomain}`)
  }

  cachedAdminTenantId = result[0].TenantID
  return cachedAdminTenantId
}
```

### Step 6: TypeScript — Update audit-service.ts

Modify `apps/admin/src/services/audit-service.ts`:
- Import `prismaAdmin`
- `getGlobalAuditLog` receives required `tenantId` (no longer optional)
- Uses `prismaAdmin.$queryRawUnsafe()` instead of `prisma.$queryRawUnsafe()`
- If `prismaAdmin` is undefined, throw an error

### Step 7: TypeScript — Update API route

Modify `apps/admin/src/app/api/admin/audit/route.ts`:
- Require `tenantId` query parameter
- Reject requests without it with 400

### Step 8: TypeScript — Update UI components

Modify `apps/admin/src/components/audit/AuditFilters.tsx`:
- Make tenant filter mandatory (remove "clear" / "all tenants" option)
- Default to the admin tenant ID resolved server-side

Modify `apps/admin/src/app/admin/(dashboard)/audit/page.tsx`:
- Call `getAdminTenantId()` to resolve the default tenant
- If no `tenantId` in URL params, default to the resolved admin tenant ID
- Always pass a tenant ID to the API call

## Files Changed

| File | Action |
|------|--------|
| `scripts/sql/20260630_create_audit_context_procedure.sql` | **Create** |
| `scripts/sql/20260630_create_global_audit_procedure.sql` | **Create** |
| `packages/shared/src/lib/prisma.ts` | **Modify** — add prismaAdmin |
| `packages/shared/src/index.ts` | **Modify** — export prismaAdmin |
| `apps/admin/src/services/admin-tenant.ts` | **Create** — resolve admin tenant from DB |
| `apps/admin/src/services/audit-service.ts` | **Modify** — use prismaAdmin, require tenantId |
| `apps/admin/src/app/api/admin/audit/route.ts` | **Modify** — require tenantId param |
| `apps/admin/src/components/audit/AuditFilters.tsx` | **Modify** — mandatory tenant filter |
| `apps/admin/src/app/admin/(dashboard)/audit/page.tsx` | **Modify** — default to admin tenant from DB |

## How Session Context Reset Works

```
Request 1 (tenant A):
  prismaAdmin connection 1 → sp_SetAuditContext(tenant-A) → read_only=0 → context set
  → SP queries with tenant-A context → returns data

Request 2 (tenant B):
  prismaAdmin connection 1 (reused) → sp_SetAuditContext(tenant-B) → read_only=0 → OVERWRITES tenant-A
  → SP queries with tenant-B context → returns data

Request 3 (tenant C):
  prismaAdmin connection 1 (reused) → sp_SetAuditContext(tenant-C) → read_only=0 → OVERWRITES tenant-B
  → SP queries with tenant-C context → returns data
```

The key: `@read_only = 0` in `sp_SetSessionContext` allows overwriting SESSION_CONTEXT on every call, even when Prisma reuses connections from the pool.

## How the Default Tenant Is Resolved

The admin tenant ID is resolved server-side by querying `Security.Tenants` using the existing `ADMIN_DOMAIN` environment variable. This value is cached in-memory after the first lookup. The audit page uses this resolved ID as the default tenant filter value.

No GUID is hardcoded — the tenant ID comes from the database configuration.
