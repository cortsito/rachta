# Rachta — product brief

## Product thesis

**Rachta** is an interactive laboratory for randomness, streaks, and risk. A visitor changes a hypothesis with clear controls, runs thousands of reproducible futures, and learns the difference between intuition, an exact probability, and a simulation estimate.

It is not a financial calculator, gambling product, or complete course. It is a fast, honest experience for probability/statistics students, data and programming learners, and curious people who want to *see* why uncertainty and streaks feel counterintuitive. Product copy is Spanish in this release; do not spend time on internationalization.

The target reaction is: “I finally understood this in two minutes; I want to send this scenario to someone.”

## Non-negotiable principles

- **Learn by manipulating.** Every lab begins with a human question, exposes meaningful controls, and ends with a concise interpretation that responds to the selected inputs.
- **Mathematical honesty.** Always distinguish `Exacto` from `Estimado con N simulaciones`; state assumptions; format numbers legibly without false precision.
- **No friction.** Open, explore, and share. No account, backend, tracking, or keys.
- **A finished core over a broad catalogue.** Four complete labs are better than ten partial ones.
- **Educational risk only.** The capital lab uses hypothetical units and explicitly does not recommend financial, betting, or real-world decisions.
- **A reskinnable visual system.** `docs/DESIGN_SYSTEM.md` defines the adopted visual direction and its semantic-token boundaries. Apply it without turning visual details into JSX or hard-coded feature styles that a later designer would need to undo.

## Fixed technical baseline

Use this baseline unless the existing repository already has a compatible implementation:

- React, strict TypeScript, and Vite for a static single-page application.
- Native browser APIs, React hooks, plain `.css` files, and custom SVG for data graphics. No Tailwind, CSS framework, CSS-in-JS, component kit, chart library, router, or client-state library.
- One URL-query state contract, using `lab` plus validated parameter values and an optional seed, or `page` for the parameterless `Método` and `Usos` views. No server-side routing is required.
- A small seeded PRNG and pure simulation functions in `src/lib` or equivalent. Simulation code must not depend on React or DOM state.
- A focused test runner for pure probability functions, URL parsing/serialization, seeded reproducibility, and boundary cases.

Use a feature-first source layout. A reasonable initial shape is below; do not create empty folders or abstractions merely to reproduce it.

```text
src/
  app/                 # composition, query-state boundary, application shell
  features/
    streaks/
    bayes/
    ruin/
    compound-loss/
  components/
    ui/                # small semantic primitives only when truly reused
    charts/            # reusable, accessible SVG building blocks
  lib/                 # PRNG, distributions, formatting, validation, statistics
  styles/              # reset, tokens, base, layout and component CSS layers
```

Componentize by behavior and data ownership—not for a textbook atomic-design diagram. A reusable `RangeField`, `MetricList`, `LabLayout`, or chart primitive is valuable; a component solely for a single text line is not. Keep feature-specific calculations and configuration with the feature that owns them.

### CSS contract

Use only standard CSS with the documented layer order reset → tokens → base → layout → components → utilities. `docs/DESIGN_SYSTEM.md` defines the approved visual identity, tokens, typeface, and restrained use of colour, gradients, and elevation. Keep styling semantic and reskinnable. Charts must remain distinguishable through labels, patterns, line styles, and text—not only colour.

The minimum visual responsibility is legibility: sensible document flow, grouping, responsive columns, form sizing, focus visibility, error/disabled states, and data graphics that can be read. Keep selectors predictable so a future CSS pass can replace presentation without changing markup.

## First-release scope

Build a static SPA that can later deploy to Vercel, Netlify, Cloudflare Pages, or GitHub Pages. It needs a functional navigation mechanism (**Explorar**, **Método**, **Usos**), a concise landing/entry state, four working labs, and the two companion views defined in `docs/DESIGN_SYSTEM.md`: `Método` documents each lab's question, model, formula or procedure, exact versus estimated results, assumptions and limits; `Usos` describes when each lab helps a person reason, with its limitation. Each lab uses the same logical contract:

