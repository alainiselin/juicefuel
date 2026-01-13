# JuiceFuel Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Generate Nuxt types (required for typecheck)
npm run dev  # Start once to generate .nuxt/

# Start dev server
npm run dev
```

Visit http://localhost:3000 (or alternate port if 3000 is busy)

## Verification

Run all checks before committing:

```bash
npm run verify
```

This runs:
1. `npm run lint` - ESLint checks (warnings allowed)
2. `npm run typecheck` - TypeScript validation (requires .nuxt/ to be generated)
3. `npm run test -- --run` - Unit tests

**Note**: If typecheck fails, run `npm run dev` once to generate Nuxt types in `.nuxt/` directory.

## Individual Checks

```bash
npm run lint        # ESLint only
npm run typecheck   # TypeScript only (needs .nuxt/)
npm test            # Vitest watch mode
npm run test:ui     # Vitest UI
```

## Dev server

```bash
npm run dev
```

## Key UI Invariants

### Desktop Planner Tabs
- Must show exactly: **Full View**, **Breakfast**, **Lunch**, **Dinner**
- **Snack** must NOT appear on desktop (out of scope)

### Component Resolution
- `DesktopShell` must render (icon sidebar)
- No "Failed to resolve component" warnings in console
- Test catches component resolution issues automatically

### Desktop Layout
- Sidebar: 64px fixed width with icons
- Icons: Profile, Planner, Recipes, Settings
- All pages use `<DesktopShell>` wrapper

## Testing Strategy

- **Unit tests**: Vitest (`server/services/*.test.ts`)
- **Component tests**: Static analysis (`app/**/__tests__/*.spec.ts`)
- **Sanity test**: `app/pages/__tests__/plan.spec.ts` catches component issues

The component sanity test will FAIL if:
- Components fail to resolve
- Desktop tabs include "Snack"
- Required components are missing

This prevents regressions without opening a browser.
