# AGENTS.md — Gaso-SaaS

Repository-specific instructions for AI coding agents working in this monorepo.
These rules are derived from the actual repository. Where behavior could not be
verified, it is explicitly marked **Unknown**.

> Note: source code comments, commit messages, and in-repo docs are written in
> Spanish. Match the surrounding language when adding comments/docs.

---

## 1. Repository Overview

Gaso-SaaS is a **multi-tenant SaaS ERP platform** (fleets, warehouses/inventory,
human capital, projects, expenses, dashboards, permissions) with a separate
**platform/super-admin** console for managing tenants, plans, and platform users.

- **Monorepo tooling:** [pnpm](https://pnpm.io) workspaces + [Turborepo](https://turbo.build).
- **Package manager:** `pnpm@10.33.4` (see `package.json` `packageManager` field). Do not use npm/yarn.
- **Engines:** Node `>=18`, pnpm `>=8`.
- **Frontend:** Next.js `15.1.2` (App Router), React `18.3.1`, TypeScript `5.5.4`.
- **UI:** MUI `6.2.1` + Emotion + Tailwind CSS `3.4.17` (preflight disabled).
- **Data:** Prisma `6.19.2` against **SQL Server** (multi-schema: `Audit`, `HumanCapital`, `Security`, `dbo`).
- **Auth:** NextAuth.js `4.24.11` + custom RBAC (see §9 and `packages/shared/src/docs/RBAC_GUIA_RUTAS_Y_VISTAS.md`).

The platform is a Spanish-language product. Public/tenant-facing UI is
internationalized (`es` / `en`).

---

## 2. Monorepo Structure

```
gaso-saas/
├── apps/
│   ├── main/          @gaso/main  — main tenant ERP app (port 3000, subdomain multi-tenant)
│   └── admin/         @gaso/admin — platform/super-admin console (port 3001)
├── packages/
│   └── shared/        @gaso/shared — shared lib (Prisma, RBAC, plans, tenant context, auth, audit, MFA)
├── scripts/sql/       manual, forward-only SQL migration/seed scripts (run manually, not by Prisma)
├── turbo.json         Turborepo task pipeline
├── pnpm-workspace.yaml
├── amplify-main.yml   AWS Amplify deploy config (main)
├── amplify-admin.yml  AWS Amplify deploy config (admin)
├── .planning/         SDD plans/specs (ignored by git)
└── .plans/            planning notes (ignored by git)
```

Workspace config: `pnpm-workspace.yaml` globs `apps/*` and `packages/*`. It also
declares `allowBuilds` for `@prisma/client`, `@prisma/engines`, `esbuild`, `prisma`,
and `sharp` (native build steps allowed during install).

### Root scripts (`package.json`)

| Script | Effect |
|--------|--------|
| `pnpm dev` | `turbo dev` (starts **both** dev servers — do NOT run, see §8) |
| `pnpm dev:main` | `pnpm --filter @gaso/main dev` (dev server — do NOT run) |
| `pnpm dev:admin` | `pnpm --filter @gaso/admin dev` (dev server — do NOT run) |
| `pnpm build` / `build:main` / `build:admin` | production builds |
| `pnpm lint` | `turbo lint` (runs `lint` script in each workspace that defines one) |
| `pnpm format` | `turbo format` (only `apps/main` defines a `format` script) |

There is **no root `test`, `typecheck`, or `migrate` script**.

---

## 3. Application and Package Boundaries

Three workspaces with hard boundaries. Respect them; do not cross-pollinate.

### `apps/main` (`@gaso/main`)
The tenant-facing ERP. **Multi-tenant via subdomain.** `src/middleware.ts` resolves
the tenant from the `Host` header (or `x-tenant-slug` for the mobile origin) and
injects `x-tenant-id`, `x-tenant-slug`, `x-tenant-name` headers. Routes are
localized under `src/app/[lang]/...` (`es`/`en`). Contains the **Prisma schema**
(`src/prisma/schema.prisma`) and owns the `migrate` script.

### `apps/admin` (`@gaso/admin`)
The platform console. **Single platform context (no tenant).** `src/middleware.ts`
guards by `platformRole` from the NextAuth token and injects `x-admin-user-id` /
`x-admin-role`. Routes live under `src/app/admin/...` and `src/app/api/admin/...`.
Business logic lives in `src/services/*.ts`.

### `packages/shared` (`@gaso/shared`)
Shared, framework-agnostic core. Exported via `src/index.ts`. Holds the Prisma
clients, tenant-context helpers, RBAC core, plan enforcement, MFA, audit catalog,
and shared types. Consumed by both apps (`workspace:*`). Consume it **only** through
`@gaso/shared` (or `@gaso/shared/...`) imports — see §11 for aliases.

**Boundary rules:**
- Do not import `apps/main` code from `apps/admin` or vice versa.
- Do not import app code into `packages/shared` (it must stay dependency-free of the apps).
- Changes to `packages/shared` affect both apps — treat as wide-blast-radius (see §13).

---

## 4. Instruction Hierarchy

When multiple instruction sources conflict, the **most specific** wins:

1. This `AGENTS.md` (repo root).
2. Per-area in-repo docs, most importantly:
   - `packages/shared/src/docs/RBAC_GUIA_RUTAS_Y_VISTAS.md` — authoritative guide for
     protecting routes/pages with RBAC. **Read it before touching auth/RBAC.**
   - `.planning/*.md` and `.plans/*.md` — approved SDD specs/plans. When a plan exists
     for your task, it is the source of truth for that task.
3. Local per-workspace config (`.eslintrc.js`, `.prettierrc.json`, `tsconfig.json`, `next.config.ts`, etc.).
4. The global user-level `AGENTS.md` (spec-driven development methodology).

Follow the SDD methodology from the global `AGENTS.md`: investigate, spec, plan,
then implement; validate against acceptance criteria. Record non-trivial specs/plans
in `.planning/`.

---

## 5. Code Generation Rules

- Generate code that compiles under the **strictest applicable TypeScript + ESLint
  configuration for the file's workspace** (see §6, §7).
- Match existing naming, directory, and import conventions (see §10, §11).
- Prefer existing utilities/abstractions over new ones (see §9).
- Write self-documenting code; add comments only when they explain *why*, and write
  them in Spanish to match the codebase.
- Do not generate code that emits new ESLint errors or TypeScript errors.
- Never weaken typing to make code pass (no gratuitous `any` — note `any` is
  *allowed but discouraged* by the `apps/main` ESLint config; see §6).

---

## 6. ESLint Rules and Local Configuration

### Mandatory compliance
- AI-generated code **must comply with the ESLint configuration applicable to the
  workspace being modified**.
- **Local ESLint config takes precedence over generic coding preferences.** When the
  target location is ambiguous, inspect the applicable config first.
- **Different workspaces have different rules.** Apply the rules of the file's own
  workspace, never a single global style.
- Do **not** bypass, disable, weaken, or circumvent existing ESLint rules.
- Do **not** introduce new suppressions (`eslint-disable`, `eslint-disable-next-line`,
  `/* eslint-disable ... */`, `// @ts-ignore`, etc.) unless explicitly required and
  justified. Pre-existing suppressions may remain but must not be copied into new code.
- Run the applicable lint command before considering work complete (see §12).

### Discovered ESLint configurations (do not invent rules beyond these)

**`apps/main/.eslintrc.js`** (the only `.eslintrc` in the repo):
- `extends`: `next/core-web-vitals`, `plugin:@typescript-eslint/recommended`,
  `plugin:import/recommended`, `prettier` (prettier last → disables formatting rules).
- `ignorePatterns`: `src/app/api/v1/*`, `src/views/apps/*` (legacy/template code, "only QA").
- **Actively enforced rules** (must be respected in new `apps/main` code):
  - `@typescript-eslint/consistent-type-imports` — use `import type` for type-only imports.
  - `@typescript-eslint/no-unused-vars` (with `ignoreRestSiblings: true`) — no unused vars.
  - `@typescript-eslint/ban-types` — forbids wrapper types `Function`, `Object`,
    `Boolean`, `Number`, `String`, `Symbol`; but `{}` and `any` are explicitly allowed.
  - `import/order` — import groups `[builtin, external, [internal,parent,sibling,index],
    [object,unknown]]`; `react` and `next/**` first among externals; `@/**` treated as
    internal; `newlines-between: always-and-inside-groups`.
  - `import/newline-after-import` (count 1).
  - `newline-before-return` — blank line before `return`.
  - `padding-line-between-statements` — blank line before/after functions, multiline
    `const` and multiline block-like statements; blank line after `const`/`let`/`var` groups.
  - `lines-around-comment` — blank line around comments.
- **Explicitly disabled** (do not add these back as blockers): `jsx-a11y/alt-text`,
  `react/display-name`, `react/no-children-prop`, `@next/next/no-img-element`,
  `@next/next/no-page-custom-font`, `@typescript-eslint/ban-ts-comment`,
  `@typescript-eslint/no-explicit-any`, `@typescript-eslint/no-non-null-assertion`,
  `import/named`.
- `overrides` for `*.ts`/`*.tsx`: `no-var-requires` off, `explicit-module-boundary-types` off.

**`apps/admin`** — has a `lint` script (`next lint`) but **no `.eslintrc.js`**. It
falls back to Next.js defaults. Do not assume `apps/main`'s rules apply here.

**`packages/shared`** — has **no `lint` script and no ESLint config**. It is only
covered by TypeScript `strict`. Do not assume ESLint rules apply here.

---

## 7. TypeScript Rules

- All three workspaces enable `strict: true`.
- `apps/main` and `apps/admin` use `moduleResolution: "Bundler"`, `noEmit: true`,
  `jsx: "preserve"`, and path aliases (see §11). `skipLibCheck: true` in both.
- `packages/shared` uses `target: ES2017`, `module: commonjs`, `declaration: true`,
  `outDir: ./dist`, `rootDir: ./src` — keep it free of browser/DOM-only APIs.
- Do not introduce `// @ts-ignore`, `@ts-nocheck`, or unsound casts to make code pass.
- There is **no root `tsconfig.json`** and **no root typecheck script**. Type-check
  per workspace (see §12).

---

## 8. Development Server Restrictions (STRICT)

**Do NOT start development servers automatically.** This includes, but is not limited to:

- `pnpm dev`, `turbo dev`, `next dev`, `next dev --turbopack`
- `pnpm --filter @gaso/main dev`, `pnpm --filter @gaso/admin dev`
- `next start`, `vite`, `nx serve`, `turbo dev`, Docker-based dev environments
- any equivalent long-running server.

You may inspect configuration, source, scripts, and build tooling without starting a server.

If runtime validation requires a server:
1. Explain that a server is required.
2. Ask the user to start it, or explicitly authorize you to start it.
3. Never start it on your own initiative.

**Short-lived commands are allowed** when appropriate: linting, type checking,
unit tests (`vitest`), production builds, formatting checks, static analysis.

---

## 9. Architecture and Design Principles

- **Understand the existing architecture before changing it.** Read the RBAC guide
  (`packages/shared/src/docs/RBAC_GUIA_RUTAS_Y_VISTAS.md`) before touching any
  auth/RBAC/tenant code.
- **Prefer existing patterns over new ones.** Reuse existing components, services,
  hooks, HOFs (`withPermission`, `withTenantContext`), types, and utilities.
- **Avoid duplicating functionality** that already exists in `packages/shared` or elsewhere.
- **Avoid unnecessary dependencies** and unnecessary architectural changes.
- **Respect workspace boundaries** (§3). Do not modify unrelated apps/packages.

### Security invariants (from the RBAC guide — treat as hard rules)
The repo defines **four security "floors"** that every protected API route must satisfy:

1. **Authentication** — resolved by `withPermission` / `requireViewAccess`.
2. **Tenant isolation** — always `withTenantContext(tenantId, tx => ...)`, never `setTenantContext` (pooled, leaks context across requests).
3. **RBAC** — `withPermission(viewCode, { bit })` for API routes, `requireViewAccess(viewCode)` for server-component pages.
4. **Input parameterization** — only `$queryRaw` with tagged templates / `Prisma.sql`; **never** `$queryRawUnsafe` or string-concatenated SQL.

Additional hard rules documented in-repo:
- Set tenant context and run queries on the **same** `tx` connection; never mix `tx`
  context with the global `prisma` client.
- Permission bitmask: `R=1, W=2, U=4, D=8`; `W`/`U`/`D` require `R`. Never reorder bits.
- Normalize SQL Server GUIDs with `.toLowerCase()` before comparison (DB returns uppercase, headers/JWT lowercase).
- `isAdmin` means "can grant permissions", **not** "sees everything" — it is not an RBAC bypass.
- In `apps/main`, the `/api/admin/` prefix is **excluded** from the middleware matcher
  and receives **no** `x-tenant-id`; it is for platform/super-admin routes only. Tenant
  RBAC routes must live outside that prefix.
- The middleware resolves **tenant identity only**; authorization lives in handlers/pages, not the middleware.

---

## 10. Repository Conventions

Conventions marked **Observed** are verified in the repo; **Inferred** are strongly
implied; **Unknown** cannot be determined.

### Data access & services (Observed)
- API route handlers are **thin**; business logic lives in `apps/main/src/lib/<domain>/`
  (e.g. `lib/permissions/assign-permission.ts`) or `apps/admin/src/services/*.ts`.
- Services open their own `withTenantContext` transaction and return plain results;
  endpoints audit *after* commit (service does not audit internally).
- DataTables-style responses use `serversideResponse` / `{ draw, recordsTotal, recordsFiltered, data }`
  (`apps/main/src/lib/api-utils.ts`).
- Prisma is accessed through the shared `prisma` / `prismaAdmin` clients
  (`packages/shared/src/lib/prisma.ts`). Raw SQL is heavily used via `$queryRaw`.

### API organization (Observed)
- App Router route handlers (`route.ts`) under `src/app/api/...`.
- `apps/main/src/app/api/v1/*` and `src/views/apps/*` are legacy/template code,
  ESLint-ignored ("only QA"). Do not extend them; new work goes outside `v1`.

### Auth & RBAC (Observed)
- Web session via NextAuth cookie; mobile origin via Bearer token (`x-origin-id: 3`).
- `apps/admin` platform roles come from `token.platformRole` (e.g. `auditor`).

### State management (Observed)
- Redux Toolkit for app slices (`apps/main/src/redux-store/slices/*`).
- React Context for dictionary/i18n, intersection, NextAuth provider
  (`apps/main/src/contexts/*`).

### Styling (Observed)
- MUI + Emotion; Tailwind configured with `preflight: false`, `important: '#__next'`,
  and `tailwindcss-logical`. Logical (RTL-safe) properties are enforced by stylelint
  (`apps/main/.stylelintrc.json`).

### i18n (Observed)
- Locales `es`/`en`, route segment `[lang]`, dictionary context
  (`apps/main/src/contexts/dictionaryContext.tsx`, `src/data/dictionaries`).
- Navigation labels use i18n keys; each nav item carries a `viewCode` for RBAC
  (`apps/main/src/lib/erp-navigation.ts`).

### Formatting (Observed, with inconsistency)
- `apps/main/.prettierrc.json` is the formatter of record: no semicolons, single
  quotes, `printWidth: 120`, `trailingComma: "none"`, `arrowParens: "avoid"`,
  `tabWidth: 2`. **However**, the codebase contains mixed styles (some newer files
  use semicolons). Run `pnpm --filter @gaso/main format` (Prettier) rather than
  hand-guessing; do not reformat unrelated files.
- `apps/admin` and `packages/shared` have **no** Prettier config. Match the
  prevailing style in the file you edit. (Unknown: no explicit formatter for these.)

### Database migrations (Observed)
- Prisma migrations folder exists (`apps/main/src/prisma/migrations`), but schema
  changes are also managed via manual forward-only SQL scripts in `scripts/sql/`
  (`YYYYMMDD_*.sql`), applied by hand. The RBAC guide describes creating new RBAC
  views via idempotent SQL scripts in `scripts/sql/`. Do not run migrations on your own.

### Git conventions (Observed)
- Conventional-ish commit prefixes mixed with project tags: `feat(...)`, `refactor(...)`,
  `fix`, plus `[ADD]:`, `[REF]:`, `[REF] ...`. Merges via GitHub PRs into `develop*` branches.
- `.planning/`, `.plans/`, `.turbo/`, `.next/`, `node_modules`, `.env`, `.env*.local`
  are gitignored.

---

## 11. Import Conventions and Path Aliases

Use the existing aliases; do not invent new ones.

**`apps/main` (`tsconfig.json`):**
- `@/*` → `./src/*`
- `@core/*`, `@layouts/*`, `@menu/*`, `@components/*`, `@configs/*`, `@views/*`, `@assets/*`
- `@gaso/shared` and `@gaso/shared/*` → `../../packages/shared/src[*]`
- Specific shared re-exports are aliased to `@/...` (e.g. `@/lib/prisma`,
  `@/lib/tenant-context`, `@/lib/audit/*`, `@/libs/auth`, `@/types/me`) — prefer the
  canonical `@gaso/shared` import for shared code.

**`apps/admin` (`tsconfig.json`):**
- `@/*` → `./src/*`; `@core/*`, `@layouts/*`, `@menu/*`, `@components/*`, `@configs/*`, `@/types/*`
- `@gaso/shared` and `@gaso/shared/*` → `../../packages/shared/src[*]`

**`packages/shared`:** relative imports within `src/`.

`apps/admin/next.config.ts` sets `transpilePackages: ['@gaso/shared']` (the shared
package is consumed as source). Vitest (in `apps/main`) mirrors the aliases in
`apps/main/vitest.config.ts` — keep that in sync when adding aliases.

---

## 12. Testing and Validation

Prefer repo-defined scripts; scope to the affected workspace.

| Purpose | Command | Scope |
|---------|---------|-------|
| Lint (all workspaces that define it) | `pnpm lint` (turbo) | root |
| Lint main | `pnpm --filter @gaso/main lint` (or `lint:fix`) | `apps/main` |
| Lint admin | `pnpm --filter @gaso/admin lint` | `apps/admin` |
| Format (Prettier) | `pnpm --filter @gaso/main format` | `apps/main` |
| Type check | `pnpm exec tsc --noEmit` (from `apps/main` or `apps/admin`) | per workspace |
| Unit tests | `pnpm --filter @gaso/main test` (`vitest`) | `apps/main` |
| Build main | `pnpm build:main` | `apps/main` |
| Build admin | `pnpm build:admin` | `apps/admin` |

Notes:
- `next lint` is used by both apps (Next 15 deprecates it, but it is what the repo runs).
- Tests: Vitest in `apps/main` only. Test files match `src/**/*.test.ts(x)`
  (`apps/main/vitest.config.ts`). Existing tests live in `src/lib/tenant-settings/*.test.ts`.
  `apps/admin` and `packages/shared` have **no** tests.
- Coverage is configured for `src/lib/tenant-settings/**/*.ts` (v8 provider).
- There is **no** integration/E2E test setup and **no** `.github` CI workflows (Unknown).
- Prisma generation/migrations (`pnpm exec prisma generate`, `pnpm migrate`) must not
  be run automatically; they modify the DB/generated client.

Do **not** run dev servers as part of validation (see §8). A successful validation is
required before marking work complete; if a check fails, fix the code — do not weaken
the check.

---

## 13. Change Scope and Safety

- Make the **smallest change necessary**; avoid unrelated refactors.
- Do not change public APIs (exported functions/types, route contracts) without justification.
- Preserve backwards compatibility where applicable.
- Do not modify generated files (e.g. Prisma client, `next-env.d.ts`,
  `generated-icons.js/css`) unless explicitly required; regenerate instead of hand-editing.
- Do not change dependency versions or lockfiles unless required.
- Do not change config merely to make generated code pass validation.
- Never weaken linting, type safety, or quality gates to make a change pass.
- **Wide-blast-radius changes** (in `packages/shared`, the middleware matcher, route
  prefix moves, ESLint/tsconfig, `turbo.json`) should be called out and ideally isolated
  in their own change/PR (see RBAC guide §10).

---

## 14. Environment and Secrets

- Environment variables are loaded from `.env` (root and per-app:
  `apps/main/.env`, `apps/admin/.env`). `.env` and `.env*.local` are gitignored.
- `.env.example` files exist in both apps and list the expected variables. Key variables:
  - `NEXTAUTH_SECRET` (must be unique per app), `NEXTAUTH_URL`
  - `DATABASE_URL` (SQL Server)
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
  - `MAPBOX_ACCESS_TOKEN`
  - `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PUBLIC_BASE_URL`
  - `BASEPATH`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, `API_URL`
  - `MOBILE_JWT_SECRET` (mobile origin)
  - `SAAS_ROOT_TENANT_ID` (admin app)
- `turbo.json` treats `.env` and `pnpm-workspace.yaml` as global dependencies and
  exposes `PRISMA_QUERY_ENGINE_LIBRARY`, `PRISMA_QUERY_ENGINE_BINARY`,
  `PRISMA_SCHEMA_ENGINE_BINARY`, and `DATABASE_URL` as global env.
- **Never commit secrets.** Do not read or echo `.env` contents into output/logs.
  When adding a variable, document it in the relevant `.env.example` (no real values).

---

## 15. Git and Commit Guidelines

- Do not commit, push, or open PRs unless explicitly asked.
- Before committing, inspect `git status`, `git diff`, and `git log --oneline -10`;
  stage only intended files; never commit secrets or `.env`.
- Match the repo's existing commit-message style (conventional prefixes and/or
  `[ADD]:`/`[REF]:` tags, Spanish descriptions).