1. a Spanish question and short explanation;
2. labelled controls with meaningful defaults and a `Simular` action;
3. a primary data visualization that works without a manual;
4. metrics with clear exact/estimated labels;
5. a semantic disclosure section for `Cómo leer esto` and `Supuestos`;
6. an action that copies a URL retaining the chosen lab and relevant parameters.

### Lab 1 — Streaks

**Question:** “If I win 55% of the time, how normal is it to lose eight in a row?”

Inputs: success probability, attempts per future, streak threshold, and number of futures. Show one seeded run as a success/failure sequence and a histogram/distribution of the longest losing streak over all futures. Report: estimated probability of reaching at least the chosen losing streak, median worst streak, worst streak in the displayed run, and sample count. Explain that a positive edge and bad streaks can coexist.

### Lab 2 — Bayes with people, not symbols

**Question:** “If a test is positive, what is the real probability that the condition is present?”

Inputs: prevalence, sensitivity, specificity, and simulated population. Show a labelled 2×2 matrix or a people grid that makes true and false positives tangible. Calculate the positive predictive value **exactly** with the conditional-probability formula; optionally contrast it with a simulated population. Handle zero denominators and invalid inputs safely. Teach the effect of low prevalence without making medical claims.

### Lab 3 — Hypothetical risk of ruin

**Question:** “Is a small edge enough to survive a bad sequence?”

Inputs: initial capital, favourable-outcome probability, relative gain/loss per round, fraction exposed per round, rounds, and number of futures. Simulate seeded capital paths. Show sample paths plus highlighted percentile paths, then report a clearly defined probability of ruin (for example, capital below 5% of the starting amount), median maximum drawdown, and median final capital. Use abstract units and a visible educational disclaimer.

### Lab 4 — Compound losses

**Question:** “Why does an average fail to describe rare, expensive events?”

Inputs: expected event frequency per period, typical severity, dispersion, number of futures, and a threshold. Model event count with a Poisson distribution and positive severity with a lognormal distribution, or use another explicitly named, correctly implemented model. Show a total-loss histogram with percentile markers. Report mean, median, 90th percentile, and estimated probability of exceeding the selected threshold. Explain skew and why mean and median differ.

### Only after the core is complete

Monty Hall, preset scenarios, PNG export, and English copy are optional. The footer's fixed Ko-fi link is a plain outbound anchor, never an embedded payment widget. Never trade away a working lab, tests, responsive semantics, or verification for an optional feature.

## Behaviour and quality requirements

- A supplied seed must produce the same run. The share URL preserves `lab`, relevant safe parameters, and seed. Malformed query values must be clamped or discarded without breaking the app.
- Use labels, `fieldset`/`legend` where appropriate, native buttons, visible focus, modest `aria-live` feedback, and textual descriptions for information that only appears in a chart.
- Use chunked work or `requestAnimationFrame` if a chosen sample size would visibly freeze the interface. Respect `prefers-reduced-motion`; animation is optional and must not be the only way to understand data.
- Use readable Spanish number formatting (for example `12,5 %`) and normally two or three significant figures.
- No fake donation URLs, repository URLs, claims, users, testimonials, or data sources. If a donation configuration is absent, do not show a CTA that appears to work.

## Definition of done

The release is done when someone can open the site, alter values, run all four labs, and receive coherent metrics; open the same shared URL and recover the scenario; operate all functionality at a mobile viewport; and build the project without material console errors. Essential formulas and boundary cases have automated tests or equally precise automated checks. `README.md` contains accurate install, test, build, and static-hosting guidance.

Authentication, real payments, CMS, accounts, exhaustive SEO, databases, generated content, external data, and deployment are explicitly out of scope. The product design is governed by `docs/DESIGN_SYSTEM.md`.
