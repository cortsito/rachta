# Rachta — design system

## Status and purpose

This is the visual source of truth for Rachta. It replaces the previous decision to defer product styling while preserving the product and technical contracts in `docs/PRODUCT_BRIEF.md` and `docs/ARCHITECTURE.md`.

Rachta should feel like a calm, contemporary probability instrument: clear before expressive, precise before decorative, and warm without becoming playful. It may borrow *principles* from Stripe—strong type hierarchy, disciplined white space, restrained colour, and a confident grid—but must not imitate Stripe's visual assets, composition, copy, or purple brand.

The system deliberately specifies **roles, boundaries, and decision criteria**, not a frozen mockup. A future redesign should change tokens and component styling first, with markup and simulation logic largely untouched.

## Design principles

1. **The evidence is the visual identity.** Charts, values, mathematical claims, and assumptions carry the personality. Decoration must never compete with a result.
2. **Calm density.** One clearly grouped work surface is better than a dashboard of small cards. Use empty space, rules, and type to establish hierarchy.
3. **Make uncertainty legible.** Exact, estimated, sampled, and illustrative information must remain visually and verbally distinct.
4. **Simple interaction, rich explanation.** A visitor should be able to modify a hypothesis in seconds, then choose whether to learn the method behind it.
5. **A system, not a skin.** Components describe a purpose (`metric`, `chart`, `field`), never a visual accident (`blue-card`, `hero-box-2`). Raw visual values belong in tokens.
6. **Accessibility is part of the aesthetic.** Native controls, visible keyboard focus, text alternatives, colour-independent chart distinctions, and reduced motion are product requirements.

## Visual direction: quiet precision

### Overall character

- Light-first, near-white canvas; no automatic dark theme unless it is designed, tested, and documented as a complete token set.
- Near-black text, softened secondary text, fine cool-grey rules, and a clear blue action colour.
- One restrained blue wash is acceptable in the landing hero. Gradients may suggest atmosphere or data density, but never encode a number, state, or interaction target.
- Surfaces are mostly flat. A border or a change of background is the default grouping tool; use only two subtle shadow elevations when depth is genuinely useful.
- Corners are modest. Avoid capsules except for compact status labels or tags where a pill is semantically useful.
- No glass effects, aurora blobs, oversized decorative icons, stock illustrations, fake terminal motifs, floating dashboard widgets, or ornamental animated backgrounds.

### Palette roles

The initial values below are an intentional baseline, not component-level constants. They must live in `styles/tokens.css` as primitive and semantic tokens. Components and feature CSS consume semantic tokens only.

| Role | Initial value | Use |
| --- | --- | --- |
| Canvas | `#fbfbf9` | Page background |
| Surface | `#ffffff` | A deliberately grouped work surface |
| Ink | `#171a18` | Primary text and high-emphasis chart marks |
| Muted ink | `#5d6661` | Supporting copy, axes, metadata |
| Rule | `#e2e5e1` | Borders, low-emphasis grid lines |
| Soft blue | `#e8efff` | Accent wash, selected low-emphasis surface |
| Action blue | `#2459d6` | Primary action, active navigation, primary chart series |
| Teal | `#08796d` | A distinct positive/comparison series when needed |
| Amber | `#a76424` | Caution or a second distinct comparison series |
| Risk red | `#a83c39` | Loss/ruin emphasis only; never the sole signal |

The implementation must verify text and control contrast in their actual contexts. Error, success, active, disabled, focus, and chart-series values are semantic roles—not aliases for arbitrary hues. A semantic state also requires text, shape, pattern, position, or an accessible label.

### Typography

Use **Instrument Sans** as the only product typeface, self-hosted as WOFF2 variable files with a system-sans fallback. It is open-source under OFL, supports variable width and weight, and provides tabular figures. Do not request Google Fonts at runtime: a site that promises no third-party analytics or cookies should avoid an unnecessary third-party font request too.

- Body: regular, comfortable line-height, normal width. Prefer 400–450 weight.
- Display headings: slightly condensed through the `wdth` axis, restrained medium weight, tight but readable tracking. The typography should make a short question feel intentional, not monumental.
- Navigation, labels, provenance, and chart annotations: compact, slightly condensed, all caps only when the label is short and useful.
- Numbers and formulas: Instrument Sans with `font-variant-numeric: tabular-nums`; do not introduce a trendy monospace face. Formula display is a typographic role, not a code editor.
- Never use a type scale merely because a token exists. A new level needs a semantic use case.

