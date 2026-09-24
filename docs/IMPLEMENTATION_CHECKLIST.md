# Implementation checklist

Items are in dependency order. Each item is small and verifiable. Follow `docs/ARCHITECTURE.md` (contracts) and use `features/streaks/StreaksLab.tsx` as the reference screen. Do not change kernels, schemas, the URL contract or the shared components unless a demonstrated defect requires it.

## Done (phase one)

- [x] Vite + React + strict TypeScript setup, scripts (`typecheck`, `test`, `build`, `check`, `preview`), relative `base` for static hosting
- [x] `lib/`: seeded PRNG, distributions (normal, lognormal, Poisson), stats (type-7 quantiles, Wilson CI, binning), params (validate/clamp/snap/serialize), Spanish formatting; all with tests
- [x] URL query contract (`app/query.ts`) and location store (`app/location.ts`), with tests
- [x] Kernels, exact formulas, result types and tests for streaks, bayes, ruin and compound-loss
- [x] Worker-based simulation runner with main-thread fallback (`app/simulation.ts`, `useSimulation`)
- [x] Shell: skip link, nav with `aria-current`, focus on navigation, document title, footer disclaimer, landing
- [x] Shared lab components: `LabLayout`, `SimulationForm`, `RangeField`, `useParamDraft`, `MetricList`, `Disclosure`, `ShareLink`
- [x] Chart primitives: `ChartFigure` + `DataTable`, `Histogram`, `LinePlot`, `Legend`/`PatternDefs`, scales; markup tests
- [x] Streaks lab end to end (form → URL → worker → metrics, interpretation, histogram, sample run, disclosures, share), verified in a browser at desktop and 360 px

## Phase two

### Bayes (`features/bayes/`)

- [x] `BayesLab.tsx` with `RangeField`s for `prevalence`, `sensitivity`, `specificity` (percent display) and `population`
- [x] `ConfusionMatrix.tsx` (feature-local) showing the 2×2 table as a real `<table>`, with row and column headers "Tiene la condición / No la tiene" × "Positivo / Negativo". It shows the natural frequencies from `result.expected` (per `population`), with the simulated counts beside them in a labelled second sub-column per test-result column.
- [x] Optional people grid (feature-local SVG, ≤ 1000 cells, based on `expectedCounts(rates, 1000)`) that tells TP/FP/FN/TN apart by shape (filled/hollow square vs circle). It has a text description and does not replace the table.
- [x] Metrics: PPV `exact` (if `exact.ppv === null`, display "No definido" with a detail explaining that nobody tests positive); simulated PPV `estimated` (samples = `population`; detail = "TP de positivos" counts and CI; `null` → "No definido"); `exact.positiveRate`; NPV `exact` (shown only when defined)
- [x] `interpretation.ts` + test: the text responds to low vs high prevalence and to the false positives outnumbering the true positives. No medical advice.
- [x] "Cómo leer esto" / "Supuestos" copy (independent test results, fixed rates, illustrative population, not a diagnostic tool)
- [x] Wire it into `App.tsx`'s `LabView` switch

### Hypothetical risk of ruin (`features/ruin/`)

- [x] `RuinLab.tsx` with fields for `capital`, `p`, `gain`, `loss`, `fraction` (percent), `rounds` and `futures`
- [x] A visible educational disclaimer in the intro (abstract units, not a financial or betting recommendation), outside the disclosures
- [x] `LinePlot` with `yScale="log"`. Muted series come from `samplePaths` (one legend label: "Futuros de muestra"). P50 is `primary` and P10/P90 are `secondary` (shared legend label "Percentiles 10–90"), using `x = checkpoints`. `references` are the initial capital and `ruinLevel` ("Ruina: 5 % del capital inicial").
- [x] Chart description + data table (checkpoint round, P10, P50, P90)
- [x] Metrics: ruin probability `estimated` (+ CI), median max drawdown `estimated` (percent), median final capital `estimated`, per-round edge `exact` (`expectedMultiplier − 1`), typical per-round growth `exact` (`exp(expectedLogGrowth) − 1`; handles `-Infinity` as "−100 %")
- [x] `interpretation.ts` + test covering a positive edge with negative log growth, a positive edge with positive log growth, and a negative edge
- [x] Copy for "Cómo leer esto" / "Supuestos" (fixed exposure fraction of current capital, independent rounds, absorbing ruin at 5 %, pointwise percentile bands are not trajectories)
- [x] Wire it into `LabView`

### Compound losses (`features/compound-loss/`)

- [x] `CompoundLossLab.tsx` with fields for `frequency`, `severity`, `dispersion`, `threshold` and `futures`
- [x] Histogram of `sortedTotals` built with `binEqualWidth(sortedTotals, 0, upper, ~40)` where `upper = max(p99, threshold)`. States the overflow count in the description and the table. Highlights bins with `x0 ≥ threshold`. Markers: median, P90 and mean.
- [x] Metrics: mean `estimated` and mean `exact`, median `estimated`, P90 `estimated`, exceedance probability `estimated` (+ CI), P(no loss) `exact`
- [x] `interpretation.ts` + test explaining skew: mean vs median, how often the mean is exceeded, and what the tail implies
- [x] Copy for "Cómo leer esto" / "Supuestos" (Poisson count, lognormal severity with median = `severity` and σ = `dispersion`, independence, one period per future)
- [x] Wire it into `LabView`

### Finish

- [x] Delete `app/UnavailableLab.tsx` and its `.notice` usage once all labs are wired (the `.notice` style was unused elsewhere, so it was removed too)
- [x] Update the README "Status" section
- [x] `npm run check` passes
- [x] Browser verification of every lab at desktop and 360 px (see "Verification" in ARCHITECTURE.md):
  - inputs, `Simular`, exact/estimated labels
  - copy link → reopen → identical metrics
  - malformed URL values
  - keyboard-only run
  - reduced motion
  - no console errors
  - fixed during verification: long formatted numbers (population, capital, thresholds) could overflow the bordered `.metric` box instead of wrapping; `.metric` now allows shrinking (`min-inline-size: 0`) and `.metric__value` wraps (`overflow-wrap: anywhere`)

### Optional (only after everything above)

- [ ] Preset scenarios as plain links (canonical query strings), a configurable donation link (hidden when unset), Monty Hall
