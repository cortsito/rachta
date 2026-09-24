import { describe, expect, it } from 'vitest';
import {
  bernoulli,
  logGamma,
  lognormal,
  lognormalMean,
  poisson,
  poissonPmf,
  standardNormal,
} from './distributions.ts';
import { createRng } from './random.ts';
import { mean, median } from './stats.ts';

function sample(n: number, draw: () => number): Float64Array {
  return Float64Array.from({ length: n }, draw);
}

function variance(values: Float64Array): number {
  const m = mean(values);
  return mean(values.map((v) => (v - m) ** 2));
}

describe('bernoulli', () => {
  it('handles the degenerate probabilities exactly', () => {
    const rng = createRng('bern');
    for (let i = 0; i < 1000; i++) {
      expect(bernoulli(rng, 0)).toBe(false);
      expect(bernoulli(rng, 1)).toBe(true);
    }
  });
});

describe('logGamma', () => {
  it('matches log factorials and Γ(1/2) = √π', () => {
    expect(logGamma(1)).toBeCloseTo(0, 12);
    expect(logGamma(2)).toBeCloseTo(0, 12);
    expect(logGamma(6)).toBeCloseTo(Math.log(120), 10);
    expect(logGamma(101)).toBeCloseTo(363.73937555556347, 8);
    expect(logGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 12);
    expect(logGamma(0.1)).toBeCloseTo(2.252712651734206, 10);
  });

  it('rejects non-positive arguments', () => {
    expect(() => logGamma(0)).toThrow(RangeError);
  });
});

describe('poissonPmf', () => {
  it('sums to one and matches known values', () => {
    let total = 0;
    for (let k = 0; k < 200; k++) total += poissonPmf(k, 30);
    expect(total).toBeCloseTo(1, 10);
    expect(poissonPmf(0, 2)).toBeCloseTo(Math.exp(-2), 14);
    expect(poissonPmf(3, 2)).toBeCloseTo((8 * Math.exp(-2)) / 6, 14);
    expect(poissonPmf(0, 0)).toBe(1);
    expect(poissonPmf(1, 0)).toBe(0);
    expect(poissonPmf(-1, 2)).toBe(0);
  });
});

describe('standardNormal and lognormal', () => {
  it('have the expected moments', () => {
    const rng = createRng('normal');
    const z = sample(200_000, () => standardNormal(rng));
    expect(mean(z)).toBeCloseTo(0, 2);
    expect(variance(z)).toBeCloseTo(1, 1);
    expect(z.every(Number.isFinite)).toBe(true);
  });

  it('parameterises the lognormal median as exp(mu) and mean as exp(mu + σ²/2)', () => {
    const rng = createRng('lognormal');
    const mu = Math.log(1000);
    const sigma = 0.8;
    const x = sample(200_000, () => lognormal(rng, mu, sigma));
    expect(median(x) / 1000).toBeCloseTo(1, 1);
    expect(mean(x) / lognormalMean(mu, sigma)).toBeCloseTo(1, 1);
    expect(x.every((v) => v > 0)).toBe(true);
  });
});

describe('poisson', () => {
  // Both branches: multiplication (λ < 10) and PTRS (λ ≥ 10).
  it.each([0.3, 2, 9.9, 10, 25, 50])('matches mean, variance and pmf for λ = %s', (lambda) => {
    const rng = createRng(`poisson-${String(lambda).replace('.', '_')}`);
    const n = 100_000;
    const draws = sample(n, () => poisson(rng, lambda));
    expect(draws.every((k) => Number.isInteger(k) && k >= 0)).toBe(true);
    const standardError = Math.sqrt(lambda / n);
    expect(Math.abs(mean(draws) - lambda)).toBeLessThan(5 * standardError);
    expect(variance(draws) / lambda).toBeCloseTo(1, 1);

    // Chi-square goodness of fit over cells with expected count ≥ 20.
    const counts = new Map<number, number>();
    for (const k of draws) counts.set(k, (counts.get(k) ?? 0) + 1);
    let chi2 = 0;
    let cells = 0;
    for (let k = 0; k < lambda * 4 + 20; k++) {
      const expected = n * poissonPmf(k, lambda);
      if (expected < 20) continue;
      chi2 += ((counts.get(k) ?? 0) - expected) ** 2 / expected;
      cells++;
    }
    // Generous bound: mean of chi2 is ≈ cells; 3·cells + 20 is far in the tail.
    expect(chi2).toBeLessThan(3 * cells + 20);
  });

  it('returns 0 for λ = 0 and rejects invalid λ', () => {
    const rng = createRng('p0');
    expect(poisson(rng, 0)).toBe(0);
    expect(() => poisson(rng, -1)).toThrow(RangeError);
    expect(() => poisson(rng, Number.NaN)).toThrow(RangeError);
    expect(() => poisson(rng, Infinity)).toThrow(RangeError);
  });
});
