# Rachta

Rachta is an interactive laboratory for randomness, streaks and risk, written in Spanish. You change a hypothesis, simulate thousands of reproducible futures, and compare intuition, an exact probability and a simulation estimate. Everything runs in the browser. There are no accounts, no cookies, no third-party analytics and no third-party requests (the typeface is self-hosted).

- Product brief: [`docs/PRODUCT_BRIEF.md`](docs/PRODUCT_BRIEF.md)
- Architecture and contracts: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Visual design system: [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
- Remaining work: [`docs/IMPLEMENTATION_CHECKLIST.md`](docs/IMPLEMENTATION_CHECKLIST.md)

## Status

All four labs are complete: Streaks, Bayes, hypothetical risk of ruin, and compound losses. Each has its simulation model, exact formulas, screen, interpretation copy and tests. The interface follows the "quiet precision" design system, and two companion views document the labs: **Método** (`?page=method`) and **Usos** (`?page=uses`).

The functional release was verified in a browser at desktop and 360 px widths. The design-system pass is covered by tests, the type check and a production build; its browser check is still open in [`docs/IMPLEMENTATION_CHECKLIST.md`](docs/IMPLEMENTATION_CHECKLIST.md).

## Requirements

Node.js 22 or later, with npm.

## Commands

```bash
npm install          # install dependencies
npm run dev          # development server (http://localhost:5173)
npm test             # unit tests (Vitest)
npm run typecheck    # strict TypeScript check
npm run build        # type check + production build in dist/
npm run check        # typecheck + tests + build
npm run preview      # serve the production build (http://localhost:4173)
```

## Static hosting

`npm run build` produces a fully static `dist/` folder. Asset paths are relative (`base: './'`), and all state lives in the query string (`?lab=streaks&p=0.55&…&seed=…`, `?page=method`, `?page=uses`). As a result the site works at a domain root or under a sub-path and needs no rewrite rules.

- **Netlify / Cloudflare Pages / Vercel:** build command `npm run build`, output directory `dist`.
- **GitHub Pages:** publish the contents of `dist/`, for example with a Pages action that uploads `dist` as the artifact.

The build includes a Web Worker file (`assets/simulation.worker-*.js`) and the self-hosted font (`assets/InstrumentSans-Variable-*.woff2`). The host must serve them with JavaScript and `font/woff2` MIME types, which all the hosts above do by default.

## Font licence

Instrument Sans is © 2022 The Instrument Sans Project Authors and is used under the SIL Open Font License 1.1. The licence is in [`src/assets/fonts/OFL.txt`](src/assets/fonts/OFL.txt).

## Reproducibility

Each result is determined by the URL, which holds the lab, its parameters and a seed. Opening the same link reproduces the same futures. The seeded generator and the order of the draws are part of that contract, and golden tests protect them.