Use `font-stretch`/`font-variation-settings` only in the type rules, never ad hoc in JSX or individual feature styles. Do not activate stylistic alternates without checking legibility in Spanish and in mathematical notation.

### Space, grid, and responsive composition

- Retain the existing small spacing scale and evolve it as a coherent 4px-based rhythm. Components use semantic spacing tokens; do not insert one-off pixel margins to repair a layout.
- Page content has a generous desktop maximum (roughly 76–80rem) and a comfortable responsive gutter. The page grid is 12 columns on wide screens.
- The landing hero uses asymmetric composition: explanatory copy occupies the visual majority and a real, simplified data graphic occupies the remainder. It is not a marketing illustration.
- A desktop lab uses a stable control rail of roughly four grid columns and a results area of roughly eight. Controls can remain sticky only when there is sufficient vertical room; the content must remain ordinary document flow on small screens.
- At narrow widths the reading and tab order is: title and framing → controls → simulate action → result and chart → explanation → method/share. There must be no horizontal page overflow at 360px.
- Use a single responsive layout threshold unless a component demonstrably needs another. Fluid type and spacing (`clamp`) are preferable to breakpoint accumulation.

## Component and CSS architecture

### What must remain stable

The current component boundaries are intentional and should be preserved:

- `LabLayout` owns the shared semantic lab structure.
- `SimulationForm`, `RangeField`, `MetricList`, `Disclosure`, `ShareLink`, and chart primitives remain reusable by purpose.
- Feature-local visualizations stay in their features until a second real use case exists.
- Simulations, parameter schemas, URL state, and chart data contracts are presentation-independent.

Add a component only when it owns behavior, accessibility, or a repeated semantic structure. Do not create generic `Box`, `Stack`, `Text`, `Card`, or one-line “atoms” whose only purpose is to mirror a design-system diagram. Conversely, do not duplicate a meaningful composite such as a method block or a chart caption across pages.

### Styling boundaries

Keep the established CSS layer order:

```text
reset → tokens → base → layout → components → utilities
```

- `tokens.css`: primitive values and semantic aliases only. This is the primary reskinning point.
- `base.css`: document defaults, typography elements, focus, motion preference, tables, and link behaviour.
- `layout.css`: page shell, grid, content widths, lab composition, and responsive placement.
- `components.css` / `charts.css`: styles for named semantic components. They may reference semantic tokens, never hard-coded palette values.
- `features/<lab>/*.css`: only visual treatment that is unique to that lab; they still consume the same semantic tokens.
- `utilities.css`: accessibility and rare explicit utilities only. It must not grow into a utility-first styling system.

Selectors use BEM-like global names and state attributes, for example `.metric`, `.metric__value`, `.metric--primary`, `[data-provenance='estimated']`, and `[data-state='stale']`. Avoid deep structural selectors and visual-name classes. Do not put `style` props, CSS-in-JS, or hard-coded visual values in React components.

### Token model

Use two levels of tokens:

1. **Primitive tokens**: neutral/blue/teal/amber/red ramps, spacing steps, radii, shadow levels, font files, type sizes, and layout measures.
2. **Semantic tokens**: `--color-page`, `--color-surface`, `--color-ink`, `--color-muted`, `--color-rule`, `--color-action`, `--color-focus`, `--chart-primary`, `--chart-comparison`, `--chart-risk`, `--space-section`, `--shadow-raised`, and similar roles.

Component CSS references the second level. A future visual direction can then remap semantic roles, font settings, density, and elevation in one place rather than search for colour literals across feature styles.

Do not over-tokenize a single-use exception. If an exception becomes repeated, name its role and promote it deliberately.

## Page patterns

### Application shell

The header is a quiet instrument panel: site name at left; navigation for **Explorar**, **Método**, and **Usos**; no auth controls, search, animated logo, or fake product controls. The current section is apparent through text, position, and a restrained active state.

The footer is calm and factual. It should state the educational disclaimer, attribute **Luis Cortés**, and say that the app uses no cookies or third-party analytics. Use wording scoped to the app, not an unprovable promise about every infrastructure provider. Example:

> Hecho por Luis Cortés · Esta aplicación no usa cookies ni analítica de terceros.

An optional “Invítame un café” link appears only when a configured support URL exists. It is a normal outbound anchor, not an embedded widget or tracker. The destination and its privacy policy are outside Rachta.

