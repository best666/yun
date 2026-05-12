# AGENTS.md - @yun/app AI Development Guide

## Scope

This file applies to the frontend app package at `apps/app`.

Target stack:
- uni-app
- Vue 3 + TypeScript
- Vite 5
- UnoCSS
- Pinia
- alova request layer

Supported targets:
- H5
- WeChat Mini Program
- App

This guide is for AI code generation and refactoring. The goal is not to produce the most abstract code. The goal is to produce code that can run now, fits the current project, and stays easy to maintain after a few rounds of iteration.

## First Principles

1. Prefer extending existing modules over creating parallel implementations.
2. Keep code simple, direct, and runnable. Do not output placeholder logic or pseudo code.
3. Prioritize clear responsibilities before reuse.
4. Page-local state stays in the page by default.
5. Only extract a hook when the logic is a real reusable side-effect state machine.
6. Only move state into Pinia when it is truly cross-page, persistent, or globally coordinated.
7. Keep platform differences inside adapter utilities, hooks, or conditional compilation blocks. Do not scatter platform branches across pages.

## Project Context

This package is a business frontend app in a pnpm monorepo, not a generic template package.

Important characteristics:
- Commands are usually run from the monorepo root with `pnpm --filter @yun/app ...`.
- `src/service/` contains generated request code and should not be manually edited unless the task explicitly targets generated output handling.
- `src/pages.json` and `src/manifest.json` are generated artifacts and should not be treated as hand-maintained source files.
- Auto-import is enabled for Vue and uni-app APIs, so do not add redundant imports if the project already relies on auto-import behavior.

## Directory Responsibilities

```text
apps/app/src/
├── api/           # hand-written API wrappers and business request entry points
├── api/types/     # request and response types, view-facing typed contracts
├── components/    # reusable UI components
├── hooks/         # reusable side-effect logic and state machines
├── http/          # request client and transport configuration
├── layouts/       # app layout composition
├── pages/         # route-level pages and business orchestration
├── router/        # route helpers and navigation helpers
├── service/       # generated API files, avoid manual edits
├── store/         # Pinia business-domain stores
├── style/         # shared styles and theme helpers
├── types/         # shared business types not tied to one API module
└── utils/         # pure functions and light platform utilities
```

Use these boundaries strictly:
- `pages/`: route entry, data orchestration, lifecycle handling, page-level interaction flow.
- `components/`: presentational or focused interaction units.
- `hooks/`: request orchestration, upload flow, map interaction, pagination, permission checks, reusable state machines.
- `utils/`: formatting, conversion, cache helpers, pure helpers.
- `store/`: cross-page shared domain state only.

## AI Decision Rules

Before generating code, decide the target first:

### Put logic in the page when
- the state is only used by the current page
- the state is short-lived UI state, such as popup visibility, active tab, local filter text, local loading flags
- extracting it would only move refs and computed values into a `useXxx` file without creating a real reusable abstraction

### Extract a component when
- a UI block is reusable or likely to repeat
- a block makes the page template hard to scan
- a unit has clear props and emits boundaries, such as search panels, cards, toolbars, empty states, filter bars, upload areas, popups

### Extract a hook when
- the logic contains reusable side effects or state transitions
- the logic manages request lifecycle, debounce, caching, upload, map interactions, permission checks, pagination, or scroll behavior
- the logic is meaningful even without a specific page template

### Use a store when
- the state is shared across pages
- the state needs persistence
- multiple pages or flows must react to the same domain state

### Use utils when
- the logic is pure
- it does not need lifecycle, watchers, or framework state
- it can be expressed as formatting, conversion, validation, or cache helpers

## Page, Component, Hook, Store Standards

### Pages
- Pages are orchestrators, not dumping grounds.
- Fetch initial page data in `onLoad` when possible.
- Use `onShow` for lightweight refresh and state sync, not for heavy first-load logic.
- Keep template expressions short. Move branching and formatting into computed values or named functions.
- When a page becomes difficult to scan, split repeated UI blocks into components before introducing more abstraction.

### Components
- One component should solve one UI unit or one focused interaction problem.
- Use props and emits as the communication boundary.
- Do not let child components directly modify parent state.
- Provide stable empty, loading, and error rendering when applicable.
- Prefer concise, intention-revealing event names.

### Hooks
- Hook names must use the `useXxx` pattern.
- Hooks should expose a small, stable API.
- Return only the states and actions that callers truly need.
- Handle async failure paths inside the hook. Do not push all error handling to the page.
- If a hook forces the page to destructure too many values, the abstraction is probably wrong.

### Stores
- Prefer Setup Store style.
- Keep one store focused on one business domain.
- Distinguish state, getters, and actions clearly.
- Use `storeToRefs` when destructuring reactive store state in components.
- Do not move page-only UI state into Pinia just to make a page look smaller.

## Current Project Patterns To Follow

These patterns are already preferred in this project and should be continued:

1. Thin pages with business orchestration, plus focused components and hooks.
2. Search, upload, map interaction, detail prefetch, and request-state management belong in hooks only when they form an independent state machine.
3. Detail display, search panel, popup card, filter bar, and list card are good component boundaries.
4. Repeated request adaptation belongs in `api/` or `utils/`, not inside page templates.
5. Cache helpers belong in `utils/` when they are framework-light and shared by more than one consumer.

