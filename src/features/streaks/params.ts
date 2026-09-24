import { defineSchema, type ParamValues } from '../../lib/params.ts';

/**
 * URL keys: p (success probability), attempts (per future), streak (losing
 * streak threshold), futures (simulated futures).
 * Bounds cap the kernel at futures × attempts ≤ 2·10⁷ Bernoulli draws.
 */
export const streaksSchema = defineSchema({
  specs: {
    p: { min: 0, max: 1, step: 0.01, default: 0.55, display: 'percent' },
    attempts: { min: 10, max: 1000, step: 1, default: 100 },
    streak: { min: 1, max: 100, step: 1, default: 8 },
    futures: { min: 100, max: 20000, step: 100, default: 10000 },
  },
  constrain: (values) => ({ ...values, streak: Math.min(values.streak, values.attempts) }),
});

export type StreaksParams = ParamValues<typeof streaksSchema.specs>;
