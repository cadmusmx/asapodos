# Super Admin Panel — Architecture Design & Implementation Strategy

> **Staff Engineer Review for Gaso-SaaS Platform**
> Branch: `epic/super-admin-panel`

---

## 0. Executive Summary

The goal is to build a platform control center for SaaS administrators that manages tenants globally. After deep analysis of the codebase, I have identified **critical gaps** that must be resolved BEFORE any admin panel is built, and I am challenging several assumptions in the current proposal.

---

## 1. Architecture Design

### Decision: **Option B — Monorepo with Separate Admin App**

The project already uses **pnpm workspaces** (`pnpm-workspace.yaml`). The admin app will be a new workspace package within the monorepo.

Option A (completely separate repo) was rejected because it forces duplication of NextAuth config, JWT secret management, the Prisma client singleton, and the audit infrastructure. Cross-app operations would become complex HTTP calls instead of direct shared DB access.

Option C (module inside main app) was rejected because the main app middleware resolves tenant context via subdomain on every request. The admin panel has NO tenant and operates globally — injecting that into a tenant-scoped app creates security risk and cognitive dissonance.

### Directory Structure

```
gaso-saas/
  pnpm-workspace.yaml          # add apps/*, packages/*
  apps/
    main/                       # existing tenant app (move current src/ here)
      package.json
      next.config.ts
      src/
    admin/                      # NEW super-admin app
      package.json
      next.config.ts
      src/
  packages/
    shared/                     # extracted shared modules
      src/
        lib/
          prisma.ts             # single shared Prisma singleton
          tenant-context.ts
          audit/
          auth/
        types/
```

### Critical Constraint

The admin app must NOT run the tenant middleware. It will have its own middleware that ONLY checks platform authentication and skips tenant resolution entirely. This allows the admin app to share the same domain and NextAuth cookie, but with zero tenant context.

---

## 2. Authentication Architecture

### Current State Analysis

The existing codebase has:
- NextAuth v4 with JWT strategy (30-day sessions)
- `CredentialsProvider` that calls `/api/login` internally
- JWT token contains: `tenantId`, `tenantSlug`, `tenantName`, `admin` (boolean)
- `requireAdmin()` guard checks `user.admin === true`
- `isSaasAdmin` is derived from `tenantId === SAAS_ROOT_TENANT_ID`

### The Problem

The current admin model conflates two concepts:
1. **Tenant admin** (`user.admin === true`): A user WITHIN a tenant who has admin privileges for that tenant
2. **Platform admin** (what you need): A user who operates ACROSS all tenants, NOT attached to any specific tenant

The `SAAS_ROOT_TENANT_ID` env var pattern is a **clever but fragile** workaround. It creates a pseudo-tenant for platform admins. This has several issues:
- Platform admins must belong to a tenant (violates the "not attached to any tenant" constraint)
- If the root tenant is accidentally suspended/deactivated, ALL platform admins lose access
- It mixes tenant admin and platform admin into the same boolean field

### Recommended Approach

**Do NOT create separate auth tables.** Share NextAuth infrastructure but implement a proper role model:

```typescript
// New JWT token fields (add to next-auth.d.ts)
token.platformRole: 'super_admin' | 'support' | null  // null = tenant user
token.tenantId: string       // null for platform admins
```

**Login flow for platform admins:**

1. Platform admin navigates to `admin.gaso-saas.com/login`
2. Login page calls the SAME `/api/login` endpoint (or a dedicated `/api/admin/login`)
3. After credentials + MFA validation, check if user has a platform role
4. If platform role exists, JWT token gets `platformRole` set AND `tenantId` set to null (or SAAS_ROOT_TENANT_ID)
5. Admin middleware checks `token.platformRole === 'super_admin'` instead of checking `token.tenantId === SAAS_ROOT_TENANT_ID`

**Why this is better:**
- Platform admins authenticate with the same credentials as tenant users
- The JWT token explicitly encodes their role
- No pseudo-tenant needed
- Audit logs can distinguish "tenant admin" from "platform admin" actions

**Implementation:**

```typescript
// In login route (/api/login), after successful auth:
const platformRole = await getPlatformRole(user.IdUsuario)
if (platformRole) {
  return NextResponse.json({
    ...userData,
    tenantId: null,        // platform admin has no tenant
    platformRole,          // 'super_admin' | 'support'
  })
}
```

**Admin app middleware:**
```typescript
// apps/admin/src/middleware.ts
export async function middleware(request: NextRequest) {
  // NO tenant resolution
  // NO subdomain extraction
  
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  
  if (!token) {
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }
  
  if (!token.platformRole) {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }
  
  // Set admin session headers (NO x-tenant-* headers)
  const headers = new Headers(request.headers)
  headers.set('x-admin-user-id', String(token.id))
  headers.set('x-admin-role', String(token.platformRole))
  
  return NextResponse.next({ request: { headers } })
}
```

### Table for Platform Roles

Add to the database (via Prisma or raw SQL migration):

```sql
CREATE TABLE [Security].[PlatformUsers] (
  UserID INT NOT NULL,
  Role NVARCHAR(50) NOT NULL,  -- 'super_admin', 'support', 'auditor'
  CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
  CreatedBy INT NULL,
  CONSTRAINT PK_PlatformUsers PRIMARY KEY (UserID)
)
```

---

## 3. Database Design

### Current `Security.Tenants` Table Analysis

Based on the codebase, the table has:
- `TenantID` (uniqueidentifier)
- `CompanyName` (nvarchar)
- `isActive` (bit)
- `Dominio` (nvarchar)

### Critical Gap: Tenant Status Model

Currently `isActive` is a **boolean**. This is insufficient.

