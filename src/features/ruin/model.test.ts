import { describe, expect, it } from 'vitest';
import { quantileSorted, sortedCopy } from '../../lib/stats.ts';
import {
  BAND_LEVELS,
  checkpointRounds,
  maxDrawdown,
  RUIN_FRACTION,
  ruinExact,
  SAMPLE_PATH_COUNT,
  simulateRuin,
  type RuinInput,
} from './model.ts';

const base: RuinInput = {
  capital: 1000,
  p: 0.55,
  gain: 1,
  loss: 1,
  fraction: 0.25,
  rounds: 200,
  futures: 2000,
  seed: 'rachas',
};

describe('ruinExact', () => {
  it('computes the per-round edge and expected log growth', () => {
    const exact = ruinExact(base);
    expect(exact.expectedMultiplier).toBeCloseTo(1.025, 14);
    expect(exact.expectedLogGrowth).toBeCloseTo(0.55 * Math.log(1.25) + 0.45 * Math.log(0.75), 14);
    // Positive edge, negative typical growth: the lesson of the lab.
    expect(exact.expectedMultiplier).toBeGreaterThan(1);
    expect(exact.expectedLogGrowth).toBeLessThan(0);
  });

  it('is maximised in log growth near the Kelly fraction 2p − 1 for even payoffs', () => {
    const growth = (fraction: number) => ruinExact({ ...base, fraction }).expectedLogGrowth;
    expect(growth(0.1)).toBeGreaterThan(growth(0.05));
    expect(growth(0.1)).toBeGreaterThan(growth(0.15));
  });

  it('handles total loss and certain outcomes', () => {
    expect(ruinExact({ ...base, fraction: 1, loss: 1 }).expectedLogGrowth).toBe(-Infinity);
    expect(ruinExact({ ...base, p: 1, fraction: 1, loss: 1 }).expectedLogGrowth).toBeCloseTo(Math.log(2), 14);
    expect(ruinExact({ ...base, p: 0 }).expectedMultiplier).toBeCloseTo(0.75, 14);
  });
});

describe('helpers', () => {
  it('checkpoints start at 0, end at rounds, and are strictly increasing', () => {
    expect(Array.from(checkpointRounds(10))).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    for (const rounds of [10, 100, 250, 1000]) {
      const checkpoints = checkpointRounds(rounds);
      expect(checkpoints[0]).toBe(0);
      expect(checkpoints[checkpoints.length - 1]).toBe(rounds);
      expect(checkpoints.length).toBeLessThanOrEqual(101);
      for (let i = 1; i < checkpoints.length; i++) expect(checkpoints[i]).toBeGreaterThan(checkpoints[i - 1]!);
    }
  });

  it('measures drawdown against the running peak', () => {
    expect(maxDrawdown([100, 120, 60, 130, 117])).toBeCloseTo(0.5, 14);
    expect(maxDrawdown([1, 2, 3])).toBe(0);
  });
});

describe('simulateRuin', () => {
  it('is reproducible and locked to golden values', () => {
    const a = simulateRuin(base);
    expect(simulateRuin(base)).toEqual(a);
    expect(a.ruined.successes).toBe(1046);
    expect(a.medianFinalCapital).toBeCloseTo(49.70413031834276, 9);
    expect(a.medianMaxDrawdown).toBeCloseTo(0.9724630627371615, 12);
  });

  it('keeps paths and bands structurally consistent', () => {
    const result = simulateRuin(base);
    expect(result.samplePaths).toHaveLength(SAMPLE_PATH_COUNT);
    for (const path of result.samplePaths) {
      expect(path).toHaveLength(base.rounds + 1);
      expect(path[0]).toBe(base.capital);
      expect(path.every((v) => v >= 0)).toBe(true);
    }
    expect(result.ruinLevel).toBe(base.capital * RUIN_FRACTION);
    expect(result.bands.map((b) => b.level)).toEqual([...BAND_LEVELS]);
    for (let c = 0; c < result.checkpoints.length; c++) {
      const [p10, p50, p90] = result.bands.map((b) => b.values[c]!);
      expect(p10).toBeLessThanOrEqual(p50!);
      expect(p50).toBeLessThanOrEqual(p90!);
    }
    expect(result.bands[1]!.values[0]).toBe(base.capital);
    expect(result.bands[1]!.values.at(-1)).toBe(result.medianFinalCapital);
  });

  it('derives medians from the same paths it draws when every future is a sample path', () => {
    const input = { ...base, futures: SAMPLE_PATH_COUNT };
    const result = simulateRuin(input);
    const finals = sortedCopy(result.samplePaths.map((path) => path[base.rounds]!));
    expect(result.medianFinalCapital).toBeCloseTo(quantileSorted(finals, 0.5), 9);
    const drawdowns = sortedCopy(result.samplePaths.map((path) => maxDrawdown(path)));
    expect(result.medianMaxDrawdown).toBeCloseTo(quantileSorted(drawdowns, 0.5), 12);
    const ruined = result.samplePaths.filter((path) => path.some((v) => v < result.ruinLevel)).length;
    expect(result.ruined.successes).toBe(ruined);
  });

  it('absorbs ruined futures: once below the ruin level, capital stops changing', () => {
    const result = simulateRuin({ ...base, fraction: 1, p: 0.5 });
    for (const path of result.samplePaths) {
      const hit = path.findIndex((v) => v < result.ruinLevel);
      if (hit === -1) continue;
      expect(path.slice(hit).every((v) => v === path[hit])).toBe(true);
    }
    expect(result.ruined.value).toBeGreaterThan(0.9);
  });

  it('never ruins with p = 1 and always ruins with p = 0 and full exposure', () => {
    expect(simulateRuin({ ...base, p: 1, futures: 100 }).ruined.successes).toBe(0);
    expect(simulateRuin({ ...base, p: 0, fraction: 1, futures: 100 }).ruined.successes).toBe(100);
  });

  it('rejects impossible input', () => {
    expect(() => simulateRuin({ ...base, loss: 1.5 })).toThrow(RangeError);
    expect(() => simulateRuin({ ...base, capital: 0 })).toThrow(RangeError);
    expect(() => simulateRuin({ ...base, rounds: 0 })).toThrow(RangeError);
  });
});
