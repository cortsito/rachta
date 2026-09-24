import { describe, expect, it } from 'vitest';
import { lossHistogram } from './histogram.ts';
import { simulateCompoundLoss } from './model.ts';

const totals = Float64Array.from([0, 0, 0, 5, 8, 10, 10, 15, 20]);
const highlighted = (threshold: number) =>
  lossHistogram(totals, threshold, 20, 4).bins.map((bin) => [bin.count, bin.highlightedCount]);

describe('lossHistogram', () => {
  it('never highlights zero-loss periods when the threshold is 0', () => {
    // Bins [0,5) [5,10) [10,15) [15,20]: the three zeros are not > 0.
    expect(highlighted(0)).toEqual([[3, 0], [2, 2], [2, 2], [2, 2]]);
  });

  it('does not highlight values equal to a threshold on a bin edge', () => {
    expect(highlighted(10)).toEqual([[3, 0], [2, 0], [2, 0], [2, 2]]);
  });

  it('highlights only the exceeding part of a bin that straddles the threshold', () => {
    // [5,10) holds 5 (≤ 7) and 8 (> 7).
    expect(highlighted(7)).toEqual([[3, 0], [2, 1], [2, 2], [2, 2]]);
  });

  it.each([0, 1000, 5000, 10000])('matches the exceedance metric for threshold %d', (threshold) => {
    const result = simulateCompoundLoss({ frequency: 2, severity: 1000, dispersion: 1.2, threshold, futures: 20000, seed: 'x' });
    const upper = Math.max(result.p99, threshold);
    const histogram = lossHistogram(result.sortedTotals, threshold, upper, 40);
    const shown = histogram.bins.reduce((sum, bin) => sum + bin.highlightedCount!, 0);
    expect(shown + histogram.overflow).toBe(result.exceedance.successes);
    if (threshold === 0) {
      const zeros = result.sortedTotals.filter((total) => total === 0).length;
      expect(zeros).toBeGreaterThan(0);
      expect(histogram.bins[0]!.count - histogram.bins[0]!.highlightedCount!).toBe(zeros);
    }
  });
});