**A boolean cannot distinguish:**
- "Active and paying" from "Active but payment overdue"
- "Suspended by admin" from "Cancelled by customer"
- "Trial" from "Paid"
- "Suspended temporarily" from "Permanently deactivated"

### Recommended Schema Changes

#### 1. Replace `isActive` bit with `Status` varchar

```sql
ALTER TABLE Security.Tenants ADD Status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE';

-- Status values:
--   'ACTIVE'      - Normal operation
--   'SUSPENDED'   - Temporarily disabled (admin action; users cannot log in)
--   'INACTIVE'    - Permanently deactivated (admin action; tenant is dead)
--   'TRIAL'       - Trial period (future use)

-- Migrate existing data:
UPDATE Security.Tenants SET Status = CASE 
  WHEN isActive = 1 THEN 'ACTIVE' 
  ELSE 'INACTIVE' 
END;

-- Keep isActive as a computed column for backward compatibility:
ALTER TABLE Security.Tenants DROP COLUMN isActive;
ALTER TABLE Security.Tenants ADD isActive AS (CASE WHEN Status IN ('ACTIVE', 'TRIAL') THEN 1 ELSE 0 END);
```

Why:
- Enum values in the database (not in TypeScript) allow ad-hoc queries
- The computed column prevents breaking existing code that reads `isActive`
- New code reads `Status` for precise logic

#### 2. Add tenant metadata columns

```sql
ALTER TABLE Security.Tenants ADD 
  SubscriptionPlan NVARCHAR(100) NULL,     -- 'basic', 'pro', 'enterprise'
  MaxUsers INT NULL,                       -- seat limit
  CreatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2 DEFAULT SYSUTCDATETIME(),
  SuspendedAt DATETIME2 NULL,
  SuspendedReason NVARCHAR(500) NULL;
```

#### 3. Audit Logs — Leverage Existing `Audit.TransactionLog`

The existing `Audit.TransactionLog` table is well-designed. **Do NOT create a separate audit table.**

Structure (from code):
- `AuditID` (bigint, auto)
- `TenantID` (uniqueidentifier)
- `UserID` (int, nullable)
- `TableName` (nvarchar) — e.g., 'Security.Tenants'
- `Action` (nvarchar(10)) — e.g., 'INSERT', 'UPDATE'
- `OldData` (nvarchar(max)) — JSON
- `NewData` (nvarchar(max)) — JSON
- `ChangedAt` (datetime2)
- `AppUser` (nvarchar(128))
- `IdOrigin` (int) — 1=DB, 2=WEB, 3=APP

**Add new action codes for tenant administration:**

```typescript
// In src/lib/audit/catalog.ts, add:
TENANT_CREATED: 'TEN_CR',
TENANT_UPDATED: 'TEN_UP',
TENANT_ACTIVATED: 'TEN_ACT',
TENANT_SUSPENDED: 'TEN_SUSP',
TENANT_DEACTIVATED: 'TEN_DEA',
```

**Audit entry example (tenant suspended):**

```typescript
await writeTransactionLog({
  tenantId: targetTenant.TenantID,           // WHICH tenant was affected
  userId: adminUserId,                        // WHO did it
  tableName: 'Security.Tenants',
  action: 'TEN_SUSP',
  oldData: { status: 'ACTIVE' },             // previous state
  newData: { status: 'SUSPENDED', reason: 'Payment overdue' }, // new state + metadata
  idOrigin: ID_ORIGIN_WEB,
  appUser: adminEmail,
})
```

**Immutability:** The existing `writeTransactionLog` function does INSERT-only. There is no UPDATE or DELETE path against `Audit.TransactionLog`. This is already append-only. **Do not grant UPDATE/DELETE permissions on this table to the application user.**

#### 4. Tenant Lifecycle History

**Do NOT create a separate table.** Audit logs ARE the lifecycle history. To query a tenant's history:

```sql
SELECT * FROM Audit.TransactionLog
WHERE TableName = 'Security.Tenants'
  AND TenantID = @tenantId
ORDER BY ChangedAt DESC
```

This avoids data duplication and keeps the audit trail as the single source of truth.

---

## 4. Main App Refactor Impact

### Critical Bug: Tenant Status Is NOT Checked During Login

**Current code in `/api/login/route.ts` (line 34-58):**
```typescript
const user = await prisma.gASOCO_Cat_Usuarios.findFirst({
  where: {
    Usuario: { equals: username },
    Password: { equals: password },
    Estatus: { equals: 'A' }     // ← checks USER status
    // ❌ NO check on Tenant status!
  }
})
```

The middleware (`src/middleware.ts:107`) does check `tenant.isActive` and redirects to `/auth/tenant-inactive`, but this only catches attempted page visits, NOT the login API call itself. A suspended tenant's user could POST to `/api/login` directly and get a valid JWT.

### Fix: Add Tenant Status Check in Login Route

**Before the user query** (line 34 in login/route.ts), add:

```typescript
// Check tenant status before processing login
const tenant = await prisma.$queryRaw<Array<{ isActive: number }>>`
  SELECT isActive FROM Security.Tenants WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
`

if (!tenant[0] || tenant[0].isActive === 0) {
  await writeAuthAudit({
    eventType: 'LOGIN_FAILED',
    eventStatus: 'FAILED',
    tenantId,
    tenantSlug,
    username,
    reason: 'TENANT_SUSPENDED'
  })
  
  return NextResponse.json(
    { message: ['Organization is suspended. Contact your administrator.'] },
    { status: 403, statusText: 'Tenant Suspended' }
  )
}
```

### Validation Layers (Defense in Depth)

