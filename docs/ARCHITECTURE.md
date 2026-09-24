# Rachas — architecture

Durable technical decisions. `docs/PRODUCT_BRIEF.md` is the product contract; this file is the technical one. If a decision here must change, record the reason here first.

## Stack

- React 19, strict TypeScript 7 (`tsc -b`, project references), Vite 8, Vitest 5. Runtime dependencies: `react` and `react-dom` only.
- No router, state library, CSS framework, component kit, chart library, or linter. Charts are hand-written SVG.
- Static SPA. `vite.config.ts` uses `base: './'`, so one `dist/` works at a domain root or a sub-path. All state is in the query string; no rewrites are needed.
- The only typeface, Instrument Sans (variable, SIL OFL 1.1), is self-hosted as one WOFF2 file in `src/assets/fonts/` with its licence. The app makes no third-party requests.

## Source layout

```text
src/
  main.tsx                 entry: CSS imports in layer order, URL canonicalization, render
  app/                     composition and the only DOM/history boundary
    labs.ts                LabId list, catalogue copy, schema registry, LabViewProps, LabGuide types
    query.ts (+test)       pure URL parse/serialize/canonicalize contract (labs and pages)
    location.ts            window.location/history store, navigate(), followLink(), currentFragment()
    simulation.ts          kernel registry, worker client, main-thread fallback
    simulation.worker.ts   module worker: runs one kernel per request
    useSimulation.ts       hook: input → running/result/stale/error
    config.ts (+test)      optional build-time configuration (support link)
    guides.ts              registry of each lab's Método/Usos content
    App.tsx                shell (skip link, header/nav, main, footer), view switch, lab pager, focus + title
    Landing.tsx            entry view: hero graphic, lab catalogue, exact-vs-estimated primer
    MethodPage.tsx         `?page=method`
    UsesPage.tsx           `?page=uses`
    views.test.tsx         navigation state, titles and static markup of the shell and pages
  features/<lab>/          streaks, bayes, ruin, compound-loss
    params.ts              schema: URL keys, bounds, steps, defaults, cross-field rules
    model.ts (+test)       pure kernel, exact formulas, typed input/result
    guide.ts               Método (question, model, formulas, procedure, exact/estimated, assumptions, limits) and Usos content
    <Lab>Lab.tsx           the screen
    other .tsx/.ts/.css    feature-only visuals, interpretation copy, styles
  components/
    lab/                   lab contract: LabLayout, SimulationForm, ShareLink, useParamDraft
    ui/                    RangeField, MetricList (+Provenance), Disclosure
    charts/                ChartFigure/DataTable, Histogram, LinePlot, Legend/PatternDefs, scale, useChartWidth
  lib/                     React-free: random, distributions, stats, params, format (+tests)
  styles/                  layers, reset, tokens, base, layout, components, charts, utilities
  assets/fonts/            Instrument Sans variable WOFF2 + OFL.txt
```

Dependency direction: `lib` imports nothing from the app. `features/*/model.ts` and `params.ts` import only `lib`. Feature screens and `guide.ts` may import `lib`, `components`, `app/labs.ts` (types, copy) and `app/useSimulation.ts`. `app` imports feature schemas, kernels, guides and screens. `components` never imports from `features` or `app`. The worker imports only the kernels.

## State and URL contract (`app/query.ts`)

```
?lab=<streaks|bayes|ruin|compound-loss>&<param>=<value>…&seed=<seed>
?page=<method|uses>
```

