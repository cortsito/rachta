import { describe, expect, it } from 'vitest';
import { interpretCompoundLoss, proportionAtMost } from './interpretation.ts';
import { simulateCompoundLoss, type CompoundLossInput } from './model.ts';

const plain = (text: string) => text.replace(/[  ]/g, ' ');
const base: CompoundLossInput = { frequency: 2, severity: 1000, dispersion: 1.2, threshold: 10000, futures: 20000, seed: 'x' };

describe('proportionAtMost', () => {
  it('finds the proportion of sorted values at or below a threshold', () => {
    expect(proportionAtMost([1, 2, 3, 4, 5], 3)).toBe(0.6);
    expect(proportionAtMost([1, 2, 3], 0)).toBe(0);
    expect(proportionAtMost([1, 2, 3], 10)).toBe(1);
    expect(proportionAtMost([], 1)).toBeNaN();
  });
});

describe('interpretCompoundLoss', () => {
  it('explains why the mean is not typical and states the exceedance tail', () => {
    const result = simulateCompoundLoss(base);
    const [moments, skew, tail] = interpretCompoundLoss(result).map(plain);
    expect(moments).toContain('mediana simulada');
    expect(skew).toContain('media no es un valor típico');
    expect(skew).toContain('pierde menos que la media');
    expect(tail).toContain('percentil 90');
    expect(tail).toContain('no tiene ningún evento');
  });

  it('reports a high proportion below the mean under heavy right skew', () => {
    const result = simulateCompoundLoss({ ...base, dispersion: 2.5 });
    const belowMean = proportionAtMost(result.sortedTotals, result.exact.mean);
    expect(belowMean).toBeGreaterThan(0.5);
  });
});
