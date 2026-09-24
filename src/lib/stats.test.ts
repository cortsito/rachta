import { describe, expect, it } from 'vitest';
import {
  binEqualWidth,
  binsFromCounts,
  countAtMost,
  estimateProportion,
  mean,
  median,
  quantileFromCounts,
  quantileSorted,
  quantiles,
  sortedCopy,
  wilsonInterval,
} from './stats.ts';

describe('mean and quantiles', () => {
  it('sorts numerically, not lexicographically', () => {
    expect(Array.from(sortedCopy([10, 9, 100, 1]))).toEqual([1, 9, 10, 100]);
  });

  it('implements type-7 quantiles', () => {
    const sorted = [1, 2, 3, 4];
    expect(quantileSorted(sorted, 0)).toBe(1);
    expect(quantileSorted(sorted, 1)).toBe(4);
    expect(quantileSorted(sorted, 0.5)).toBe(2.5);
    expect(quantileSorted(sorted, 0.9)).toBeCloseTo(3.7, 12);
    expect(quantiles([4, 1, 3, 2], [0.25, 0.75])).toEqual([1.75, 3.25]);
    expect(median([5])).toBe(5);
  });

  it('returns NaN for empty input instead of a fake number', () => {
    expect(mean([])).toBeNaN();
    expect(quantileSorted([], 0.5)).toBeNaN();
    expect(quantileFromCounts([0, 0], 0.5)).toBeNaN();
  });

  it('rejects non-finite data instead of returning NaN or Infinity as an estimate', () => {
    expect(() => quantileSorted([1, 2, Infinity], 0.5)).toThrow(RangeError);
    expect(() => quantileSorted([Infinity, Infinity], 1)).toThrow(RangeError);
    expect(() => quantileSorted(Float64Array.from([1, Number.NaN]).sort(), 0)).toThrow(RangeError);
    expect(() => mean([1, Number.NaN])).toThrow(RangeError);
    expect(() => mean([Number.MAX_VALUE, Number.MAX_VALUE])).toThrow(RangeError);
  });

  it('counts sorted values at or below a threshold', () => {
    expect(countAtMost([0, 0, 1, 2, 2, 3], 2)).toBe(5);
    expect(countAtMost([0, 0, 1], 0)).toBe(2);
    expect(countAtMost([1, 2], 0.5)).toBe(0);
    expect(countAtMost([], 1)).toBe(0);
  });

  it('computes the same quantiles from a frequency table as from raw data', () => {
    const raw = [0, 1, 1, 2, 2, 2, 3, 7, 7, 9];
    const counts = new Int32Array(10);
    for (const v of raw) counts[v]!++;
    for (const q of [0, 0.1, 0.25, 0.5, 0.66, 0.9, 0.99, 1]) {
      expect(quantileFromCounts(counts, q)).toBeCloseTo(quantileSorted(raw, q), 12);
    }
  });
});

describe('wilsonInterval', () => {
  it('matches a textbook value', () => {
    const { low, high } = wilsonInterval(81, 263);
    expect(low).toBeCloseTo(0.2553, 3);
    expect(high).toBeCloseTo(0.3662, 3);
  });

  it('stays inside [0, 1] and is informative at 0 and n successes', () => {
    const none = wilsonInterval(0, 1000);
    expect(none.low).toBe(0);
    expect(none.high).toBeGreaterThan(0);
    expect(none.high).toBeLessThan(0.01);
    const all = wilsonInterval(1000, 1000);
    expect(all.high).toBe(1);
    expect(all.low).toBeGreaterThan(0.99);
    expect(wilsonInterval(0, 0)).toEqual({ low: 0, high: 1 });
  });

  it('wraps the point estimate', () => {
    const estimate = estimateProportion(30, 200);
    expect(estimate.value).toBe(0.15);
    expect(estimate.interval95.low).toBeLessThan(0.15);
    expect(estimate.interval95.high).toBeGreaterThan(0.15);
  });
});

describe('binning', () => {
  it('counts every value, including the max and out-of-range values', () => {
    const binned = binEqualWidth([-1, 0, 0.5, 1, 1.99, 2, 3], 0, 2, 2);
    expect(binned.bins.map((b) => b.count)).toEqual([2, 3]);
    expect(binned.bins[1]).toMatchObject({ x0: 1, x1: 2 });
    expect(binned.underflow).toBe(1);
    expect(binned.overflow).toBe(1);
    expect(binned.total).toBe(7);
  });

  it('rejects degenerate ranges', () => {
    expect(() => binEqualWidth([1], 1, 1, 3)).toThrow(RangeError);
    expect(() => binEqualWidth([1], 0, 1, 0)).toThrow(RangeError);
  });

  it('turns frequency tables into unit-width bins', () => {
    expect(binsFromCounts([3, 0, 2])).toEqual([
      { x0: 0, x1: 1, count: 3 },
      { x0: 1, x1: 2, count: 0 },
      { x0: 2, x1: 3, count: 2 },
    ]);
  });
});
