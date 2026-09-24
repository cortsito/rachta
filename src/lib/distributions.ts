/**
 * Samplers and exact densities used by the simulation kernels.
 * Every sampler takes the generator explicitly so kernels stay pure.
 */
import type { Rng } from './random.ts';

export function bernoulli(rng: Rng, p: number): boolean {
  return rng() < p;
}

/** Standard normal via Box–Muller (one draw per pair of uniforms; no hidden state). */
export function standardNormal(rng: Rng): number {
  const u1 = 1 - rng(); // (0, 1], so the logarithm is finite
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Lognormal with parameters of the underlying normal: ln X ~ N(mu, sigma²). */
export function lognormal(rng: Rng, mu: number, sigma: number): number {
  return Math.exp(mu + sigma * standardNormal(rng));
}

export function lognormalMean(mu: number, sigma: number): number {
  return Math.exp(mu + (sigma * sigma) / 2);
}

export function lognormalSecondMoment(mu: number, sigma: number): number {
  return Math.exp(2 * mu + 2 * sigma * sigma);
}

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

/** ln Γ(x) for x > 0 (Lanczos, g = 7; relative error around 1e-15). */
export function logGamma(x: number): number {
  if (!(x > 0)) throw new RangeError('logGamma requires x > 0');
  if (x < 0.5) {
    // Reflection formula keeps precision near zero.
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  const z = x - 1;
  let sum = LANCZOS[0]!;
  for (let i = 1; i < LANCZOS.length; i++) sum += LANCZOS[i]! / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(sum);
}

export function poissonPmf(k: number, lambda: number): number {
  if (!Number.isInteger(k) || k < 0) return 0;
  if (lambda === 0) return k === 0 ? 1 : 0;
  return Math.exp(k * Math.log(lambda) - lambda - logGamma(k + 1));
}

const PTRS_THRESHOLD = 10;

/**
 * Poisson(lambda) sample.
 * lambda < 10: Knuth's multiplication method (exact, O(lambda)).
 * lambda ≥ 10: Hörmann's PTRS transformed rejection (exact, O(1) expected).
 */
export function poisson(rng: Rng, lambda: number): number {
  if (!(lambda >= 0) || !Number.isFinite(lambda)) {
    throw new RangeError('poisson requires a finite lambda ≥ 0');
  }
  if (lambda === 0) return 0;
  if (lambda < PTRS_THRESHOLD) {
    const limit = Math.exp(-lambda);
    let k = 0;
    let product = rng();
    while (product > limit) {
      k++;
      product *= rng();
    }
    return k;
  }
  const sqrtLambda = Math.sqrt(lambda);
  const logLambda = Math.log(lambda);
  const b = 0.931 + 2.53 * sqrtLambda;
  const a = -0.059 + 0.02483 * b;
  const invAlpha = 1.1239 + 1.1328 / (b - 3.4);
  const vr = 0.9277 - 3.6224 / (b - 2);
  for (;;) {
    const u = rng() - 0.5;
    const v = rng();
    const us = 0.5 - Math.abs(u);
    const k = Math.floor(((2 * a) / us + b) * u + lambda + 0.43);
    if (us >= 0.07 && v <= vr) return k;
    if (k < 0 || (us < 0.013 && v > us)) continue;
    const lhs = Math.log(v) + Math.log(invAlpha) - Math.log(a / (us * us) + b);
    if (lhs <= -lambda + k * logLambda - logGamma(k + 1)) return k;
  }
}
