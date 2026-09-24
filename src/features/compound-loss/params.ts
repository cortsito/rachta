import { defineSchema, type ParamValues } from '../../lib/params.ts';

/**
 * URL keys: frequency (expected events per period, Poisson λ), severity
 * (typical = median loss per event), dispersion (σ of ln severity),
 * threshold (total loss to exceed, same units), futures (simulated periods).
 */
export const compoundLossSchema = defineSchema({
  specs: {
    frequency: { min: 0.1, max: 50, step: 0.1, default: 2 },
    severity: { min: 1, max: 100_000, step: 1, default: 1000 },
    dispersion: { min: 0.1, max: 3, step: 0.05, default: 1.2 },
    threshold: { min: 0, max: 10_000_000, step: 100, default: 10000 },
    futures: { min: 1000, max: 50000, step: 1000, default: 20000 },
  },
});

export type CompoundLossParams = ParamValues<typeof compoundLossSchema.specs>;