- The address bar is the single source of application state. There is no other store.
- A valid `lab` always wins; any `page` key next to it is dropped, so every lab URL keeps its meaning.
- Otherwise a valid `page` selects a content view. Its canonical URL is exactly `?page=method` or `?page=uses`: pages take no parameters or seed, and other keys are dropped.
- No `lab`/`page`, or an unknown value of either, means the landing view (Explorar, which holds the lab catalogue) and serializes to `""`.
- A URL fragment (`?page=method#metodo-bayes`) only locates a section of a view. It is not state: canonicalization preserves it, `navigate(search, mode, fragment)` writes it, and after in-app navigation focus moves to the element it names instead of `#view-title`. On first load the view scrolls to it without taking focus.
- Parameter keys, order, bounds, step and default come from the lab's schema in `features/<lab>/params.ts`. Values are stored in **model units**: probabilities are fractions (`p=0.55`), counts are integers. `display: 'percent'` only affects form fields.
- Parsing accepts plain decimals only (`/^-?\d+(\.\d+)?$/`). Anything else becomes the default. Numbers are clamped, snapped to the step grid from `min`, and rounded to the step's decimals. Then the schema's `constrain` applies cross-field rules (streak ≤ attempts; ruin `rounds` ≤ the overflow-safe limit below). Unknown keys are dropped.
- Seeds match `/^[A-Za-z0-9_-]{1,32}$/`. A missing or invalid seed is replaced with `generateSeed()` (8 chars, Web Crypto) during canonicalization, never while rendering.
- `canonicalizeLocation()` runs before the first render and on `popstate`. `navigate()` canonicalizes too, so components always see a canonical URL.
- History: moving between views uses `push`. A new run in a view uses `replace`, so Back leaves the lab.
- Every lab URL includes every parameter, even defaults, so shared links survive later default changes.
- `Simular` commits the form draft with a fresh seed. The "repeat seed" checkbox reuses the current seed (common random numbers).

## Simulation boundary

- Kernels (`simulateStreaks`, `simulateBayes`, `simulateRuin`, `simulateCompoundLoss`) are synchronous pure functions `(params & { seed }) → result`. They use no React, no DOM and no ambient randomness. On impossible input they throw `RangeError` (`assertInRange`) instead of returning plausible numbers.
- Randomness: `createRng(seed)` is cyrb128 → sfc32 with 15 warm-up draws, uniform in [0, 1). Every sampler takes the `rng` explicitly. Each kernel consumes one stream in a fixed order (future by future), and future #0 is the one displayed.
- **Reproducibility is a public contract.** Changing the hash, the generator, the warm-up, a sampler, or the order of draws breaks every shared URL. Golden-value tests (`random.test.ts`, each `model.test.ts`) must fail when that happens; update them only deliberately.
- Distributions (`lib/distributions.ts`): Box–Muller normal (no cached spare), lognormal with `(mu, sigma)` of ln X, and Poisson (Knuth for λ < 10, Hörmann PTRS for λ ≥ 10, with Lanczos `logGamma`).
- Execution: `startSimulation` posts `{id, lab, input}` to one module Web Worker. Only one run is active; a superseding run or an unmount terminates a busy worker. If workers are unavailable or fail to load, the kernel runs on the main thread after a macrotask. `useSimulation(lab, input)` keys runs by `JSON.stringify(input)` and keeps the previous result visible (`stale`) while running.
- Cost bounds live in the schemas. The worst case is ≈ 2·10⁷ elementary draws (≈ 0.3 s on a desktop, off the main thread). Raise a `max` only after re-measuring.
- Estimates carry a Wilson 95 % interval (`estimateProportion`). Quantiles are type 7 (R/NumPy default).

### Result contracts (see each `model.ts` for full types)

| Lab | Exact | Estimated / illustrative |
| --- | --- | --- |
| streaks | `exactReachProbability` (Markov chain on the current losing run, O(n·k)) | `reached` (proportion + CI), `medianLongest`, `longestCounts[k]`, `sampleRun` + `sampleRunLongest` |
| bayes | `exact.ppv` / `npv` (`null` when the denominator is 0), `exact.joint`, `expected` (natural frequencies, largest remainder, sums to population) | `simulated` 2×2 counts, `simulatedPpv` (`null` if nobody tested positive) |
| ruin | `exact.expectedMultiplier`, `exact.expectedLogGrowth` | `ruined` (capital < `RUIN_FRACTION` = 5 % of initial, absorbing), `medianMaxDrawdown`, `medianFinalCapital`, `samplePaths` (first 20 futures, rounds + 1 points), `bands` P10/P50/P90 evaluated pointwise at `checkpoints` (≤ 101) |
| compound-loss | `exact.mean`, `standardDeviation`, `probabilityOfNoLoss`, `severityMean`, `severityMedian` | `sortedTotals`, `mean`, `median`, `p90`, `p99`, `exceedance` (strictly > threshold) |

