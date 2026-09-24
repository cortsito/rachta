# Rachas

Rachas is an interactive laboratory for randomness, streaks and risk, written in Spanish. You change a hypothesis, simulate thousands of reproducible futures, and compare intuition, an exact probability and a simulation estimate. Everything runs in the browser. There are no accounts, no server and no tracking.

- Product brief: [`docs/PRODUCT_BRIEF.md`](docs/PRODUCT_BRIEF.md)
- Architecture and contracts: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Remaining work: [`docs/IMPLEMENTATION_CHECKLIST.md`](docs/IMPLEMENTATION_CHECKLIST.md)

## Status

All four labs are complete: Streaks, Bayes, hypothetical risk of ruin, and compound losses. Each has its simulation model, exact formulas, screen, interpretation copy and tests, and is wired into navigation. Verified in a browser at desktop and 360 px widths (inputs, `Simular`, exact/estimated labels, share-link round trip, malformed URLs, keyboard operation, no console errors).

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

`npm run build` produces a fully static `dist/` folder. Asset paths are relative (`base: './'`), and all state lives in the query string (`?lab=streaks&p=0.55&…&seed=…`). As a result the site works at a domain root or under a sub-path and needs no rewrite rules.

- **Netlify / Cloudflare Pages / Vercel:** build command `npm run build`, output directory `dist`.
- **GitHub Pages:** publish the contents of `dist/`, for example with a Pages action that uploads `dist` as the artifact.

The build includes a Web Worker file (`assets/simulation.worker-*.js`). The host must serve it with a JavaScript MIME type, which all the hosts above do by default.

## Reproducibility

Each result is determined by the URL, which holds the lab, its parameters and a seed. Opening the same link reproduces the same futures. The seeded generator and the order of the draws are part of that contract, and golden tests protect them.
