# Plan: Apply Main App UI to Admin App

## Goal
Replicate the full UI, layout, and CSS from `apps/main/` into `apps/admin/`, adapted for the admin context (no i18n, admin-specific navigation, vertical layout only).

---

## Phase 1: Dependencies & Configuration

### 1.1 Add npm dependencies to `apps/admin/package.json`

**New dependencies:**
- `classnames` - Used by layout components
- `react-perfect-scrollbar` - Custom scrollbars in sidebar

**New devDependencies:**
- `tailwindcss` - Tailwind CSS
- `tailwindcss-logical` - RTL-aware logical CSS utilities
- `autoprefixer` - PostCSS autoprefixer
- `postcss` - PostCSS for Tailwind processing
- `stylis` - CSS-in-JS preprocessor for MUI + RTL
- `stylis-plugin-rtl` - RTL plugin for MUI

### 1.2 Copy configuration files from main
- `tailwind.config.ts` → `apps/admin/tailwind.config.ts` (adapt content paths)
- `postcss.config.mjs` → `apps/admin/postcss.config.mjs`
- `apps/main/src/app/globals.css` → `apps/admin/src/app/globals.css`

### 1.3 Update `apps/admin/tsconfig.json`
Add path aliases:
```json
"@core/*": ["./src/@core/*"],
"@layouts/*": ["./src/@layouts/*"],
"@menu/*": ["./src/@menu/*"],
"@components/*": ["./src/components/*"],
"@configs/*": ["./src/configs/*"]
```

---

## Phase 2: Core Infrastructure (Copy from main → admin)

### 2.1 Copy entire `@core/` directory
`apps/main/src/@core/` → `apps/admin/src/@core/`

