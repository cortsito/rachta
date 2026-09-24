import { describe, expect, it } from 'vitest';
import { createRng, generateSeed, isValidSeed } from './random.ts';

describe('createRng', () => {
  it('is locked to a golden stream so existing share URLs keep reproducing', () => {
    const rng = createRng('rachas');
    expect([rng(), rng(), rng()]).toEqual([0.3469674615189433, 0.48444084264338017, 0.012767802458256483]);
  });

  it('reproduces the same stream for the same seed and differs across seeds', () => {
    const a = createRng('abc123');
    const b = createRng('abc123');
    const c = createRng('abc124');
    const seqA = Array.from({ length: 50 }, a);
    expect(Array.from({ length: 50 }, b)).toEqual(seqA);
    expect(Array.from({ length: 50 }, c)).not.toEqual(seqA);
  });

  it('returns values in [0, 1) with a plausible uniform mean and variance', () => {
    const rng = createRng('uniformity');
    const n = 200_000;
    let sum = 0;
    let sumSq = 0;
    const deciles = new Array<number>(10).fill(0);
    for (let i = 0; i < n; i++) {
      const u = rng();
      expect(u >= 0 && u < 1).toBe(true);
      sum += u;
      sumSq += u * u;
      deciles[Math.floor(u * 10)]!++;
    }
    const mean = sum / n;
    expect(mean).toBeCloseTo(0.5, 2);
    expect(sumSq / n - mean * mean).toBeCloseTo(1 / 12, 2);
    // Chi-square with 9 degrees of freedom; 27.9 is the 0.999 quantile.
    const expected = n / 10;
    const chi2 = deciles.reduce((acc, count) => acc + (count - expected) ** 2 / expected, 0);
    expect(chi2).toBeLessThan(27.9);
  });

  it('rejects invalid seeds', () => {
    expect(() => createRng('')).toThrow(RangeError);
    expect(() => createRng('with space')).toThrow(RangeError);
    expect(() => createRng('x'.repeat(33))).toThrow(RangeError);
  });
});

describe('seeds', () => {
  it('validates the URL-safe seed alphabet and length', () => {
    expect(isValidSeed('a')).toBe(true);
    expect(isValidSeed('Seed_01-x')).toBe(true);
    expect(isValidSeed('x'.repeat(32))).toBe(true);
    expect(isValidSeed('x'.repeat(33))).toBe(false);
    expect(isValidSeed('ñ')).toBe(false);
    expect(isValidSeed('a&b')).toBe(false);
    expect(isValidSeed(null)).toBe(false);
  });

  it('generates valid, varied seeds', () => {
    const seeds = new Set(Array.from({ length: 100 }, generateSeed));
    expect(seeds.size).toBe(100);
    for (const seed of seeds) expect(isValidSeed(seed)).toBe(true);
  });
});