| Layer | What It Does | Impact If Skipped |
|-------|-------------|-------------------|
| **1. Login API** | Rejects login if tenant suspended | **Prevents JWT issuance** |
| **2. Middleware** | Redirects to `/auth/tenant-inactive` | Prevents accessing pages |
| **3. NextAuth JWT callback** | Validates tenant status during token refresh | Prevents token reuse after suspension |
| **4. API routes** | Validate tenant context on each request | Protects API from direct access |
| **5. SQL Server SESSION_CONTEXT** | RLS filters by tenant automatically | Defense in depth |

**Add to NextAuth JWT callback (`src/libs/auth.ts:111`):**

```typescript
async jwt({ token, user, trigger }) {
  if (user) {
    // ... existing assignments ...
  }
  
  // On token refresh, verify tenant is still active
  if (token.tenantId && token.tenantId !== '00000000-0000-0000-0000-000000000000') {
    const tenants = await prisma.$queryRaw<Array<{ isActive: number }>>`
      SELECT isActive FROM Security.Tenants 
      WHERE TenantID = CAST(${token.tenantId} AS uniqueidentifier)
    `
    if (tenants[0]?.isActive === 0) {
      // Invalidate the token by returning an empty object
      return {}
    }
  }
  
  return token
}
```

### Middleware Enhancement

The existing middleware already checks `tenant.isActive` at line 107. **This is correct and should remain.** However, add an explicit suspension audit:

```typescript
// In middleware.ts, after line 107-108:
if (!tenant.isActive) {
  auditAccessDenied({
    kind: 'TENANT_SUSPENDED',
    tenantId: tenant.TenantID,
    tenantName: tenant.CompanyName,
    path: pathname,
    ip: request.headers.get('x-forwarded-for') ?? null
  })
  return NextResponse.redirect(new URL(`/${getLocale(pathname)}/auth/tenant-inactive`, request.url))
}
```

---

## 5. API Design

### Endpoint Specification

All admin API routes live under `/api/admin/tenants/` and are protected by `requireAdmin()` with platform-role check.

```
GET    /api/admin/tenants                    # List all tenants (paginated, filterable)
POST   /api/admin/tenants                    # Create new tenant
GET    /api/admin/tenants/[tenantId]         # Get single tenant details
PUT    /api/admin/tenants/[tenantId]         # Update tenant info
POST   /api/admin/tenants/[tenantId]/activate     # Activate tenant
POST   /api/admin/tenants/[tenantId]/suspend      # Suspend tenant
POST   /api/admin/tenants/[tenantId]/deactivate   # Deactivate tenant
GET    /api/admin/tenants/[tenantId]/audit        # Get audit trail for tenant
GET    /api/admin/audit                          # Global audit log (SaaS admin only)
```

### Service Layer Architecture

Do NOT put business logic in route handlers. Create a service layer:

```
apps/admin/src/
  services/
    tenant-service.ts          # Tenant CRUD + lifecycle operations
    audit-service.ts           # Audit log queries
  lib/
    admin-auth.ts              # Platform admin guard (enhanced requireAdmin)
    admin-db.ts                # Shared Prisma client (import from packages/shared)
```

**`tenant-service.ts` pattern:**

```typescript
export async function suspendTenant(
  tenantId: string,
  adminUserId: number,
  reason: string
): Promise<TenantOperationResult> {
  return prisma.$transaction(async (tx) => {
    // 1. Read current state
    const tenant = await tx.$queryRaw<TenantRow[]>`
      SELECT TenantID, CompanyName, Status
      FROM Security.Tenants
      WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
    `
    
    if (!tenant[0]) {
      return { ok: false, error: 'TENANT_NOT_FOUND' }
    }
    
    if (tenant[0].Status === 'INACTIVE') {
      return { ok: false, error: 'CANNOT_SUSPEND_INACTIVE_TENANT' }
    }
    
    const previousStatus = tenant[0].Status
    
    // 2. Update tenant
    await tx.$executeRaw`
      UPDATE Security.Tenants 
      SET Status = 'SUSPENDED', 
          SuspendedAt = SYSUTCDATETIME(),
          SuspendedReason = ${reason},
          UpdatedAt = SYSUTCDATETIME()
      WHERE TenantID = CAST(${tenantId} AS uniqueidentifier)
    `
    
    // 3. Audit
    await tx.$executeRaw`
      INSERT INTO Audit.TransactionLog (
        TenantID, UserID, TableName, Action,
        OldData, NewData, ChangedAt, AppUser, IdOrigin
      ) VALUES (
        CAST(${tenantId} AS uniqueidentifier),
        ${adminUserId},
        'Security.Tenants',
        'TEN_SUSP',
        ${JSON.stringify({ status: previousStatus })},
        ${JSON.stringify({ status: 'SUSPENDED', reason })},
        SYSUTCDATETIME(),
        'admin',
        2
      )
    `
    
    // 4. Invalidate tenant cache
    revalidateTag('tenant')
    
    return { ok: true, tenantId }
  })
}
```

### API Authorization Pattern

Each admin API route must:

1. Call `requireAdmin()` — verifies user is authenticated and `admin === true`
2. Call `requirePlatformRole('super_admin')` — verifies user has platform access
3. Log the action to audit

```typescript
// New guard: apps/admin/src/lib/admin-auth.ts
export async function requirePlatformRole(
  requiredRole: 'super_admin' | 'support' | 'auditor'
): Promise<AdminGuardResult> {
  const result = await requireAdmin()
  
  if (!result.ok) return result
  
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.platformRole) {
    return { ok: false, status: 403, message: 'Platform role required' }
  }
  
  if (session.user.platformRole !== requiredRole) {
    return { ok: false, status: 403, message: `Role ${requiredRole} required` }
  }
  
  return result
}
```

---

## 6. Frontend Design

### Application Structure