### Explore and landing

The landing page introduces one useful idea, then lets a visitor pick a question. It should not become a SaaS landing page.

- Hero: concise statement, short explanation, and a genuine simplified probability graphic.
- Lab catalogue: four purposeful entries, each with a number, question, one-sentence description, and unobtrusive directional affordance.
- Avoid identical card grids. A list, rules, asymmetric columns, and typographic hierarchy are usually better.

### Lab workbench

A lab is an evidence workspace, not a KPI dashboard.

- The control rail starts with the human hypothesis and exposes only meaningful parameters.
- The main result begins with a single answer and its provenance, then a chart that explains it, followed by supporting metrics.
- `Exacto`, `Estimado con N simulaciones`, and a single sample path receive different semantic treatments without looking like alerts.
- Explanations and assumptions are available immediately after the result, without interrupting the initial task.
- A selected or updated state can receive a short transition; it must not be required to understand that a result changed.

### Charts

Charts are custom SVG and should remain that way. Preserve their visible title, text description, data-table fallback, and pattern distinctions.

- Pick a chart type from the question being answered, not to fill a layout region.
- Put the core conclusion in the chart title or adjacent interpretation.
- Prefer direct labels when they fit; legends are secondary aids, not required decoration.
- Use subtle grid lines and concise axis labels. Bar charts that encode amount begin at zero; trend lines may use a tighter domain only when it is labelled honestly.
- Give each lab one primary chart accent. Multiple series must also differ by line style, stroke width, outline, marker, or pattern.
- Keep existing hatch logic where it expresses a threshold. Hatching is data, not texture.
- Do not add hover-only information essential to interpretation.

### Method

`Método` is an educational companion, not an “About us” wall of prose. Each lab follows the same schema:

1. **Pregunta** — the decision or intuition being examined.
2. **Modelo** — variables and the relationship between them.
3. **Fórmula o procedimiento** — readable mathematical notation or a concise simulation sequence.
4. **Qué se calcula exactamente** — distinguish an analytic result from an estimate.
5. **Supuestos** — conditions under which the model makes sense.
6. **Límites** — what the output does not predict or recommend.

Keep method content in typed, structured content data or focused per-lab modules, not in a huge conditional JSX file. Formula copy must be verified against the model implementation and tests before it is presented as fact.

### Uses

`Usos` explains when a lab helps a person reason, not what action they should take. Use short case patterns such as separating a streak from evidence, interpreting a positive result with base rates, seeing path-dependent downside, and understanding rare compounding losses. Each pattern links back to a lab and states the limitation. It must not become financial, medical, gambling, or professional advice.

## Interaction and accessibility requirements

- Preserve native form controls and visible labels. Never replace them with custom div controls for appearance.
- Maintain the existing focus and focus-on-navigation behaviour; the focus indicator must be clearly visible on every surface.
- Keep a reduced-motion baseline. Motion is limited to useful feedback: an input thumb, a result transition, or chart marks settling after a run. No autoplaying or parallax effects.
- Respect text zoom, keyboard navigation, and the current 360px no-overflow requirement.
- All chart colour has a non-colour counterpart. All essential visual output has text content or the existing data-table fallback.

## Decision autonomy for the implementer

The following are fixed: the product tone, font family, self-hosting, semantic token architecture, light-first palette roles, layout hierarchy, lack of design libraries, accessibility requirements, and the page patterns above.

The implementer should use judgment for exact `clamp()` bounds, spacing within the scale, component-level composition, small-screen wrapping, whether a rule or low-elevation surface groups content better, and the least intrusive motion that communicates a state change. When a detail is not specified, choose the option that is simpler, more legible, and easier to reskin later.

Do not imitate this document as a literal pixel specification. Do not invent additional branding systems, visual themes, or decorative components to fill unspecified space.

## Acceptance criteria

- Replacing values in `tokens.css` changes the visual identity substantially without rewriting simulation code or broad JSX structure.
- No component or feature CSS uses raw palette values for ordinary presentation.
- No new CSS framework, component library, chart library, CSS-in-JS system, router, or runtime font provider is added.
- Existing lab URLs still reproduce the same deterministic results.
- New navigation views have canonical, tested URLs and retain keyboard focus management.
- At 1280px and 360px, hierarchy is clear, controls are usable, charts readable, and no horizontal page overflow appears.
- `npm run check` and the production build succeed.
