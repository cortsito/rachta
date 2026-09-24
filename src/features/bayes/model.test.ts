import { describe, expect, it } from 'vitest';
import { bayesExact, expectedCounts, simulateBayes, simulatePopulation, type BayesInput } from './model.ts';

const base: BayesInput = { prevalence: 0.01, sensitivity: 0.9, specificity: 0.95, population: 10000, seed: 'rachas' };

const sum = (c: { truePositive: number; falsePositive: number; falseNegative: number; trueNegative: number }) =>
  c.truePositive + c.falsePositive + c.falseNegative + c.trueNegative;

describe('bayesExact', () => {
  it('applies Bayes’ rule', () => {
    const exact = bayesExact(base);
    expect(exact.ppv).toBeCloseTo(0.009 / (0.009 + 0.0495), 14);
    expect(exact.npv).toBeCloseTo(0.9405 / (0.9405 + 0.001), 14);
    expect(exact.positiveRate).toBeCloseTo(0.0585, 14);
    expect(sum(exact.joint)).toBeCloseTo(1, 14);
  });

  it('matches the classic 1 % / 80 % / 90.4 % mammography example (≈ 7.8 %)', () => {
    expect(bayesExact({ prevalence: 0.01, sensitivity: 0.8, specificity: 0.904 }).ppv).toBeCloseTo(0.0776, 4);
  });

  it('returns null instead of dividing by zero', () => {
    // Nobody can test positive.
    expect(bayesExact({ prevalence: 0, sensitivity: 0.9, specificity: 1 }).ppv).toBeNull();
    expect(bayesExact({ prevalence: 1, sensitivity: 0, specificity: 0.5 }).ppv).toBeNull();
    // Nobody can test negative.
    expect(bayesExact({ prevalence: 1, sensitivity: 1, specificity: 0.5 }).npv).toBeNull();
    // Defined edges.
    expect(bayesExact({ prevalence: 0, sensitivity: 0.9, specificity: 0.9 }).ppv).toBe(0);
    expect(bayesExact({ prevalence: 0.3, sensitivity: 0.9, specificity: 1 }).ppv).toBe(1);
  });

  it('rejects invalid rates', () => {
    expect(() => bayesExact({ prevalence: -0.1, sensitivity: 0.9, specificity: 0.9 })).toThrow(RangeError);
    expect(() => bayesExact({ prevalence: 0.1, sensitivity: Number.NaN, specificity: 0.9 })).toThrow(RangeError);
  });
});

describe('expectedCounts', () => {
  it('rounds natural frequencies to whole people that add up to the population', () => {
    expect(expectedCounts(base, 10000)).toEqual({
      truePositive: 90,
      falsePositive: 495,
      falseNegative: 10,
      trueNegative: 9405,
    });
    for (const population of [1, 7, 100, 999, 12345]) {
      const counts = expectedCounts({ prevalence: 0.137, sensitivity: 0.713, specificity: 0.891 }, population);
      expect(sum(counts)).toBe(population);
      expect(Object.values(counts).every((c) => Number.isInteger(c) && c >= 0)).toBe(true);
    }
  });
});

describe('simulateBayes', () => {
  it('is reproducible and locked to golden values', () => {
    const a = simulateBayes(base);
    expect(simulateBayes(base)).toEqual(a);
    expect(a.simulated).toEqual({ truePositive: 90, falsePositive: 515, falseNegative: 18, trueNegative: 9377 });
    expect(sum(a.simulated)).toBe(base.population);
    expect(a.simulatedPpv?.value).toBeCloseTo(90 / 605, 14);
  });

  it('converges to the exact PPV for a large population', () => {
    const result = simulateBayes({ ...base, prevalence: 0.2, population: 400_000 });
    expect(result.simulatedPpv!.value).toBeCloseTo(result.exact.ppv!, 2);
  });

  it('reports no simulated PPV when nobody tests positive', () => {
    const result = simulateBayes({ ...base, prevalence: 0, specificity: 1 });
    expect(result.simulated.truePositive + result.simulated.falsePositive).toBe(0);
    expect(result.simulatedPpv).toBeNull();
    expect(result.exact.ppv).toBeNull();
  });

  it('respects deterministic rates', () => {
    const counts = simulatePopulation({ ...base, prevalence: 1, sensitivity: 1, population: 500 });
    expect(counts).toEqual({ truePositive: 500, falsePositive: 0, falseNegative: 0, trueNegative: 0 });
  });
});