```
apps/admin/src/
  app/
    layout.tsx                    # Admin layout (no tenant layout)
    page.tsx                      # Dashboard redirect
    (auth)/
      login/
        page.tsx                  # Platform admin login
    (dashboard)/
      layout.tsx                  # Dashboard shell with sidebar
      tenants/
        page.tsx                  # Tenant list + table
        [tenantId]/
          page.tsx                # Tenant detail
      audit/
        page.tsx                  # Global audit log
      settings/
        page.tsx                  # Admin settings
    api/
      admin/
        tenants/
          route.ts                # GET (list), POST (create)
          [tenantId]/
            route.ts              # GET (detail), PUT (update)
            activate/
              route.ts            # POST
            suspend/
              route.ts            # POST
            deactivate/
              route.ts            # POST
            audit/
              route.ts            # GET
        audit/
          route.ts                # GET (global)
  components/
    tenants/
      TenantTable.tsx              # Server component: paginated table
      TenantTableClient.tsx        # Client component: DataGrid wrapper
      TenantForm.tsx               # Create/Edit form
      TenantStatusBadge.tsx        # Status indicator
      SuspendDialog.tsx            # Confirmation dialog with reason
    audit/
      AuditLogTable.tsx
      AuditLogFilters.tsx
    layout/
      AdminSidebar.tsx
      AdminHeader.tsx
  services/
    tenant-service.ts
    audit-service.ts
  lib/
    admin-auth.ts
    validators.ts                 # Valibot/Zod schemas for tenant forms
```

### Pages

| Route | Description |
|-------|-------------|
| `/admin/login` | Platform admin login page |
| `/admin` | Dashboard with platform metrics |
| `/admin/tenants` | Tenant list with status filters, search, pagination |
| `/admin/tenants/new` | Create tenant form |
| `/admin/tenants/[id]` | Tenant detail: info, status history, actions |
| `/admin/tenants/[id]/edit` | Edit tenant form |
| `/admin/audit` | Global audit log with filters (tenant, action, date range, user) |

### State Management

**Use React Server Components + Server Actions for data fetching where possible.** No Redux for admin panel.

- Tenant list page: Server component fetches data, passes to client table component
- Forms: `react-hook-form` + `@hookform/resolvers` + `valibot` (already dependencies in the project)
- Mutations: Server actions (Next.js 15) or fetch POST to API routes
- Toast notifications: `react-toastify` (already a dependency)

### Component Architecture

```
// Server component pattern
// apps/admin/src/app/(dashboard)/tenants/page.tsx
export default async function TenantsPage({ searchParams }) {
  const guard = await requirePlatformRole('super_admin')
  if (!guard.ok) redirect('/admin/login')
  
  const { tenants, total } = await tenantService.listTenants({
    page: Number(searchParams.page) || 1,
    status: searchParams.status as TenantStatus,
    search: searchParams.search,
  })
  
  return (
    <div>
      <TenantFilters />
      <TenantTable data={tenants} total={total} />
    </div>
  )
}
```

---

## 7. Security Design

### 1. Tenant Users Cannot Access Admin APIs

**Layer 1 — Route-level guard:**
Every admin API route calls `requirePlatformRole()` which checks:
- Authenticated? → JWT must be valid
- Is admin? → `session.user.admin === true`
- Has platform role? → `session.user.platformRole === 'super_admin'`

**Layer 2 — Middleware exclusion:**
Admin routes under `/api/admin/` should be excluded from the MAIN app middleware matcher (which injects tenant headers). Add to matcher exclusion:

```typescript
// src/middleware.ts
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth/|api/internal/|api/admin/|...).*)'
  ]
}
```

**Layer 3 — No tenant context:**
Admin API routes do NOT call `setTenantContext()` or `getTenantFromHeaders()`. They access the database without SESSION_CONTEXT filtering, which is intentional for global visibility.

### 2. Admin App Isolation

- Admin app runs at `admin.gaso-saas.com` (separate subdomain)
- Or at `/admin` path prefix with middleware that excludes tenant resolution
- Admin app does NOT import `tenant-context.ts`, `erp-access.ts`, or any tenant-scoped modules
- Admin app has its own middleware that checks platform role, not tenant membership

### 3. Audit Logs Cannot Be Modified

- `Audit.TransactionLog` table: REVOKE UPDATE and DELETE from the application database user
- The `writeTransactionLog` function only does INSERT
- No API endpoint exists for modifying/deleting audit entries
- At the database level, create a DB trigger that prevents UPDATE/DELETE:

```sql
CREATE TRIGGER Audit.ProtectTransactionLog
ON Audit.TransactionLog
INSTEAD OF UPDATE, DELETE
AS
BEGIN
  RAISERROR('Audit.TransactionLog is append-only. Modifications are not permitted.', 16, 1)
END
```

### 4. Privilege Escalation Prevention

- Platform roles are stored in `Security.PlatformUsers`, NOT in the JWT token claims submitted by the client
- The login API always queries the database for the user's current platform role
- Platform role is never settable via client request
- The `admin` boolean and `platformRole` are separate concepts — having `admin=true` does NOT grant platform access

---

## 8. Implementation Roadmap

### Phase 0: Pre-requisite Fixes (MUST complete before Phase 1)

These are **blockers** found during codebase analysis:

| Task | File(s) | Priority |
|------|---------|----------|
| **Fix: `prisma-helpers.ts` SQL injection** | `src/lib/prisma-helpers.ts` + ~50 call sites | **CRITICAL** |
| **Fix: `auth.ts` uses separate PrismaClient** | `src/libs/auth.ts:9` | High |
| **Fix: `setTenantContext` uses `$executeRawUnsafe`** | `src/lib/tenant-context.ts:88` | High |
| **Fix: `resolve-tenant` uses `$queryRawUnsafe`** | `src/app/api/internal/resolve-tenant/route.ts:19` | High |
| **Fix: Login route does not check tenant status** | `src/app/api/login/route.ts:34` | **CRITICAL** |
| **Fix: `withTenantContext` uses `$executeRawUnsafe`** | `src/lib/tenant-context.ts:113` | High |

