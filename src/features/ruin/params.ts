import { defineSchema, type ParamValues } from '../../lib/params.ts';

/**
 * URL keys: capital (initial hypothetical units), p (favourable-outcome
 * probability), gain / loss (relative change of the exposed amount on a
 * favourable / unfavourable round), fraction (share of current capital
 * exposed each round), rounds, futures.
 * Bounds cap the kernel at futures × rounds ≤ 10⁷ steps.
 */
export const ruinSchema = defineSchema({
  specs: {
    capital: { min: 1, max: 1_000_000, step: 1, default: 1000 },
    p: { min: 0, max: 1, step: 0.01, default: 0.55, display: 'percent' },
    gain: { min: 0.01, max: 5, step: 0.01, default: 1, display: 'percent' },
    loss: { min: 0.01, max: 1, step: 0.01, default: 1, display: 'percent' },
    fraction: { min: 0.01, max: 1, step: 0.01, default: 0.25, display: 'percent' },
    rounds: { min: 10, max: 1000, step: 10, default: 200 },
    futures: { min: 100, max: 10000, step: 100, default: 2000 },
  },
});

export type RuinParams = ParamValues<typeof ruinSchema.specs>;
