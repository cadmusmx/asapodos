# MFA Migration Plan: `apps/main` → `packages/shared/src/lib/mfa/`

## Goal

Move MFA core logic from `apps/main/src/app/api/auth-mfa/` into `packages/shared/src/lib/mfa/` so both `apps/main` and `apps/admin` can import and reuse MFA functionality.

## Current State

```
apps/main/src/app/api/auth-mfa/
├── store.ts                 ← Core logic: challenges, TOTP secrets, audit (198 lines)
├── start/route.ts           ← POST /api/auth-mfa/start
└── setup/
    ├── start/route.ts       ← POST /api/auth-mfa/setup/start
    └── verify/route.ts      ← POST /api/auth-mfa/setup/verify
```

### What `store.ts` exports

| Export | Purpose |
|--------|---------|
| `mfaChallenges` (Map on `globalThis`) | In-memory challenge store |
| `authAuditLogs` (array on `globalThis`) | In-memory audit log for debugging |
| `getDevTotpSecret()` | Returns `MFA_TOTP_SECRET` env var |
| `getUserTotpSecret(prisma, tenantId, userId)` | Queries `Security.UserMfaFactors` for verified TOTP |
| `getTotpSecretForLogin(prisma, tenantId, userId)` | Gets TOTP secret (dev fallback in non-prod) |
| `markTotpFactorUsed(prisma, factorId)` | Marks factor as used, resets failed attempts |
| `markTotpFactorFailedAttempt(prisma, factorId)` | Increments failed attempt counter |
| `writeAuthAudit(prisma, event)` | Writes to `Audit.TransactionLog` |

### Consumers

| File | Import |
|------|--------|
| `apps/main/src/app/api/login/route.ts` | `getTotpSecretForLogin`, `markTotpFactorFailedAttempt`, `markTotpFactorUsed`, `mfaChallenges`, `writeAuthAudit` |
| `apps/main/src/app/api/admin/users/[id]/mfa/reset/route.ts` | `writeAuthAudit` |
| `apps/main/src/app/api/auth-mfa/start/route.ts` | `getUserTotpSecret`, `mfaChallenges`, `writeAuthAudit` |
| `apps/main/src/app/api/auth-mfa/setup/start/route.ts` | `getUserTotpSecret`, `writeAuthAudit` |
| `apps/main/src/app/api/auth-mfa/setup/verify/route.ts` | `writeAuthAudit` |

Frontend consumers (HTTP fetch, not imports):
- `apps/main/src/views/Login.tsx` → `POST /api/auth-mfa/start`, `/api/auth-mfa/setup/start`, `/api/auth-mfa/setup/verify`

---

## Target Structure

```
packages/shared/src/lib/
├── mfa/
│   ├── index.ts            ← Barrel: re-exports store.ts + types.ts
│   ├── types.ts            ← MfaChallenge, AuthAuditEvent, etc.
│   └── store.ts            ← mfaChallenges, TOTP helpers, audit (moved from apps/main)
├── audit/
│   └── catalog.ts          ← Updated: imports AuthAuditEventType from mfa/types
├── prisma.ts               ← unchanged
├── tenant-context.ts       ← unchanged
└── prisma-helpers.ts       ← unchanged

apps/main/src/app/api/
├── auth-mfa/               ← Route handlers stay, become thin wrappers
│   ├── start/route.ts
│   └── setup/
│       ├── start/route.ts
│       └── verify/route.ts
├── login/route.ts          ← Updated imports to @gaso/shared
└── admin/users/[id]/mfa/reset/route.ts  ← Updated import to @gaso/shared
```

---

## Step-by-Step Execution

### Step 1: Add `@otplib/preset-default` to shared package

**File:** `packages/shared/package.json`

```json
"dependencies": {
  "@otplib/preset-default": "^12.0.1"
}
```

Run `pnpm install` from workspace root.

### Step 2: Create `packages/shared/src/lib/mfa/types.ts`

Extract from `store.ts`:
- `MfaChallengeStatus`
- `MfaChallenge`
- `AuthAuditEventType` (currently duplicated in `audit/catalog.ts` — import from here after)
- `AuthAuditEventStatus`
- `AuthAuditEvent`