Model definitions: the ruin lab exposes a fraction f of current capital each round, giving C·(1+f·gain) or C·(1−f·loss). In the compound-loss lab, `severity` is the **median** event loss (μ = ln severity) and `dispersion` is σ.

Ruin overflow safety: capital is a plain float64 product, and no path can exceed capital·(1+f·gain)^rounds. When p > 0, `rounds` is therefore limited to `maxSafeRounds` = ⌊ln(10³⁰⁰ / capital) / ln(1+f·gain)⌋ (`MAX_REACHABLE_CAPITAL` = 10³⁰⁰, below `Number.MAX_VALUE` ≈ 1.8·10³⁰⁸ with room for rounding). This keeps paths, percentiles, medians and drawdowns finite. The schema lowers `rounds` to the largest multiple of 10 within the limit (never below 370 with the schema bounds), and the form shows that maximum. `simulateRuin` throws `RangeError` above it. `quantileSorted` and `mean` throw `RangeError` on non-finite data rather than return NaN or Infinity.

## Component contracts

- **Lab screen** (`features/<lab>/<Lab>Lab.tsx`) receives `LabViewProps<L>` (`params`, `seed`, `shareUrl`, `onRun`). It owns `useParamDraft(schema, params)` for the form draft and `useSimulation(lab, {...params, seed})` for results. It renders exactly one `LabLayout`. `App.tsx`'s `LabView` switch is the only place screens are wired.
- **LabLayout** provides the brief's lab contract. It has an eyebrow (`labEyebrow(lab)`), an `h1#view-title` (focused after view navigation), a "Hipótesis" section (controls) and a "Resultados" section with `aria-busy` and a `role="status"` line. It ends with the "Cómo leer esto" / "Supuestos" disclosures and the share section. Its children are siblings in that source order, which is also the reading and tab order; wide screens place the controls in a rail beside the other three. Screens pass slots and do not recreate this structure.
- **Results order**: every screen's `buildMetrics` returns `{ answer, supporting }`. The screen renders the answer (`MetricList primary`), then the chart or table that explains it, then the supporting metrics and the interpretation, then any secondary visual. The compound-loss answer is the share of simulated periods that lose less than the exact mean (`proportionAtMost`, the figure its interpretation already used), labelled as an estimate.
- **Supuestos** come from `guide.method.assumptions`, the same list the Método page shows. The App renders a **lab pager** after each lab: a link to the lab's Método section and to the next lab.
- **SimulationForm** holds the fieldset/legend, the repeat-seed checkbox and the `Simular` submit. It calls `reportValidity()` before `onSimulate`.
- **RangeField** is the accessible control: a labelled number input with hint and error text, `aria-invalid`, and a Spanish custom validity message. The slider is `aria-hidden` and `tabIndex=-1`. `onChange` receives only valid, normalized model-unit values. Use `max` for cross-field bounds.
- **MetricList** requires a `Provenance` on every metric: `exact` → "Exacto", `estimated` → "Estimado con N simulaciones", or `sample` → a stated single-run description. Format values with `lib/format.ts` (3 significant figures; `formatPercent` never rounds to 0 %/100 %). `primary` presents the lab's single answer. **ProvenanceTag** renders a provenance label (`.provenance[data-provenance]`); the landing primer and Método reuse it.
- **ChartFigure** gives each graphic a visible title, a results-specific text description (the text alternative), and an optional `DataTable` inside a disclosure. Its render prop provides `aria-labelledby`/`aria-describedby` for the `<svg role="img">`.
- **Histogram** takes bins `{x0, x1, count, highlighted?, highlightedCount?}` (use `discrete` for integer data), `markers` (vertical lines) and a legend. A `ChartMarker` may set `tone: 'risk'` for a loss or ruin level (the ruin reference line); its label still names it. Highlighted bars use a hatch pattern. `highlightedCount` hatches only that many of a bin's observations, from the baseline up; compound loss uses it so hatching equals the strict `> threshold` rule.
- **LinePlot** takes series `{id, label, values, x?, variant: muted|primary|secondary|tertiary, fitDomain?}`, `yScale: 'linear'|'log'` and `references` (horizontal lines). Series that share a label share one legend entry. The y domain covers the fitting series and the references (a log axis spans at least one decade). Series with `fitDomain: false` (the ruin sample paths) are clipped to the plot, and a visible note, linked with `aria-describedby`, says how many are clipped. Non-finite values are skipped, and on a log axis non-positive values are pinned to the floor.
- Charts measure their container (`useChartWidth`) and draw in CSS pixels, so text stays legible on phones.
- Feature-only visuals (e.g. `features/streaks/RunSequence.tsx`) stay in the feature. Promote a piece to `components/` only once a second lab needs it.

