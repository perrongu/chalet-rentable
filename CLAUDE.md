# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rental chalet profitability analyzer — a **100% client-side SPA** (no backend, no database) for Quebec real estate investors. All data is stored in `localStorage` with JSON file import/export. The entire UI and domain content is in **French**.

## Commands

```bash
npm run dev      # Dev server at http://localhost:5173
npm run build    # TypeScript check + Vite production build
npm run lint     # ESLint (flat config, TS + React hooks)
npm run preview  # Preview production build
```

No test runner is configured. There are no test files.

## Tech Stack

- **React 19** + TypeScript (strict) + Vite 7
- **Tailwind CSS v4** (via PostCSS plugin, not the old `tailwind.config.js` — custom colors/shadows extended there)
- **Recharts 3** for all charts (Tornado, Heatmap, Waterfall, Area, Bar, Pie)
- **Zod v4** for project data validation on load
- **jspdf + dom-to-image-more** for PDF/PNG exports
- **lucide-react** for icons

## Architecture

### State Management

Single global state via **React Context + useReducer** in `src/store/ProjectContext.tsx`:
- Root state is a `Project` object containing `baseInputs`, scenarios, sensitivity configs, and projections
- 14 typed action types dispatched via `ProjectAction` union
- Autosave to `localStorage` with 2-second debounce (`DebouncedFunction` with `.flush()` and `.cancel()` from `src/lib/utils.ts`)
- `saveStatus` state (`idle` | `saving` | `saved` | `error`) exposed via context for the `SaveIndicator` component in `App.tsx`
- `beforeunload` + `pagehide` handlers flush the debounce to prevent data loss on tab close; uses `projectRef` (stable ref) to avoid stale closures
- Debounce cancelled on component unmount (strict mode safe)
- `getCurrentInputs()` deep-merges base inputs with active scenario overrides (immutable clone + merge)
- `getCurrentKPIs()` computes KPIs on demand from current inputs
- Default project factory in `src/store/defaultProject.ts` (separated for React fast-refresh compatibility)

### Scenario System

- One `baseInputs` on the Project; each scenario holds only `overrides: Partial<ProjectInputs>`
- Deep merge at read time: `deepMerge(deepClone(baseInputs), scenario.overrides)`
- Base scenario always has `isBase: true` and `id: 'base'`
- New scenarios can be created blank or copied from any existing scenario

### Calculation Engine (`src/lib/calculations.ts`)

Pure function `calculateKPIs(inputs)` returns `KPIResults` with **full traceability** — every metric includes a `traces` field with formula, variables, result, and sources. This is the core of the app.

- Uses `extractValue()` from `src/lib/inputMutator.ts` to unwrap `InputWithSource<T>` wrapper type, respecting `useRange`/`default` for sensitivity mode
- `setValueByPath()` in `src/lib/inputMutator.ts` for dynamic parameter mutation during sensitivity sweeps (operates on cloned objects only)

### Goal Seek Engine (`src/lib/goalSeek.ts`)

Inverse solver using bisection method. Finds the value of a variable (purchase price, ADR, occupancy) needed to reach a target KPI (DSCR, cashflow, cap rate). Bounded at 50 iterations with domain-range validation on inputs.

- **Co-variation**: When varying `purchasePrice`, the solver automatically co-varies `downPayment` to maintain the same percentage ratio. Without this, the loan amount becomes nonsensical at extreme search bounds (e.g., negative loan when price < fixed down payment).
- **Result details**: `GoalSeekResult.details` provides intermediate calculation values (price, down payment, loan, debt service, KPI) displayed in the UI for transparency.
- Module-level `TARGET_LABELS` and `VARIABLE_LABELS` constants avoid duplication across `buildResult` and `buildDetails`.
- Exhaustive `never` guard on the `solveFor` switch ensures compile-time errors if a new variable is added without a corresponding case.

### Key Type: `InputWithSource<T>`

Every numeric input is wrapped with `value`, optional `range` (min/max for sensitivity), `useRange` flag, and optional `sourceInfo` (URL/remarks for data provenance). Defined in `src/types/index.ts`.

### Navigation

No router. Single-level tab system (Paramètres, Scénarios, Sensibilité, Projections) using a `Tabs` component with internal React Context.

### Layout

5-column grid in `App.tsx`: 3 columns for the left panel (tabs), 2 columns for the sticky KPI dashboard on the right.

### Color System

Centralized chart palette in `src/lib/colors.ts` (`CHART_COLORS`). All charts must use these colors for visual consistency. Profit components: cashflow=sky, capitalisation=orange, plus-value=emerald.

## Key Directories

