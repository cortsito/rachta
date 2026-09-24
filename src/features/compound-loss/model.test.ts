import { describe, expect, it } from 'vitest';
import { compoundLossExact, simulateCompoundLoss, type CompoundLossInput } from './model.ts';

const base: CompoundLossInput = {
  frequency: 2,
  severity: 1000,
  dispersion: 1.2,
  threshold: 10000,
  futures: 20000,
  seed: 'rachas',
};

describe('compoundLossExact', () => {
  it('computes compound Poisson–lognormal moments', () => {
    const exact = compoundLossExact(base);
    const severityMean = 1000 * Math.exp(0.72);
    expect(exact.severityMean).toBeCloseTo(severityMean, 9);
    expect(exact.severityMedian).toBe(1000);
    expect(exact.mean).toBeCloseTo(2 * severityMean, 9);
    expect(exact.standardDeviation).toBeCloseTo(Math.sqrt(2 * 1000 ** 2 * Math.exp(2 * 1.44)), 6);
    expect(exact.probabilityOfNoLoss).toBeCloseTo(Math.exp(-2), 14);
  });
});

describe('simulateCompoundLoss', () => {
  it('is reproducible and locked to golden values', () => {
    const a = simulateCompoundLoss(base);
    expect(simulateCompoundLoss(base)).toEqual(a);
    expect(a.exceedance.successes).toBe(1937);
    expect(a.median).toBeCloseTo(2273.0875235028116, 6);
    expect(a.p90).toBeCloseTo(9827.718754353658, 6);
  });

  it('returns sorted totals and ordered summary statistics', () => {
    const result = simulateCompoundLoss(base);
    expect(result.sortedTotals).toHaveLength(base.futures);
    for (let i = 1; i < result.sortedTotals.length; i++) {
      expect(result.sortedTotals[i]).toBeGreaterThanOrEqual(result.sortedTotals[i - 1]!);
    }
    expect(result.median).toBeLessThanOrEqual(result.p90);
    expect(result.p90).toBeLessThanOrEqual(result.p99);
    // Right skew: the mean sits above the median.
    expect(result.mean).toBeGreaterThan(result.median);
  });

  it('matches the exact mean and zero-loss probability within sampling error', () => {
    const result = simulateCompoundLoss({ ...base, dispersion: 0.5, futures: 50000 });
    const standardError = result.exact.standardDeviation / Math.sqrt(50000);
    expect(Math.abs(result.mean - result.exact.mean)).toBeLessThan(5 * standardError);
    const zeros = result.sortedTotals.filter((total) => total === 0).length / 50000;
    expect(zeros).toBeCloseTo(result.exact.probabilityOfNoLoss, 2);
  });

  it('uses the PTRS branch for high frequencies without bias', () => {
    const result = simulateCompoundLoss({ ...base, frequency: 30, dispersion: 0.3, futures: 20000 });
    const standardError = result.exact.standardDeviation / Math.sqrt(20000);
    expect(Math.abs(result.mean - result.exact.mean)).toBeLessThan(5 * standardError);
  });

  it('counts strict exceedance, so threshold 0 estimates P(any loss)', () => {
    const result = simulateCompoundLoss({ ...base, threshold: 0 });
    const zeros = result.sortedTotals.filter((total) => total === 0).length;
    expect(result.exceedance.successes).toBe(base.futures - zeros);
  });

  it('rejects impossible input', () => {
    expect(() => simulateCompoundLoss({ ...base, severity: 0 })).toThrow(RangeError);
    expect(() => simulateCompoundLoss({ ...base, frequency: -1 })).toThrow(RangeError);
    expect(() => simulateCompoundLoss({ ...base, futures: 1.5 })).toThrow(RangeError);
  });
});