## CSS contract

- Plain CSS in cascade layers, declared once in `styles/layers.css`: `reset, tokens, base, layout, components, utilities`. Every file wraps its rules in its layer. Feature stylesheets (`features/<lab>/*.css`, imported by the screen) use `@layer components`.
- `docs/DESIGN_SYSTEM.md` defines the adopted visual direction. Tokens use a two-tier model: primitives in `tokens.css` (ramps, sizes, spacing, radii, shadows, the `@font-face`), then semantic roles (`--color-*`, `--chart-*`, `--font-*`, `--space-section`, `--shadow-raised`, …) consumed by all component and feature CSS. Do not hard-code palette values outside tokens. The direction is light-only (`color-scheme: light`), uses self-hosted Instrument Sans with a system fallback, and permits only the restrained elevation and gradient treatment described there.
- Instrument Sans has no Greek letters or math symbols (σ, λ, μ, ≥, ², ³). Those glyphs in formulas and labels fall back to the system sans-serif; do not add a second typeface for them.
- There is a single layout threshold at `60rem`. Above it views use a 12-column grid: the lab control rail spans 4 columns beside results, notes and share (8); the landing hero is 7 + 5; Método and Usos entries put their header in 4 columns and the body in 8. The rail is sticky and scrolls internally if it is taller than the viewport, so `Simular` is always reachable. Below 60rem everything is one column in source order. The minimum control height is `--control-min-size` (2.75rem).
- Selectors are BEM-like classes (`block__element--modifier`) plus state via attributes (`[data-highlighted]`, `[data-variant]`, `[data-kind]`, `[data-provenance]`, `[data-tone]`, `[data-invalid]`, `[aria-busy]`, `[aria-current]`). Do not style by element structure deep in components. `.eyebrow`, `.note`, `.glossary` and `.section-title` are shared blocks across views.
- SVG elements whose `fill` attribute is a pattern must not receive a CSS `fill`, because CSS overrides presentation attributes. Hence the `:not([data-highlighted])` selectors.
- Chart series must differ by pattern, outline, width or dash, never by hue alone.

## Invariants

1. Same URL (lab + params + seed) ⇒ identical results, charts and metrics.
2. Every lab URL and page URL round-trips: `canonicalizeQuery(canonical) === canonical`.
3. Malformed query values never throw. They are defaulted or clamped.
4. No estimated number is shown without its sample count. Exact values are labelled "Exacto".
5. Kernels never touch React, the DOM, `Math.random` or time.
6. Every chart has a visible text description and, where it has data, a table fallback.
7. All functionality is operable by keyboard at a 360 px viewport with no horizontal page scroll.

## Verification

```bash
npm install
npm run typecheck   # tsc -b (app + vite config)
npm test            # vitest run: lib, query contract, kernels, chart markup
npm run build       # typecheck + production bundle in dist/
npm run check       # all three
npm run preview     # serve dist/ at http://localhost:4173
```

Browser checks (manual or scripted; Playwright is not a project dependency) cover these points at 1280 px and 360 px:

- Navigation: focus lands on the heading (or on the Método section named by the fragment), `aria-current` is set, and the title changes. Explorar, Método and Usos have their own URLs, and Back returns to the previous view.
- Editing inputs and running `Simular` updates the URL, and the seed changes unless the repeat-seed box is checked.
- Invalid input shows an error and blocks the run.
- Copying the link and opening it reproduces identical metrics.
- Malformed URLs are canonicalized.
- Back leaves the lab.
- Tab order: skip link, fields, `Simular`, disclosures, share. Sliders are not tab stops.
- No horizontal overflow at 360 px, and no console errors. Hierarchy, controls and charts are readable at 1280 px and 360 px.
- The font loads from the app's own origin (no third-party request).