**Why Phase 0 first:** The admin panel will write to `Security.Tenants` and `Audit.TransactionLog`. If these helpers are still unsafe, any new code that uses them is vulnerable. Plus, fixing the login gap is essential for suspension to work.

### Phase 1: Database Migration

1. Add `Status` column to `Security.Tenants`, create computed `isActive` column
2. Add metadata columns (`SubscriptionPlan`, `MaxUsers`, `SuspendedAt`, `SuspendedReason`, `CreatedAt`, `UpdatedAt`)
3. Create `Security.PlatformUsers` table
4. Add audit action codes for tenant operations
5. Create `ProtectTransactionLog` trigger
6. Migrate existing data (backfill `Status`, compute `isActive`)
7. Create Prisma migration

### Phase 2: Monorepo Scaffolding — Step-by-Step Execution Plan

This is the most delicate phase. The existing codebase must continue working throughout the restructuring. Each step is designed to be independently verifiable.

---

#### Step 2.1: Update Workspace Configuration

**File: `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
allowBuilds:
  - '@prisma/client': true
  - '@prisma/engines': true
  - esbuild: true
  - prisma: true
  - sharp: true
```

**Verification:** `pnpm list --depth 0` still resolves correctly.

---

#### Step 2.2: Create Directory Skeleton

```
mkdir -p apps/main apps/admin
mkdir -p packages/shared/src/lib/audit
mkdir -p packages/shared/src/lib/auth
mkdir -p packages/shared/src/types
```

---

#### Step 2.3: Create `packages/shared/package.json`

```jsonc
{
  "name": "@gaso/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {},
  "dependencies": {
    "@prisma/client": "6.19.2",
    "next-auth": "4.24.11"
  },
  "devDependencies": {
    "typescript": "5.5.4"
  }
}
```

**Verification:** `pnpm install` succeeds from workspace root.

---

#### Step 2.4: Create `packages/shared/tsconfig.json`