## Cross-Platform Rules

1. Prefer `uni` APIs first. Do not default to platform-native APIs like `wx`.
2. Use conditional compilation for platform differences. Do not spread runtime platform checks throughout business code.
3. Do not rely on `window`, `document`, or DOM APIs in code intended for mini program or App runtime.
4. For map, upload, location, permission, share, or navigation features, consider H5 and Mini Program behavior together.
5. Clean up timers, listeners, map interactions, and observers when the page leaves.

## Request and Data Rules

1. Pages should call `api/` functions, not hardcode request URLs.
2. Every request function should have clear input and output types.
3. When backend fields change, update the full chain together:
   - `api/`
   - `api/types/` or `types/`
   - page or hook usage
   - store usage if affected
4. Do not duplicate backend-to-view mapping logic in multiple pages.
5. If generated service code is insufficient, wrap it in `api/` instead of patching page code repeatedly.

## TypeScript and Vue Conventions

### TypeScript
- Use explicit parameter and return types where they improve clarity.
- Prefix interfaces with `I`.
- Use `import type` for type-only imports.
- Keep business type names specific. Avoid vague names like `Data`, `Info`, `Item2`.

### Vue SFC
Use this order because it matches the current ESLint setup:

```vue
<script lang="ts" setup>
defineOptions({ name: 'PageName' })
definePage({ style: { navigationBarTitleText: 'Title' } })
</script>

<template>
  <!-- content -->
</template>

<style lang="scss" scoped>
/* only when utilities are not enough */
</style>
```

Rules:
- Prefer `script setup`.
- Keep complex template logic out of the template.
- Keep comments rare and useful. Explain why, not what.

## Imports

Use `@/` for src imports.

Prefer this grouping order:
1. external packages
2. type imports
3. app internal modules via `@/`
4. relative imports

Within internal imports, follow the lint expectations already used in this project. When in doubt, group similar imports together and let ESLint diagnose the final order.

## UnoCSS and Styling

1. Prefer UnoCSS utility classes for spacing, layout, colors, radius, text, and shadows.
2. Do not introduce large new `<style scoped>` blocks by default.
3. Only keep custom style blocks when one of these is true:
   - pseudo elements are required
   - complex keyframes are required
   - deep overrides for third-party components are required
   - utility classes would make the selector significantly less readable
4. If custom CSS is kept, keep it small and explainable.

## Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `HomeSearchPanel.vue` |
| Pages | directory based | `pages/login/index.vue` |
| Hooks | useXxx | `useHomeMapSearch` |
| Stores | useXxxStore | `useUserStore` |
| API functions | camelCase | `searchMapPlaces` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_MAP_SCALE` |

## Generated Code and Files

Treat these as generated or semi-generated and avoid direct manual edits unless the task explicitly requires it:
- `src/service/**`
- `src/pages.json`
- `src/manifest.json`
- `auto-import.d.ts`
- `uni-pages.d.ts`

If behavior needs to change, prefer updating the source configuration or wrapper layer that generates or consumes these files.

## What AI Must Do During Generation

Before coding:
1. Read the existing module that is closest to the requested change.
2. Decide whether this is a page concern, component concern, hook concern, store concern, or API concern.
3. Reuse existing patterns before introducing a new abstraction.

While coding:
1. Output directly runnable code.
2. Include loading, empty, error, retry, and permission handling when the feature needs them.
3. Keep platform differences explicit and contained.
4. Update types, API wrappers, and usage sites together.
5. Avoid leaving dead code, duplicate logic, or unused props.

After coding:
1. Check for over-abstraction.
2. Remove dead code and unused imports.
3. Verify the affected page still reads clearly.
4. Run the smallest meaningful validation command.

## Validation Workflow

Run commands from the monorepo root.

Common commands:

```bash
pnpm --filter @yun/app type-check
pnpm --filter @yun/app lint
pnpm --filter @yun/app lint:fix
pnpm --filter @yun/app build:h5
pnpm --filter @yun/app dev:h5
pnpm --filter @yun/app dev:mp
```

Recommended minimum validation:
- UI or page logic changes: run `pnpm --filter @yun/app type-check`
- import order or style issues: run `pnpm --filter @yun/app lint` or inspect diagnostics
- route, manifest, build, style, or platform behavior changes: run `pnpm --filter @yun/app build:h5`
- map, upload, permission, location, and share related features: verify both H5 and Mini Program behavior when the task touches cross-platform logic

## Maintainability Red Lines

Do not do these:
- create a huge page file when the UI already has clear split points
- extract a single-page hook that only moves local refs out of the page
- put page popup state, temporary form state, or one-page filters into Pinia by default
- write complex business logic inside a presentational component
- duplicate request mapping logic across pages
- leave TODO placeholders instead of runnable logic
- leave unused state, unused props, unused types, or dead helper functions behind

## Output Style For AI

When explaining changes, keep the explanation practical:
- design reason
- responsibility boundary
- critical tradeoff or note

Avoid broad theory unless the user explicitly asks for it.