| Path | Purpose |
|------|---------|
| `src/lib/` | Pure business logic (calculations, projections, sensitivity, Monte Carlo, goalSeek) — no React |
| `src/lib/exports/` | Export modules split by domain (jsonIO, fileSystem, reportExports, reportAnnexes) with barrel `index.ts` |
| `src/lib/inputMutator.ts` | `extractValue()`, `setValueByPath()` — input unwrapping and dynamic path mutation |
| `src/lib/goalSeek.ts` | Inverse solver (bisection) for goal-seek analysis |
| `src/lib/constants.ts` | App-wide constants, thresholds, labels, limits, Quebec tax tiers |
| `src/store/` | ProjectContext (state, reducer, migration) + defaultProject (factory) |
| `src/types/` | All TypeScript interfaces (`ProjectInputs`, `KPIResults`, `Scenario`, etc.) |
| `src/components/ui/` | Reusable UI primitives (Button, Card, Input, Badge, ProgressBar, etc.) |
| `src/components/charts/` | Domain-specific chart components |
| `src/features/` | Feature modules organized by domain (inputs, scenarios, sensitivity, projections) |

## Security Patterns

### CSP (Content Security Policy)
Defined in `index.html` via meta tag. Includes `frame-ancestors 'none'` (clickjacking), `base-uri 'self'` (injection), `connect-src 'none'` (offline SPA).

### Prototype Pollution Guard
`setValueByPath()` in `src/lib/inputMutator.ts`, `deepMerge()` in `src/lib/utils.ts`, and `getBaseValue()`/`getOverrideValue()` in `InputForm.tsx` all block `__proto__`, `constructor`, `prototype` keys. Any new function accepting dynamic paths/keys must include this guard.

### File Import/Export Validation
- Max file size: 10 Mo (checked before `.text()` in `src/lib/exports/fileSystem.ts`)
- MIME type validation: accepts `application/json`, `text/json`, or empty (some OS don't set MIME for `.json`)
- JSON parsed in try/catch with domain-specific error (`src/lib/exports/jsonIO.ts`)
- Zod schema validation with `.max()` bounds on all arrays (`expenses.max(100)`, `scenarios.max(50)`, `sensitivityAnalyses.max(50)`)
- Failed Zod validation resets to default project (no unvalidated fallback)
- File picker cancel detection: `input.addEventListener("cancel", ...)` (Chrome 113+, Safari 16.4+, Firefox 91+)
- API detection split: `isSavePickerSupported()` / `isOpenPickerSupported()` — checks each API independently

### File Handle Persistence
`App.tsx` retains a `FileSystemFileHandle` via `useRef` for Save vs Save As behavior:
- **Save**: reuses existing handle (silent overwrite, no picker)
- **Save As / first save**: opens picker, stores returned handle
- **Open**: `loadProjectFile()` returns `{ project, handle }` — handle stored for subsequent saves
- **New project**: clears the handle
- Handle cleared on save error (stale handle protection)
- `handleSave()` returns `boolean`; `handleConfirmSave` aborts pending action if save fails

### Production Logging
No `console.error` in production paths — use user-facing messages (alerts, banners). The `saveError` state in `ProjectContext` surfaces autosave failures via a red banner in `App.tsx`.

## Module Splitting Convention

### Barrel Re-export Pattern
`src/lib/exports/` uses a barrel `index.ts` so consumers import from `./lib/exports` unchanged. The barrel exposes: `saveProjectFile`, `loadProjectFile`, `FileSystemFileHandle` (type), `exportProfessionalReportToPDF`. Internal modules (`jsonIO`) are imported directly by sibling modules.

### File Size Limits
- Target: 200-600 lines per file, 800 max
- If a file exceeds 800 lines, split by domain boundary
- Current largest files: `InputForm.tsx` (~1175 — needs splitting), `calculations.ts` (~710), `SensitivityAnalysis.tsx` (~687), `ProjectionAnalysis.tsx` (~687), `KPIDashboard.tsx` (~621), `metricAdvice.ts` (~584), `reportAnnexes.ts` (~569)

## Domain Conventions

- All user-facing text, labels, and error messages are in **French**
- Financial formulas follow Quebec real estate conventions (transfer duties use Quebec tier system in `TRANSFER_DUTIES_TIERS`)
- Expense lines support 4 types: `FIXED_ANNUAL`, `FIXED_MONTHLY`, `PERCENTAGE_REVENUE`, `PERCENTAGE_PROPERTY_VALUE`
- Expenses display Fixe/Variable badges with subtotals in the Parameters tab
- KPIs are color-coded using thresholds in `KPI_THRESHOLDS` (cash-on-cash, cap rate, DSCR)
- Scenario comparison table includes: Revenus, Dépenses, NOI, Cashflow, Cash-on-Cash, Cap Rate, DSCR
- Sensitivity tab has 5 analysis modes: Tornado, Heatmap, Monte Carlo, ADR x Occupation matrix, Goal Seek