```jsonc
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "commonjs",
    "lib": ["ES2021"],
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

---

#### Step 2.5: Move Shared Modules into `packages/shared/src/`

Move these files from the current `src/` into the shared package. Each move is a `git mv` to preserve history.

| Source (current) | Destination (shared package) |
|------------------|------------------------------|
| `src/lib/prisma.ts` | `packages/shared/src/lib/prisma.ts` |
| `src/lib/prisma-helpers.ts` | `packages/shared/src/lib/prisma-helpers.ts` |
| `src/lib/audit/catalog.ts` | `packages/shared/src/lib/audit/catalog.ts` |
| `src/lib/audit/transaction-log.ts` | `packages/shared/src/lib/audit/transaction-log.ts` |
| `src/lib/tenant-context.ts` | `packages/shared/src/lib/tenant-context.ts` |
| `src/lib/auth/require-admin.ts` | `packages/shared/src/lib/auth/require-admin.ts` |
| `src/libs/auth.ts` | `packages/shared/src/lib/auth/nextauth-config.ts` *(rename)* |
| `next-auth.d.ts` | `packages/shared/src/types/next-auth.d.ts` |
| `src/types/me.ts` | `packages/shared/src/types/me.ts` |

**Critical:** After moving `prisma.ts`, update its import path in ALL files that reference it. Use a global search:

```
rg "@/'lib/prisma'" src/ -l
rg "from '@/lib/prisma'" src/ -l
```

**Create `packages/shared/src/index.ts`** — barrel export:

```typescript
export { prisma } from './lib/prisma';
export { queryRaw, executeRaw } from './lib/prisma-helpers';
export * from './lib/audit/catalog';
export { writeTransactionLog, ID_ORIGIN_WEB } from './lib/audit/transaction-log';
export type { TransactionLogEntry } from './lib/audit/transaction-log';
export * from './lib/tenant-context';
export { requireAdmin } from './lib/auth/require-admin';
export type { AdminGuardResult } from './lib/auth/require-admin';
export { authOptions } from './lib/auth/nextauth-config';
```

**Update path aliases in `tsconfig.json` (root):**

```jsonc
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],       // keep for non-migrated files
      "@gaso/shared": ["./packages/shared/src"],
      "@gaso/shared/*": ["./packages/shared/src/*"]
    }
  }
}
```

**Verification:** `pnpm exec tsc --noEmit` passes in the root project.

---

#### Step 2.6: Move Tenant App into `apps/main/`

Move everything remaining in the project root that belongs to the main app into `apps/main/`:

```
# Files to move:
src/               → apps/main/src/
public/            → apps/main/public/
package.json       → apps/main/package.json
next.config.ts     → apps/main/next.config.ts
tsconfig.json      → apps/main/tsconfig.json
tailwind.config.ts → apps/main/tailwind.config.ts
postcss.config.mjs → apps/main/postcss.config.mjs
next-env.d.ts      → apps/main/next-env.d.ts
declarations.d.ts  → apps/main/declarations.d.ts
.eslintrc.js       → apps/main/.eslintrc.js
.prettierrc.json   → apps/main/.prettierrc.json
.stylelintrc.json  → apps/main/.stylelintrc.json
.env               → apps/main/.env
.env.example       → apps/main/.env.example
```

**Update `apps/main/package.json`:**

```jsonc
{
  "name": "@gaso/main",
  "version": "1.1.2",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "lint:fix": "next lint --fix",
    "format": "prettier --write \"src/**/*.{js,jsx,ts,tsx}\"",
    "build:icons": "tsx src/assets/iconify-icons/bundle-icons-css.ts",
    "migrate": "dotenv -e .env -- npx prisma migrate dev",
    "postinstall": "prisma generate && npm run build:icons",
    "removeI18n": "tsx src/remove-translation-scripts/index.ts"
  },
  "dependencies": {
    "@gaso/shared": "workspace:*",
    // ... copy all existing dependencies from root package.json ...
  },
  "devDependencies": {
    // ... copy all existing devDependencies from root package.json ...
  },
  "prisma": {
    "schema": "./src/prisma/schema.prisma"
  }
}
```

**Update `apps/main/tsconfig.json` paths:**

```jsonc
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@core/*": ["./src/@core/*"],
      "@layouts/*": ["./src/@layouts/*"],
      "@menu/*": ["./src/@menu/*"],
      "@assets/*": ["./src/assets/*"],
      "@components/*": ["./src/components/*"],
      "@configs/*": ["./src/configs/*"],
      "@views/*": ["./src/views/*"],
      "@gaso/shared": ["../packages/shared/src"],
      "@gaso/shared/*": ["../packages/shared/src/*"]
    }
  }
}
```

**Update root `package.json`** — keep only workspace scripts:

```jsonc
{
  "name": "gaso-saas",
  "version": "1.1.2",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter @gaso/main dev",
    "dev:admin": "pnpm --filter @gaso/admin dev",
    "build": "pnpm --filter @gaso/main build",
    "build:admin": "pnpm --filter @gaso/admin build",
    "lint": "pnpm -r lint",
    "format": "pnpm -r format"
  }
}
```

**Verification:** `cd apps/main && pnpm dev` starts the tenant app with zero errors.

---

#### Step 2.7: Update All Imports in Main App

After moving `prisma.ts`, `tenant-context.ts`, `auth.ts`, and the audit modules to `packages/shared/`, every file that imported them from `@/lib/...` or `@/libs/...` must be updated:

```
# Old import                              → New import
from '@/lib/prisma'                       → from '@gaso/shared'
from '@/lib/prisma-helpers'               → from '@gaso/shared'
from '@/lib/audit/catalog'                → from '@gaso/shared'
from '@/lib/audit/transaction-log'        → from '@gaso/shared'
from '@/lib/tenant-context'               → from '@gaso/shared'
from '@/lib/auth/require-admin'           → from '@gaso/shared'
from '@/libs/auth'                        → from '@gaso/shared' { authOptions }
from '@/types/me'                         → from '@gaso/shared'
```

**Run a global search-and-replace.** Use the IDE's refactor tool or a script. Critical files that will need updating:

- `src/app/api/login/route.ts` — imports `prisma`, `getTenantFromHeaders`, `setTenantContext`
- `src/app/api/me/route.ts` — imports `withTenantContext`, `authOptions`
- `src/app/api/audit/route.ts` — imports `withTenantContext`, `requireAdmin`, `KNOWN_ACTIONS`
- `src/app/api/auth/[...nextauth]/route.ts` — imports `authOptions`
- `src/middleware.ts` — no direct imports from shared, but verifies middleware still works
- `src/libs/auth.ts` → moved entirely; all consumers must update

**Update `next-auth.d.ts` references:** Since it moved to `packages/shared/src/types/`, ensure the main app's `tsconfig.json` includes it or create a local `next-auth.d.ts` that re-exports:

```typescript
// apps/main/next-auth.d.ts
import '@gaso/shared/types/next-auth';
```

**Verification:** `pnpm build` from `apps/main/` produces a successful build with zero type errors.

---

#### Step 2.8: Create `apps/admin/` Scaffold

Create a fresh Next.js app inside `apps/admin/`. Do NOT copy the main app's configuration — start clean.

**`apps/admin/package.json`:**

```jsonc
{
  "name": "@gaso/admin",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack --port 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@gaso/shared": "workspace:*",
    "@hookform/resolvers": "3.9.1",
    "@mui/material": "6.2.1",
    "@mui/material-nextjs": "6.2.1",
    "@emotion/react": "11.14.0",
    "@emotion/styled": "11.14.0",
    "next": "15.1.2",
    "next-auth": "4.24.11",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-hook-form": "7.54.1",
    "react-toastify": "10.0.6",
    "valibot": "0.42.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "typescript": "5.5.4"
  }
}
```

**`apps/admin/tsconfig.json`:**

```jsonc
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"],
      "@gaso/shared": ["../../packages/shared/src"],
      "@gaso/shared/*": ["../../packages/shared/src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

**`apps/admin/next.config.ts`:**

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@gaso/shared'],
  // Admin app does NOT set basePath or locale redirects
  // Admin app does NOT import tenant middleware
};

export default nextConfig;
```

**`apps/admin/src/middleware.ts`** — admin-only middleware, NO tenant resolution:

```typescript
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = ['/admin/login'];

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  if (PUBLIC_PATHS.includes(pathname)) {
    return NextResponse.next();
  }
  
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  
  if (!token) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  if (!token.platformRole) {
    return NextResponse.redirect(new URL('/admin/login?error=unauthorized', request.url));
  }
  
  const headers = new Headers(request.headers);
  headers.set('x-admin-user-id', String(token.id ?? ''));
  headers.set('x-admin-role', String(token.platformRole));
  
  return NextResponse.next({ request: { headers } });
}
```

**Create `apps/admin/src/app/layout.tsx`:**

```typescript
export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

**Create `apps/admin/src/app/admin/login/page.tsx`** — stub login page:

```typescript
export default function AdminLoginPage() {
  return (
    <div>
      <h1>Platform Admin Login</h1>
      {/* Will be implemented in Phase 3 */}
    </div>
  );
}
```

**Verification:** `cd apps/admin && pnpm dev` starts on port 3001. Navigating to `http://localhost:3001/admin/login` renders the stub page. Importing `import { prisma } from '@gaso/shared'` in any admin file resolves without errors.

