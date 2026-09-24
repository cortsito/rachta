import { defineSchema, type ParamValues } from '../../lib/params.ts';

/**
 * URL keys: prevalence, sensitivity, specificity (fractions), population
 * (simulated people). Prevalence has a finer step so rare conditions fit.
 */
export const bayesSchema = defineSchema({
  specs: {
    prevalence: { min: 0, max: 1, step: 0.0001, default: 0.01, display: 'percent' },
    sensitivity: { min: 0, max: 1, step: 0.001, default: 0.9, display: 'percent' },
    specificity: { min: 0, max: 1, step: 0.001, default: 0.95, display: 'percent' },
    population: { min: 100, max: 1_000_000, step: 100, default: 10000 },
  },
});

export type BayesParams = ParamValues<typeof bayesSchema.specs>;
