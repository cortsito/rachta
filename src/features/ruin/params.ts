import { defineSchema, type ParamValues } from '../../lib/params.ts';

/**
 * Largest capital any path may reach. Capital is a float64 product, so it must
 * stay below Number.MAX_VALUE (≈ 1.8·10³⁰⁸) for paths, percentiles and
 * drawdowns to be finite; 10³⁰⁰ leaves room for rounding in those steps.
 */
export const MAX_REACHABLE_CAPITAL = 1e300;

type GrowthValues = { capital: number; p: number; gain: number; fraction: number };

/**
 * Most rounds for which even an all-favourable path stays within
 * MAX_REACHABLE_CAPITAL:  capital · (1 + fraction·gain)^rounds ≤ 10³⁰⁰.
 * Infinity when capital cannot grow (p = 0 or nothing exposed).
 */
export function maxSafeRounds({ capital, p, gain, fraction }: GrowthValues): number {
  const logGrowth = Math.log1p(fraction * gain);
  if (!(p > 0 && logGrowth > 0)) return Infinity;
  return Math.floor(Math.log(MAX_REACHABLE_CAPITAL / capital) / logGrowth);
}

/**
 * URL keys: capital (initial hypothetical units), p (favourable-outcome
 * probability), gain / loss (relative change of the exposed amount on a
 * favourable / unfavourable round), fraction (share of current capital
 * exposed each round), rounds, futures.
 * Bounds cap the kernel at futures × rounds ≤ 10⁷ steps.
 * Cross-field rule: rounds ≤ roundsLimit (overflow safety, see maxSafeRounds).
 * With these bounds the limit is never below 370 rounds.
 */
const specs = {
  capital: { min: 1, max: 1_000_000, step: 1, default: 1000 },
  p: { min: 0, max: 1, step: 0.01, default: 0.55, display: 'percent' },
  gain: { min: 0.01, max: 5, step: 0.01, default: 1, display: 'percent' },
  loss: { min: 0.01, max: 1, step: 0.01, default: 1, display: 'percent' },
  fraction: { min: 0.01, max: 1, step: 0.01, default: 0.25, display: 'percent' },
  rounds: { min: 10, max: 1000, step: 10, default: 200 },
  futures: { min: 100, max: 10000, step: 100, default: 2000 },
} as const;

/** Largest valid `rounds` (on the step grid) that is overflow-safe for these values. */
export function roundsLimit(values: GrowthValues): number {
  const { min, max, step } = specs.rounds;
  const safe = Math.floor((maxSafeRounds(values) - min) / step) * step + min;
  return Math.max(min, Math.min(max, safe));
}

export const ruinSchema = defineSchema({
  specs,
  constrain: (values) => ({ ...values, rounds: Math.min(values.rounds, roundsLimit(values)) }),
});

export type RuinParams = ParamValues<typeof ruinSchema.specs>;