Contains:
- **theme/** - MUI theme engine (index, colorSchemes, customShadows, shadows, spacing, typography, component overrides)
- **contexts/settingsContext.tsx** - Theme/layout settings (adapt: update cookie name, home page URL)
- **hooks/** - useSettings, useImageVariant, useLayoutInit, useObjectCookie
- **styles/** - Table styles, stepper styles, vertical menu styles
- **svg/** - Layout-related SVG icons (ContentCompact, LayoutVertical, etc.)
- **tailwind/plugin.ts** - Custom Tailwind plugin (colors, shadows, border-radius, etc.)
- **types.ts** - Shared TypeScript types
- **utils/serverHelpers.ts** - Server-side helpers for mode/settings cookies
- **components/** - scroll-to-top, custom-inputs, option-menu, MUI overrides

### 2.2 Copy entire `@menu/` directory
`apps/main/src/@menu/` → `apps/admin/src/@menu/`

Contains the complete menu system:
- **vertical-menu/** - VerticalNav, Menu, MenuItem, SubMenu, MenuSection, NavHeader, etc.
- **horizontal-menu/** - Horizontal menu components (unused but harmless)
- **contexts/** - verticalNavContext, horizontalNavContext
- **hooks/** - useVerticalNav, useVerticalMenu, useHorizontalNav, etc.
- **styles/** - Styled components for vertical/horizontal menus
- **utils/** - menuClasses, menuUtils
- **defaultConfigs.ts**
- **types.ts**
- **components/RouterLink.tsx**

### 2.3 Copy theme provider component
`apps/main/src/components/theme/` → `apps/admin/src/components/theme/`

- `index.tsx` - CustomThemeProvider (MUI ThemeProvider + AppRouterCacheProvider + RTL support)
- `ModeChanger.tsx`
- `mergedTheme.ts`
- `userTheme.ts`
- `types.ts`

---

## Phase 3: Layout Components (Copy from main → admin)

### 3.1 Copy layout system
`apps/main/src/@layouts/` → `apps/admin/src/@layouts/`

- **VerticalLayout.tsx**
- **BlankLayout.tsx**
- **LayoutWrapper.tsx** (remove horizontal layout logic, keep vertical-only)
- **components/vertical/** - Footer, LayoutContent, Navbar
- **styles/vertical/** - StyledContentWrapper, StyledFooter, StyledHeader
- **styles/shared/** - StyledMain
- **utils/layoutClasses.ts**

### 3.2 Copy layout components
**Shared components** (`components/layout/shared/`):
- `Logo.tsx` - Adapt: remove locale dependency, use admin home URL
- `ModeDropdown.tsx` - Dark/light mode toggle
- `UserDropdown.tsx` - User menu with logout

**Vertical components** (`components/layout/vertical/`):
- `Navbar.tsx` - Top navbar (horizontal bar in vertical layout)
- `NavbarContent.tsx` - Navbar content
- `NavToggle.tsx` - Toggle sidebar
- `Footer.tsx` - Footer wrapper
- `FooterContent.tsx`
- `VerticalMenu.tsx` - Menu wrapper for vertical menu items
- `Navigation.tsx` - **ADAPT**: Remove i18n/dictionary, use admin navigation config

### 3.3 Copy utility components
- `components/GenerateMenu.tsx` - **ADAPT**: Remove i18n (no getLocalizedUrl), support admin menu types
- `components/DirectionalIcon.tsx`
- `components/Illustrations.tsx`

---

## Phase 4: Admin-Specific Integration

### 4.1 Create admin navigation config
**New file:** `src/configs/adminNavigation.ts`

Define admin menu structure:
```typescript
export const adminNavigation = [
  {
    id: 'tenants',
    label: 'Tenants',
    href: '/admin/tenants',
    icon: 'ri-building-line'
  },
  {
    id: 'audit',
    label: 'Audit Log',
    href: '/admin/audit',
    icon: 'ri-file-list-line'
  }
]
```

### 4.2 Adapt theme config
Copy `apps/main/src/configs/themeConfig.ts` → `apps/admin/src/configs/themeConfig.ts`

Changes:
- `templateName: 'Gaso Admin'`
- `homePageUrl: '/admin/tenants'`
- `settingsCookieName: 'gaso-admin'`
- Keep layout as `vertical`

### 4.3 Copy primary color config
`apps/main/src/configs/primaryColorConfig.ts` → `apps/admin/src/configs/primaryColorConfig.ts` (no changes)

### 4.4 Rewrite `components/Providers.tsx`
Adapt from main's Providers but simplify:
- `NextAuthProvider` - Admin auth
- `SettingsProvider` - Theme/layout settings
- `ThemeProvider` - MUI theme (without RTL since no i18n, or keep for future use)
- `AppReactToastify` - Toast notifications
- Remove: `VerticalNavProvider` (move to dashboard layout), `ReduxProvider` (not needed)

### 4.5 Adapt `components/layout/vertical/Navigation.tsx`
Changes:
- Remove `dictionary` and `mode` props
- Remove i18n-dependent: `useParams`, `getLocalizedUrl`, `Locale`, `getDictionary`
- Replace menu data source with `adminNavigation` config
- Simplify the `NavHeader` link (no locale in URL)
- Remove collapsed layout toggle (admin doesn't need it)

### 4.6 Adapt `components/GenerateMenu.tsx`
Changes:
- Remove `getLocalizedUrl` usage, use `href` directly
- Remove `useParams` and `Locale` imports
- Remove `excludeLang` property handling
- Keep `GenerateVerticalMenu`, remove `GenerateHorizontalMenu` (unused)

---

## Phase 5: Layout Pages Rewrite

### 5.1 Rewrite root layout (`src/app/layout.tsx`)
```tsx
// Similar to main's [lang]/layout.tsx but simpler:
// - No TranslationWrapper (no i18n)
// - No lang/direction params
// - html with id='__next', no dir attribute
// - InitColorSchemeScript for dark mode
// - Import globals.css
// - Wrap with Providers
```

### 5.2 Rewrite dashboard layout (`src/app/admin/(dashboard)/layout.tsx`)
Replace current simple sidebar+content with full vertical layout:
```tsx
// Similar to main's (dashboard)/(private)/layout.tsx:
// - Providers (moved to root, so not needed here)
// - AuthGuard or auth check
// - VerticalLayout with:
//   - navigation={<Navigation />} (adapted for admin)
//   - navbar={<Navbar />}
//   - footer={<Footer />}
// - ScrollToTop button
```

### 5.3 Create login layout (`src/app/admin/login/layout.tsx`)
```tsx
// Use BlankLayout for centered login page
<BlankLayout>
  {children}
</BlankLayout>
```

### 5.4 Create a simple auth guard for admin
**New file:** `src/hocs/AdminAuthGuard.tsx`
- Check session for admin role
- Redirect to `/admin/login` if not authenticated

---

## Phase 6: Update Existing Pages

### 6.1 Update login page (`src/app/admin/login/page.tsx`)
- Remove the outer Box with `grey.100` background (now handled by BlankLayout)
- Keep the form component unchanged
- Add the main app's styling context (will inherit from theme)

### 6.2 Existing dashboard pages
- `src/app/admin/(dashboard)/page.tsx` - Dashboard home
- `src/app/admin/(dashboard)/tenants/` - Tenant pages
- `src/app/admin/(dashboard)/audit/` - Audit pages
- These will now render inside the new VerticalLayout, inheriting its styling

---

## Phase 7: Cleanup

### 7.1 Remove old components
Delete:
- `src/components/layout/AdminSidebar.tsx` (replaced by VerticalNav)
- `src/components/layout/AdminHeader.tsx` (replaced by Navbar)

### 7.2 Update providers reference
Ensure `src/app/layout.tsx` imports the new Providers, not the old one

### 7.3 Run install & build
```bash
cd apps/admin && pnpm install
pnpm build
```

---

## File Change Summary

### Files to copy (as-is, ~80 files):
| Source (main) | Destination (admin) |
|---|---|
| `src/@core/` (entire dir) | `src/@core/` |
| `src/@menu/` (entire dir) | `src/@menu/` |
| `src/@layouts/styles/` | `src/@layouts/styles/` |
| `src/@layouts/utils/` | `src/@layouts/utils/` |
| `src/@layouts/components/vertical/` | `src/@layouts/components/vertical/` |
| `src/@layouts/BlankLayout.tsx` | `src/@layouts/BlankLayout.tsx` |
| `src/components/theme/` (entire dir) | `src/components/theme/` |
| `src/components/DirectionalIcon.tsx` | `src/components/DirectionalIcon.tsx` |
| `src/components/Illustrations.tsx` | `src/components/Illustrations.tsx` |
| `src/components/layout/shared/ModeDropdown.tsx` | `src/components/layout/shared/ModeDropdown.tsx` |
| `src/components/layout/shared/UserDropdown.tsx` | `src/components/layout/shared/UserDropdown.tsx` |
| `src/components/layout/vertical/Navbar.tsx` | `src/components/layout/vertical/Navbar.tsx` |
| `src/components/layout/vertical/NavbarContent.tsx` | `src/components/layout/vertical/NavbarContent.tsx` |
| `src/components/layout/vertical/NavToggle.tsx` | `src/components/layout/vertical/NavToggle.tsx` |
| `src/components/layout/vertical/Footer.tsx` | `src/components/layout/vertical/Footer.tsx` |
| `src/components/layout/vertical/FooterContent.tsx` | `src/components/layout/vertical/FooterContent.tsx` |
| `src/components/layout/vertical/VerticalMenu.tsx` | `src/components/layout/vertical/VerticalMenu.tsx` |
| `src/configs/primaryColorConfig.ts` | `src/configs/primaryColorConfig.ts` |
| `src/app/globals.css` | `src/app/globals.css` |
| `tailwind.config.ts` | `tailwind.config.ts` (update content paths) |
| `postcss.config.mjs` | `postcss.config.mjs` |

### Files to copy then adapt (~8 files):
| Source (main) | Destination (admin) | Changes |
|---|---|---|
| `src/configs/themeConfig.ts` | `src/configs/themeConfig.ts` | Update brand name, cookie, home URL |
| `src/components/Providers.tsx` | `src/components/Providers.tsx` | Remove Redux, move VerticalNavProvider |
| `src/components/layout/shared/Logo.tsx` | `src/components/layout/shared/Logo.tsx` | Remove locale from link |
| `src/components/layout/vertical/Navigation.tsx` | `src/components/layout/vertical/Navigation.tsx` | Remove i18n, use admin nav config |
| `src/components/GenerateMenu.tsx` | `src/components/GenerateMenu.tsx` | Remove i18n, simplify href |
| `src/@layouts/VerticalLayout.tsx` | `src/@layouts/VerticalLayout.tsx` | Review imports |
| `src/@layouts/LayoutWrapper.tsx` | `src/@layouts/LayoutWrapper.tsx` | Remove horizontal layout |
| `src/@core/contexts/settingsContext.tsx` | `src/@core/contexts/settingsContext.tsx` | Update cookie name |

### New files to create (~2 files):
| File | Purpose |
|---|---|
| `src/configs/adminNavigation.ts` | Admin menu items definition |
| `src/hocs/AdminAuthGuard.tsx` | Route protection for admin pages |

### Files to rewrite (~3 files):
| File | Changes |
|---|---|
| `src/app/layout.tsx` | Full layout with html/bidirectional, Providers, CSS imports |
| `src/app/admin/(dashboard)/layout.tsx` | VerticalLayout with Navigation/Navbar/Footer |
| `src/app/admin/login/layout.tsx` | BlankLayout wrapper |

### Files to delete (~2 files):
| File | Reason |
|---|---|
| `src/components/layout/AdminSidebar.tsx` | Replaced by VerticalNav |
| `src/components/layout/AdminHeader.tsx` | Replaced by Navbar |

---

## Dependencies Graph

```
Phase 1 (Deps/Config)
    ↓
Phase 2 (Core Infrastructure) needed by
    ↓
Phase 3 (Layout Components) needed by
    ↓
Phase 4 (Admin Integration) needed by
    ↓
Phase 5 (Layout Pages) needed by
    ↓
Phase 6 (Page Updates)
    ↓
Phase 7 (Cleanup & Verify)
```

---

## Risk / Notes

1. **Stylis/RTL**: The admin app may not need RTL support. Consider removing `stylis-plugin-rtl` from the theme provider if not needed, or keep it for consistency.

2. **Remixicon**: The main app uses `remixicon` (e.g., `ri-arrow-up-line`, `ri-building-line`) icons via CSS. These are loaded in the main app's icon CSS file. Need to ensure icon font is available in admin. Either:
   - Copy the icon build pipeline (`src/assets/iconify-icons/bundle-icons-css.ts` → package.json script)
   - Or use MUI icons (`@mui/icons-material`) instead for the admin's limited icon needs
   - Or add `remixicon` npm package

3. **VerticalNavProvider**: Needs to be inside Providers (before SettingsProvider) or at the dashboard layout level. Main puts it in Providers.tsx.

4. **Admin auth flow**: Admin uses a different NextAuth config (credentials + MFA). The auth guard and providers need to work with the admin's auth routes (`/api/auth/[...nextauth]`).

5. **Page props**: The existing admin pages use server components. The new VerticalLayout is a client component (uses `'use client'`). Need to ensure compatibility.
