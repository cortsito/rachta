import { describe, expect, it } from 'vitest';
import { exactLosingStreakProbability, longestLosingStreak, simulateStreaks, type StreaksInput } from './model.ts';

const base: StreaksInput = { p: 0.55, attempts: 100, streak: 8, futures: 10000, seed: 'rachas' };

/** Brute force over all 2^n outcome sequences. */
function bruteForce(p: number, n: number, k: number): number {
  let total = 0;
  for (let mask = 0; mask < 2 ** n; mask++) {
    const outcomes = Array.from({ length: n }, (_, i) => (mask >> i) & 1);
    if (longestLosingStreak(outcomes).length < k) continue;
    const successes = outcomes.reduce((a, b) => a + b, 0);
    total += p ** successes * (1 - p) ** (n - successes);
  }
  return total;
}

describe('longestLosingStreak', () => {
  it('finds the first longest run of failures', () => {
    expect(longestLosingStreak([1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0])).toEqual({ length: 3, start: 4 });
    expect(longestLosingStreak([1, 1, 1])).toEqual({ length: 0, start: -1 });
    expect(longestLosingStreak([0, 0])).toEqual({ length: 2, start: 0 });
    expect(longestLosingStreak([])).toEqual({ length: 0, start: -1 });
  });
});

describe('exactLosingStreakProbability', () => {
  it.each([
    [0.5, 10, 3],
    [0.55, 12, 4],
    [0.2, 9, 1],
    [0.9, 11, 2],
    [0.3, 8, 8],
  ])('matches brute force for p=%s, n=%s, k=%s', (p, n, k) => {
    expect(exactLosingStreakProbability(p, n, k)).toBeCloseTo(bruteForce(p, n, k), 12);
  });

  it('handles closed-form and degenerate cases', () => {
    // At least one loss in n attempts.
    expect(exactLosingStreakProbability(0.7, 20, 1)).toBeCloseTo(1 - 0.7 ** 20, 12);
    // All n attempts lost.
    expect(exactLosingStreakProbability(0.4, 6, 6)).toBeCloseTo(0.6 ** 6, 14);
    expect(exactLosingStreakProbability(0.5, 5, 6)).toBe(0);
    expect(exactLosingStreakProbability(1, 50, 1)).toBe(0);
    expect(exactLosingStreakProbability(0, 50, 50)).toBe(1);
  });

  it('is monotone in the threshold and in the number of attempts', () => {
    const byK = [1, 2, 4, 8, 16].map((k) => exactLosingStreakProbability(0.55, 100, k));
    for (let i = 1; i < byK.length; i++) expect(byK[i]).toBeLessThan(byK[i - 1]!);
    expect(exactLosingStreakProbability(0.55, 200, 8)).toBeGreaterThan(exactLosingStreakProbability(0.55, 100, 8));
  });
});

describe('simulateStreaks', () => {
  it('is reproducible for a seed and locked to golden values', () => {
    const a = simulateStreaks(base);
    const b = simulateStreaks(base);
    expect(Array.from(a.sampleRun)).toEqual(Array.from(b.sampleRun));
    expect(Array.from(a.longestCounts)).toEqual(Array.from(b.longestCounts));
    expect(a.reached.successes).toBe(850);
    expect(a.medianLongest).toBe(5);
    expect(a.sampleRunLongest).toEqual({ length: 6, start: 72 });
    expect(simulateStreaks({ ...base, seed: 'other' }).reached.successes).not.toBe(850);
  });

  it('keeps internal accounting consistent', () => {
    const result = simulateStreaks(base);
    expect(result.sampleRun).toHaveLength(base.attempts);
    expect(result.longestCounts).toHaveLength(base.attempts + 1);
    expect(result.longestCounts.reduce((a, b) => a + b, 0)).toBe(base.futures);
    const tail = result.longestCounts.slice(base.streak).reduce((a, b) => a + b, 0);
    expect(tail).toBe(result.reached.successes);
    expect(result.sampleRunSuccesses).toBe(result.sampleRun.reduce((a, b) => a + b, 0));
    expect(result.sampleRunLongest).toEqual(longestLosingStreak(result.sampleRun));
    expect(result.longestCounts[result.maxObservedLongest]).toBeGreaterThan(0);
    expect(result.longestCounts.slice(result.maxObservedLongest + 1).every((c) => c === 0)).toBe(true);
  });

  it('agrees with the exact probability within its 95% interval (widened)', () => {
    const result = simulateStreaks({ ...base, futures: 20000 });
    const { low, high } = result.reached.interval95;
    const slack = (high - low) / 2;
    expect(result.exactReachProbability).toBeGreaterThan(low - slack);
    expect(result.exactReachProbability).toBeLessThan(high + slack);
    expect(result.exactReachProbability).toBeCloseTo(0.0837128421, 8);
  });

  it('handles p = 0 and p = 1', () => {
    const allWins = simulateStreaks({ ...base, p: 1, futures: 100 });
    expect(allWins.reached.successes).toBe(0);
    expect(allWins.medianLongest).toBe(0);
    expect(allWins.sampleRunLongest).toEqual({ length: 0, start: -1 });
    const allLosses = simulateStreaks({ ...base, p: 0, futures: 100 });
    expect(allLosses.reached.successes).toBe(100);
    expect(allLosses.medianLongest).toBe(base.attempts);
    expect(allLosses.exactReachProbability).toBe(1);
  });

  it('rejects impossible input', () => {
    expect(() => simulateStreaks({ ...base, p: 1.2 })).toThrow(RangeError);
    expect(() => simulateStreaks({ ...base, streak: 101 })).toThrow(RangeError);
    expect(() => simulateStreaks({ ...base, futures: 0 })).toThrow(RangeError);
    expect(() => simulateStreaks({ ...base, attempts: 10.5 })).toThrow(RangeError);
  });
});