- Do not modify git config, skip hooks, force-push, or create empty commits unless asked.

---

## 16. Troubleshooting / Common Pitfalls

Documented in-repo (read the full RBAC guide for details):

- **Silent zero-row results** — tenant context set on one connection but queried on
  another (global `prisma` vs `tx`). Always run queries on the same `tx` that set context.
- **`withTenantContext` vs `setTenantContext`** — the latter is pooled and can leak a
  tenant context across requests. Use `withTenantContext` in new code.
- **GUID casing mismatch** — normalize with `.toLowerCase()` before comparing tenants.
- **`$queryRawUnsafe`** — forbidden; always parameterized.
- **`/api/admin/` has no tenant header** — do not put tenant-RBAC routes there.
- **Page guard is UX only** — a `requireViewAccess` on a page does not protect its data;
  the underlying API must also be protected.
- **Menu visibility is not authorization** — the menu (`erp-navigation.ts`) is filtered
  by `me.views`; page/API guards are the real authority.
- **Formatting drift** — the repo mixes semicolon and no-semicolon styles; rely on the
  workspace formatter, and don't reformat unrelated files.

---

## 17. Unknowns and Undocumented Areas

Explicitly unverified — do not invent rules to fill these gaps:

- **`apps/admin` ESLint/Prettier/stylelint** — no config files; exact enforced rules are Unknown (assumed Next defaults).
- **`packages/shared`** — no lint/format/test scripts; only `strict` TypeScript applies.
- **CI/CD** — no `.github/` workflows found; CI is AWS Amplify (`amplify-*.yml`). Local CI specifics Unknown.
- **Integration/E2E tests** — none found.
- **Root typecheck** — none; type-check per workspace.
- **Test conventions beyond `apps/main/src/lib/tenant-settings`** — Unknown; follow the existing vitest pattern if adding tests.
- **Database migration workflow** — Prisma migrations exist but `scripts/sql/` are manual
  and forward-only; do not apply them without explicit user direction.

When a convention is not documented here or in the repo, prefer the pattern of the
nearest neighboring file and mark the decision in your change description rather than
inventing a project-wide rule.
