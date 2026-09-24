import { describe, expect, it } from 'vitest';
import { normalizeParams } from '../../lib/params.ts';
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
import { MAX_REACHABLE_CAPITAL, maxSafeRounds, roundsLimit, ruinSchema } from './params.ts';

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

describe('numerical safety', () => {
  const extreme = { capital: 1000, p: 1, gain: 5, loss: 1, fraction: 1, rounds: 1000, futures: 100, seed: 'abc' };
  const highGrowth = { capital: 1000, p: 0.55, gain: 5, loss: 0.5, fraction: 1, rounds: 1000, futures: 2000, seed: 'abc' };

  function expectFiniteResult(result: ReturnType<typeof simulateRuin>) {
    for (const path of result.samplePaths) expect(path.every(Number.isFinite)).toBe(true);
    for (const band of result.bands) expect(band.values.every(Number.isFinite)).toBe(true);
    expect(Number.isFinite(result.medianFinalCapital)).toBe(true);
    expect(Number.isFinite(result.medianMaxDrawdown)).toBe(true);
    expect(Number.isFinite(result.exact.expectedMultiplier)).toBe(true);
  }

  it('derives the round limit from capital · (1 + fraction · gain)^rounds ≤ MAX_REACHABLE_CAPITAL', () => {
    const limit = maxSafeRounds(extreme);
    expect(limit).toBe(Math.floor(Math.log(MAX_REACHABLE_CAPITAL / 1000) / Math.log(6)));
    expect(1000 * 6 ** limit).toBeLessThanOrEqual(MAX_REACHABLE_CAPITAL);
    expect(1000 * 6 ** (limit + 1)).toBeGreaterThan(MAX_REACHABLE_CAPITAL);
    // Nothing can grow when no round is favourable.
    expect(maxSafeRounds({ ...extreme, p: 0 })).toBe(Infinity);
  });

  it('keeps the whole supported parameter space within the limit after the schema constraint', () => {
    const { specs } = ruinSchema;
    // Worst case of the schema: largest capital and largest growth factor.
    const worst = normalizeParams(ruinSchema, { capital: specs.capital.max, p: 1, gain: specs.gain.max, fraction: 1, rounds: specs.rounds.max });
    expect(worst.rounds).toBe(roundsLimit(worst));
    expect(worst.rounds).toBeGreaterThanOrEqual(specs.rounds.min);
    expect(worst.rounds % specs.rounds.step).toBe(0);
    expect(worst.capital * (1 + worst.fraction * worst.gain) ** worst.rounds).toBeLessThanOrEqual(MAX_REACHABLE_CAPITAL);
    // Default-like scenarios are untouched.
    expect(normalizeParams(ruinSchema, { ...base, rounds: 1000 }).rounds).toBe(1000);
    expect(normalizeParams(ruinSchema, { ...extreme, p: 0 }).rounds).toBe(1000);
  });

  it.each([
    ['certain growth with full exposure', extreme],
    ['seeded high growth', highGrowth],
  ])('constrains %s to finite, meaningful output', (_, raw) => {
    const params = normalizeParams(ruinSchema, raw);
    expect(params.rounds).toBe(380);
    const result = simulateRuin({ ...params, seed: raw.seed });
    expectFiniteResult(result);
    expect(result.medianFinalCapital).toBeGreaterThan(raw.capital);
  });

  it('computes the certain-growth case exactly within the limit', () => {
    const result = simulateRuin({ ...normalizeParams(ruinSchema, extreme), seed: 'abc' });
    expect(result.medianFinalCapital / (1000 * 6 ** 380)).toBeCloseTo(1, 10);
    expect(result.medianMaxDrawdown).toBe(0);
    expect(result.ruined.successes).toBe(0);
  });

  it('rejects inputs whose paths could overflow instead of returning Infinity or NaN', () => {
    expect(() => simulateRuin(extreme)).toThrow(RangeError);
    expect(() => simulateRuin(highGrowth)).toThrow(RangeError);
    expect(() => simulateRuin({ ...base, gain: 1000, fraction: 1, rounds: 200 })).toThrow(RangeError);
    expect(() => simulateRuin({ ...base, capital: Number.MAX_VALUE })).toThrow(RangeError);
  });
});
