<!-- Generated: 2026-04-03 | Files scanned: 42 | Token estimate: ~900 -->

# Architecture — Chalet Rentable SPA

## Data Flow

```
User Input → ProjectContext (useReducer) → localStorage (autosave 2s debounce)
                    │
                    ├─ getCurrentInputs() → deepMerge(base, scenario.overrides)
                    │
                    └─ getCurrentKPIs() → calculateKPIs(inputs) → KPIResults
                                                │
                                                ├─ KPIDashboard (right panel)
                                                ├─ SensitivityAnalysis (tornado, heatmap, monte carlo, goal seek)
                                                └─ ProjectionAnalysis (multi-year IRR)
```

## Entry Point Chain

```
main.tsx → App.tsx
             ├─ <ProjectProvider>          (store/ProjectContext.tsx — 474 lines)
             ├─ Tabs:
             │   ├─ Parametres  → InputForm              (features/inputs — 1175 lines)
             │   ├─ Scenarios   → ScenarioManager         (features/scenarios — 501 lines)
             │   ├─ Sensibilite → SensitivityAnalysis     (features/sensitivity — 687 lines)
             │   │                 ├─ TornadoChart         (315 lines)
             │   │                 ├─ HeatmapChart         (518 lines)
             │   │                 ├─ MonteCarloChart       (263 lines)
             │   │                 ├─ CrossSensitivityMatrix (343 lines)
             │   │                 └─ GoalSeek             (178 lines)
             │   └─ Projections → ProjectionAnalysis      (features/projections — 687 lines)
             │                     └─ ProjectionCharts     (231 lines)
             └─ KPIDashboard (sticky right panel — 621 lines)
```

## Business Logic Layer (src/lib/ — no React)

| File | Lines | Purpose |
|------|-------|---------|
| `calculations.ts` | 712 | Core KPI engine: `calculateKPIs()` → revenue, expenses, NOI, DSCR, cap rate, cashflow |
| `projections.ts` | 468 | Multi-year projections with IRR (Newton-Raphson) |
| `goalSeek.ts` | 384 | Bisection solver: find variable for target KPI. Co-varies downPayment with purchasePrice |
| `sensitivity.ts` | 179 | 1D/2D parameter sweeps for tornado/heatmap |
| `montecarlo.ts` | 247 | Monte Carlo simulation with triangular distributions |
| `metricAdvice.ts` | 584 | Financial advice engine (DSCR, LTV, break-even) |
| `inputMutator.ts` | 128 | `extractValue()`, `setValueByPath()` — input unwrapping + dynamic mutation |
| `kpiRatios.ts` | 170 | ROI, cash-on-cash, cap rate, DSCR formulas |
| `constants.ts` | 236 | Thresholds, labels, Quebec tax tiers |
| `validation.ts` | 235 | Zod schemas with `.max()` bounds |
| `pdfHelpers.ts` | 454 | PDF generation primitives (jsPDF) |
| `utils.ts` | ~100 | `round()`, `formatCurrency()`, `deepClone()`, `deepMerge()` |
| `colors.ts` | ~80 | `CHART_COLORS` palette for Recharts |

### Export Modules (src/lib/exports/)

| File | Purpose |
|------|---------|
| `index.ts` | Barrel: `saveProjectFile`, `loadProjectFile`, `exportProfessionalReportToPDF` |
| `jsonIO.ts` | JSON import/export with Zod validation |
| `fileSystem.ts` | File download/upload (10 Mo max) |
| `reportExports.ts` | PDF report cover + executive summary |
| `reportAnnexes.ts` | PDF annexes A-D (inputs, formulas, expenses, projections) |

## State Shape

```
Project {
  baseInputs: ProjectInputs          // Revenue, expenses, financing, acquisition fees
  scenarios: Scenario[]              // Each has overrides: Partial<ProjectInputs>
  sensitivityAnalyses: Analysis[]    // Saved sensitivity configs
  projectionSettings: ProjectionSettings
}
```

## Key Type: InputWithSource<T>

```
{ value: T, range?: { min, max, default, useRange }, sourceInfo?: { source, remarks } }
```

## Security Boundaries

- CSP meta tag: `frame-ancestors 'none'`, `connect-src 'none'`
- Prototype pollution guards: `setValueByPath()`, `deepMerge()`, `getBaseValue()`
- Zod validation on import: `.max()` bounds on arrays, strict mode
- No `console.error` in production — user-facing banners only