### Step 3: Create `packages/shared/src/lib/mfa/store.ts`

Move from `apps/main/src/app/api/auth-mfa/store.ts`:
- `mfaChallenges` → `globalThis` Map (already scope-safe)
- `authAuditLogs` → `globalThis` array
- `getDevTotpSecret()` 
- `getUserTotpSecret()` 
- `getTotpSecretForLogin()` 
- `markTotpFactorUsed()` 
- `markTotpFactorFailedAttempt()` 
- `writeAuthAudit()` 
- Private: `getAuditAction()` 

**Changes in the moved code:**
- Import `prisma` from `'../prisma'` (relative to new location)
- Import `writeTransactionLog, ID_ORIGIN_WEB` from `'../audit/transaction-log'`
- Import types from `'./types'`
- All function signatures unchanged — they already accept `prisma` as first parameter or import the shared singleton

### Step 4: Create `packages/shared/src/lib/mfa/index.ts`

```ts
export * from './types'
export * from './store'
```

### Step 5: Update `packages/shared/src/index.ts`

Add:
```ts
export * from './lib/mfa'
```

### Step 6: De-duplicate `AuthAuditEventType` in `audit/catalog.ts`

Change `audit/catalog.ts` to import the type from the new shared location:
```ts
import type { AuthAuditEventType } from '../mfa/types'
```
Remove the local `AuthAuditEventType` definition.

### Step 7: Rewrite route handlers as thin wrappers

The 3 route files in `apps/main/src/app/api/auth-mfa/` keep Next.js-specific code only:

**`start/route.ts`** → extracts tenant, parses body, calls `getUserTotpSecret()` + `mfaChallenges` from `@gaso/shared`
**`setup/start/route.ts`** → extracts tenant, parses body, generates TOTP via shared, calls `getUserTotpSecret()` + `writeAuthAudit()` from `@gaso/shared`  
**`setup/verify/route.ts`** → extracts tenant, parses body, verifies code via `authenticator` from `@otplib`, calls `writeAuthAudit()` from `@gaso/shared`

All business logic (DB queries, challenge management, TOTP helpers) now comes from `@gaso/shared`.

### Step 8: Update consumers

| File | Change |
|------|--------|
| `apps/main/src/app/api/login/route.ts` | `import { ... } from '../auth-mfa/store'` → `import { ... } from '@gaso/shared'` |
| `apps/main/src/app/api/admin/users/[id]/mfa/reset/route.ts` | `import { ... } from '@/app/api/auth-mfa/store'` → `import { ... } from '@gaso/shared'` |
| `apps/main/src/app/api/auth-mfa/start/route.ts` | `import { ... } from '../store'` → `import { ... } from '@gaso/shared'` |
| `apps/main/src/app/api/auth-mfa/setup/start/route.ts` | `import { ... } from '../../store'` → `import { ... } from '@gaso/shared'` |
| `apps/main/src/app/api/auth-mfa/setup/verify/route.ts` | `import { ... } from '../../store'` → `import { ... } from '@gaso/shared'` |

### Step 9: Delete old `store.ts`

Remove `apps/main/src/app/api/auth-mfa/store.ts`.

### Step 10: Verify

```bash
pnpm --filter main lint
pnpm --filter admin lint
pnpm --filter main typecheck  # or tsc --noEmit
```

---

## Decisions

| Decision | Rationale |
|----------|-----------|
| `mfa/` as subdirectory (not single file) | MFA has types + store + potential for setup helpers. Subdirectory matches `audit/` and `auth/` patterns already in shared lib. |
| `globalThis` stays for `mfaChallenges` | Already global-scoped, works across modules. No need to change. |
| Route handlers stay in `apps/main` | Next.js App Router handlers are tied to file-system routing. Shared logic + thin wrappers is standard pattern. |
| Admin app gets own route files later | Admin will create `apps/admin/src/app/api/auth/mfa/` route handlers importing from `@gaso/shared`. Not part of this migration. |
| `prisma` singleton used directly | Consistent with all other shared lib files (`tenant-context.ts`, `transaction-log.ts`). No parameter passing needed. |
| `@otplib` added to shared deps | Needed for `generateSecret()` and `keyuri()` used by setup route handlers (which import from shared). |
