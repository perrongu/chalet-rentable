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
- **jspdf + html2canvas + dom-to-image-more** for PDF/PNG exports
- **exceljs** for Excel export
- **lucide-react** for icons

## Architecture

### State Management

Single global state via **React Context + useReducer** in `src/store/ProjectContext.tsx`:
- Root state is a `Project` object containing `baseInputs`, scenarios, sensitivity configs, and projections
- 15 typed action types dispatched via `ProjectAction` union
- Autosave to `localStorage` with 2-second debounce
- `getCurrentInputs()` deep-merges base inputs with active scenario overrides (immutable clone + merge)
- `getCurrentKPIs()` computes KPIs on demand from current inputs

### Scenario System

- One `baseInputs` on the Project; each scenario holds only `overrides: Partial<ProjectInputs>`
- Deep merge at read time: `deepMerge(deepClone(baseInputs), scenario.overrides)`
- Base scenario always has `isBase: true` and `id: 'base'`

### Calculation Engine (`src/lib/calculations.ts`)

Pure function `calculateKPIs(inputs)` returns `KPIResults` with **full traceability** — every metric includes a `traces` field with formula, variables, result, and sources. This is the core of the app.

- Uses `extractValue()` from `src/lib/inputMutator.ts` to unwrap `InputWithSource<T>` wrapper type, respecting `useRange`/`default` for sensitivity mode
- `setValueByPath()` in `src/lib/inputMutator.ts` for dynamic parameter mutation during sensitivity sweeps (operates on cloned objects only)

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
| `src/lib/` | Pure business logic (calculations, projections, sensitivity, Monte Carlo) — no React |
| `src/lib/exports/` | Export modules split by domain (jsonIO, fileSystem, dataExports, chartExports, reportExports, reportAnnexes) with barrel `index.ts` |
| `src/lib/inputMutator.ts` | `extractValue()`, `setValueByPath()` — input unwrapping and dynamic path mutation |
| `src/lib/constants.ts` | App-wide constants, thresholds, labels, limits, Quebec tax tiers |
| `src/store/` | ProjectContext with global state, reducer, and data migration |
| `src/types/` | All TypeScript interfaces (`ProjectInputs`, `KPIResults`, `Scenario`, etc.) |
| `src/components/ui/` | Reusable UI primitives (Button, Card, Input, Badge, ProgressBar, etc.) |
| `src/components/charts/` | Domain-specific chart components |
| `src/features/` | Feature modules organized by domain (inputs, scenarios, sensitivity, projections) |

## Security Patterns

### CSP (Content Security Policy)
Defined in `index.html` via meta tag. Includes `frame-ancestors 'none'` (clickjacking), `base-uri 'self'` (injection), `connect-src 'none'` (offline SPA).

### Prototype Pollution Guard
`setValueByPath()` in `src/lib/inputMutator.ts` and `deepMerge()` in `src/lib/utils.ts` both block `__proto__`, `constructor`, `prototype` keys. Any new function accepting dynamic paths/keys must include this guard.

### File Import Validation
- Max file size: 10 Mo (checked before `.text()` in `src/lib/exports/fileSystem.ts`)
- JSON parsed in try/catch with domain-specific error (`src/lib/exports/jsonIO.ts`)
- Zod schema validation with `.max()` bounds on all arrays (`expenses.max(100)`, `scenarios.max(50)`)

### Production Logging
No `console.error` in production paths — use user-facing messages (alerts, banners). The `saveError` state in `ProjectContext` surfaces autosave failures via a red banner in `App.tsx`.

## Module Splitting Convention

### Barrel Re-export Pattern
`src/lib/exports/` uses a barrel `index.ts` so consumers import from `./lib/exports` unchanged. When splitting a large module:
1. Group by domain concern (jsonIO, fileSystem, dataExports, chartExports, reportExports, reportAnnexes)
2. Create `index.ts` with re-exports
3. Keep shared config in `shared.ts`
4. Dependencies flow one direction (no circular imports)
5. Each file stays under 800 lines

### File Size Limits
- Target: 200-600 lines per file, 800 max
- If a file exceeds 800 lines, split by domain boundary
- Current largest files: `calculations.ts` (~800), `reportAnnexes.ts` (~570), `reportExports.ts` (~400)

## Domain Conventions

- All user-facing text, labels, and error messages are in **French**
- Financial formulas follow Quebec real estate conventions (transfer duties use Quebec tier system in `TRANSFER_DUTIES_TIERS`)
- Expense lines support 4 types: `FIXED_ANNUAL`, `FIXED_MONTHLY`, `PERCENTAGE_REVENUE`, `PERCENTAGE_PROPERTY_VALUE`
- KPIs are color-coded using thresholds in `KPI_THRESHOLDS` (e.g., cash-on-cash >= 8% = green, >= 5% = orange, < 5% = red)