---

#### Step 2.9: Verify End-to-End

1. `pnpm install` from root — installs all workspace dependencies
2. `cd apps/main && pnpm build` — main app compiles cleanly
3. `cd apps/main && pnpm dev` — main app runs, login flow works
4. `cd apps/admin && pnpm build` — admin app compiles cleanly
5. `cd apps/admin && pnpm dev` — admin app runs, middleware redirects to login

**Rollback strategy:** If any step fails, the git history is preserved via `git mv`. A `git revert` on the monorepo refactor commit restores the original flat structure.

---

#### Step 2.10: Update AWS Amplify CI/CD

The root `amplify.yml` (or equivalent) needs to be split or updated for two build targets:

```yaml
# amplify.yml (main app)
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install -g pnpm
        - pnpm install --frozen-lockfile
    build:
      commands:
        - cd apps/main && pnpm build
  artifacts:
    baseDirectory: apps/main/.next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

```yaml
# amplify-admin.yml (admin app — separate Amplify app)
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install -g pnpm
        - pnpm install --frozen-lockfile
    build:
      commands:
        - cd apps/admin && pnpm build
  artifacts:
    baseDirectory: apps/admin/.next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

### Phase 3: Authentication Enhancement

1. Add `platformRole` to JWT token type (`next-auth.d.ts`)
2. Modify login route to detect platform admin users
3. Create `requirePlatformRole()` guard
4. Create admin app middleware (platform role check, no tenant resolution)
5. Create admin login page
6. Add tenant status check to login route (suspension enforcement)
7. Add tenant status validation to JWT callback

### Phase 4: Admin API Layer

1. Create tenant service (`tenant-service.ts`)
2. Create audit service (`audit-service.ts`)
3. Implement API routes:
   - `GET /api/admin/tenants` (paginated list)
   - `POST /api/admin/tenants` (create)
   - `GET /api/admin/tenants/[id]` (detail)
   - `PUT /api/admin/tenants/[id]` (update)
   - `POST /api/admin/tenants/[id]/activate`
   - `POST /api/admin/tenants/[id]/suspend`
   - `POST /api/admin/tenants/[id]/deactivate`
   - `GET /api/admin/tenants/[id]/audit`
   - `GET /api/admin/audit` (global)
4. Write integration tests for each endpoint

### Phase 5: Admin Frontend

1. Admin layout (sidebar, header)
2. Tenant list page with DataGrid
3. Tenant create/edit form
4. Tenant detail page with status history
5. Suspend/Activate/Deactivate confirmation dialogs
6. Global audit log page
7. Admin dashboard

### Phase 6: Testing & Verification

1. E2E test: Create tenant → verify login works
2. E2E test: Suspend tenant → verify login is rejected
3. E2E test: Activate tenant → verify login works again
4. E2E test: Deactivate tenant → verify permanent block
5. Audit log verification for all operations
6. Security test: Tenant user calls admin API → verify 403

### Phase 7: CI/CD & Deployment

1. Configure AWS Amplify for admin app deployment
2. Set environment variables for admin app
3. Configure separate subdomain (`admin.gaso-saas.com`)
4. Run database migrations in production
5. Verify zero-downtime deployment

---

## 9. Potential Problems & Risk Analysis

### Architectural Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Monorepo extraction breaks existing builds** | Main app stops working | Do Phase 2 incrementally; keep main app running while extracting shared packages |
| **Shared Prisma singleton conflict** | Admin and main app compete for connections | Use connection pooling; Prisma's default pool is 1 connection per client — safe for moderate load |
| **`prisma-helpers.ts` migration scope (50 files)** | Large refactor with high regression risk | Do in small batches; start with files the admin panel needs, migrate others incrementally |
| **Platform admin also has a tenant account** | Edge case: same user is both tenant admin and platform admin | JWT token must carry both roles; login page must route to correct app based on context |
| **Tenant suspension doesn't invalidate existing JWTs** | Suspended tenant users keep access until JWT expires (up to 30 days) | Add JWT callback check (Phase 3); set shorter JWT maxAge or implement token blacklist |
| **`SAAS_ROOT_TENANT_ID` env var misuse** | If not configured, no one is SaaS admin; if misconfigured, wrong tenant becomes root | Deprecate this pattern in favor of `PlatformUsers` table; add validation that root tenant cannot be suspended |

### Hidden Technical Debt Found

1. **`prisma-helpers.ts`** — Tagged template that doesn't parameterize. This is a SQL injection vector in ~50 files. The file itself has a warning comment from the original author (Diego) acknowledging this is technical debt.

2. **`auth.ts:9` creates a new `PrismaClient()`** — This is a separate instance from the global singleton in `prisma.ts`. It means two connection pools exist. The adapter-based PrismaClient may not have SESSION_CONTEXT set.

3. **`setTenantContext` and `withTenantContext` use `$executeRawUnsafe`** with manual single-quote escaping (`replace(/'/g, "''")`). This is better than nothing but still NOT parametrized. A tenant ID that contains other special characters could cause issues.

4. **`resolve-tenant/route.ts:19`** — Same manual escaping pattern. The `unstable_cache` wraps this, meaning a cached tenant lookup could return stale data after suspension (TTL is 300s). Need to call `revalidateTag('tenant')` on status changes.

5. **Middleware matcher excludes `/api/auth/` and `/api/internal/`** — This means the tenant headers (`x-tenant-id`, etc.) are NOT set on those routes. The login API gets tenant from headers, but the middleware doesn't set them for auth routes. The login route relies on the fetch caller (NextAuth credentials provider) to forward the original request headers. This is fragile.

