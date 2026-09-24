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

  it('does not claim a large mean–median gap or rare expensive events when dispersion is low', () => {
    const result = simulateCompoundLoss({ ...base, frequency: 50, severity: 1000, dispersion: 0.1 });
    const text = interpretCompoundLoss(result).map(plain);
    const [moments, skew] = text;
    expect(Math.abs(result.exact.mean - result.median) / result.exact.mean).toBeLessThan(0.05);
    for (const paragraph of text) {
      expect(paragraph).not.toContain('mucho menor');
      expect(paragraph).not.toContain('media no es un valor típico');
      expect(paragraph).not.toContain('más costosos');
      expect(paragraph).not.toContain('mucho más costoso');
    }
    expect(moments).toContain('muy parecida a la media');
    expect(skew).toContain('la media sí se parece a un periodo típico');
  });

  it('attributes a skew with low dispersion to the event count, not to costly events', () => {
    // Most periods have no event, so the median is 0 even though every event costs about the same.
    const result = simulateCompoundLoss({ ...base, frequency: 0.5, dispersion: 0.1 });
    const [moments, skew] = interpretCompoundLoss(result).map(plain);
    expect(result.median).toBe(0);
    expect(moments).toContain('mucho menor que la media');
    expect(skew).toContain('más de la mitad de los periodos no tiene ningún evento');
    expect(skew).toContain('número de eventos por periodo');
    expect(skew).not.toContain('más costosos');
  });

  it('attributes a skew with high dispersion to costly events', () => {
    const result = simulateCompoundLoss(base);
    const [moments, skew] = interpretCompoundLoss(result).map(plain);
    expect(moments).toContain('mucho menor que la media');
    expect(skew).toContain('eventos mucho más costosos que el típico');
    expect(skew).not.toContain('no tiene ningún evento');
  });
});