6. **Google OAuth provider** — Configured but empty client ID/secret in `.env`. If enabled, Google-authenticated users would bypass the tenant status check entirely since they don't go through `/api/login`.

### Future Scalability Concerns

1. **Platform role model** — Currently supports only `super_admin`. Consider future roles: `billing_admin`, `support_agent` (read-only tenant access), `auditor` (read-only audit logs). The `PlatformUsers.Role` field should be designed for extension now.

2. **Multi-region SaaS** — If you deploy tenants in different Azure regions, the admin panel needs to know which region each tenant is in. Add a `Region` column to `Security.Tenants` now.

3. **Admin audit log growth** — `Audit.TransactionLog` will grow unbounded. Plan for partitioning by `ChangedAt` (monthly partitions) and a retention policy (e.g., archive logs older than 2 years).

4. **Concurrent admin actions** — Two platform admins suspending the same tenant simultaneously. The `suspendTenant` function uses a transaction with state-read-before-write, which prevents race conditions for DB operations but doesn't prevent UI-level conflicts. Add optimistic locking (version number or `UpdatedAt` check).

### Things You May Be Overlooking

1. **Email/password reset for platform admins** — If a platform admin forgets their password, the normal tenant password reset flow won't work (it's scoped to a tenant). You need a separate password reset flow for platform admins.

2. **MFA for platform admins** — The existing MFA system is tenant-scoped. Platform admins need MFA too, but against their platform identity, not a tenant. Solution: MFA factors should be stored per-user (which they are in `Security.UserMfaFactors`), not per-tenant. Verify this works for platform admin login.

3. **Configuration drift between apps** — Both `main` and `admin` apps need to share env vars like `DATABASE_URL`, `NEXTAUTH_SECRET`. Use a shared `.env` file or a secrets manager (Azure Key Vault). Don't duplicate secrets.

4. **Build-time type sharing** — If `apps/admin` imports types from `packages/shared`, the shared package must be built before the admin app. Use pnpm workspace protocol (`"workspace:*"`) and configure Turborepo or npm scripts for build ordering.

5. **Tenant cache invalidation** — The `resolve-tenant` API caches for 300 seconds. When you change a tenant's status, users could still access the app for up to 5 minutes. Call `revalidateTag('tenant')` immediately on status changes.

6. **Suspended tenant page UX** — The current `/auth/tenant-inactive` page should show a custom message per tenant (e.g., "Your account has been suspended due to payment. Please contact billing@gaso-saas.com"). Store a `SuspendedMessage` field on the tenant.

---

## Appendix A: Migration SQL Reference

```sql
-- Phase 1 Migration

-- 1. Add Status column
ALTER TABLE Security.Tenants ADD 
  Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Tenants_Status DEFAULT 'ACTIVE',
  SubscriptionPlan NVARCHAR(100) NULL,
  MaxUsers INT NULL,
  CreatedAt DATETIME2 NOT NULL CONSTRAINT DF_Tenants_CreatedAt DEFAULT SYSUTCDATETIME(),
  UpdatedAt DATETIME2 NOT NULL CONSTRAINT DF_Tenants_UpdatedAt DEFAULT SYSUTCDATETIME(),
  SuspendedAt DATETIME2 NULL,
  SuspendedReason NVARCHAR(500) NULL,
  SuspendedMessage NVARCHAR(500) NULL,
  Region NVARCHAR(50) NULL;

-- 2. Migrate isActive to Status
UPDATE Security.Tenants 
SET Status = CASE WHEN isActive = 1 THEN 'ACTIVE' ELSE 'INACTIVE' END,
    CreatedAt = ISNULL(CreatedAt, SYSUTCDATETIME()),
    UpdatedAt = ISNULL(UpdatedAt, SYSUTCDATETIME());

-- 3. Drop old isActive, create computed column
ALTER TABLE Security.Tenants DROP COLUMN isActive;
ALTER TABLE Security.Tenants ADD isActive AS (
  CASE WHEN Status IN ('ACTIVE', 'TRIAL') THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END
);

-- 4. Create PlatformUsers table
CREATE TABLE [Security].[PlatformUsers] (
  UserID INT NOT NULL,
  Role NVARCHAR(50) NOT NULL,
  CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
  CreatedBy INT NULL,
  CONSTRAINT PK_PlatformUsers PRIMARY KEY (UserID)
);

-- 5. Protect audit log
CREATE TRIGGER Audit.ProtectTransactionLog
ON Audit.TransactionLog
INSTEAD OF UPDATE, DELETE
AS
BEGIN
  SET NOCOUNT ON;
  THROW 50001, 'Audit.TransactionLog is append-only', 1;
END;
```

## Appendix B: Monorepo Configuration

```yaml
# pnpm-workspace.yaml (updated)
packages:
  - 'apps/*'
  - 'packages/*'
allowBuilds:
  - '@prisma/client': true
  - '@prisma/engines': true
  - esbuild: true
  - prisma: true
  - sharp: true
```

```jsonc
// apps/admin/package.json
{
  "name": "@gaso/admin",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@gaso/shared": "workspace:*",
    "next": "15.1.2",
    "next-auth": "4.24.11",
    // ... other deps
  }
}
```

```jsonc
// packages/shared/package.json
{
  "name": "@gaso/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "@auth/prisma-adapter": "2.7.4",
    "@prisma/client": "6.19.2",
    "next-auth": "4.24.11"
  }
}
```

---

**Final Verdict:**

Your approach of a separate application is architecturally correct. The monorepo (Option B) gives you the best of both worlds: logical separation with code reuse. But the **blocking issues in Phase 0** MUST be addressed before writing any new code. The login route not checking tenant status is a production bug that makes suspension meaningless. The SQL injection vectors in `prisma-helpers.ts` are technical debt that will compound if new admin code uses them.
