/**
 * Compound-loss kernel: a compound Poisson–lognormal model.
 *
 *   N ~ Poisson(frequency)                    events in one period
 *   X_i ~ Lognormal(μ = ln severity, σ = dispersion), independent of N
 *   S = X_1 + … + X_N                         total loss (S = 0 when N = 0)
 *
 * `severity` is therefore the *median* event loss; the mean event loss is
 * severity·exp(σ²/2), which is why averages overstate the typical event.
 */
import { lognormal, lognormalMean, lognormalSecondMoment, poisson } from '../../lib/distributions.ts';
import { assertInRange } from '../../lib/params.ts';
import { createRng } from '../../lib/random.ts';
import { estimateProportion, mean, quantileSorted, type ProportionEstimate } from '../../lib/stats.ts';
import type { CompoundLossParams } from './params.ts';

export interface CompoundLossInput extends CompoundLossParams {
  seed: string;
}

export interface CompoundLossExact {
  /** E[S] = λ·E[X]. */
  mean: number;
  /** √Var[S] = √(λ·E[X²]). */
  standardDeviation: number;
  /** P(S = 0) = e^(−λ). */
  probabilityOfNoLoss: number;
  severityMean: number;
  severityMedian: number;
}

export interface CompoundLossResult {
  input: CompoundLossInput;
  exact: CompoundLossExact;
  /** Total loss of every simulated period, ascending. */
  sortedTotals: Float64Array;
  mean: number;
  median: number;
  p90: number;
  p99: number;
  /** Periods whose total loss is strictly greater than `threshold`. */
  exceedance: ProportionEstimate;
}

export function compoundLossExact({
  frequency,
  severity,
  dispersion,
}: Pick<CompoundLossParams, 'frequency' | 'severity' | 'dispersion'>): CompoundLossExact {
  const mu = Math.log(severity);
  const severityMean = lognormalMean(mu, dispersion);
  return {
    mean: frequency * severityMean,
    standardDeviation: Math.sqrt(frequency * lognormalSecondMoment(mu, dispersion)),
    probabilityOfNoLoss: Math.exp(-frequency),
    severityMean,
    severityMedian: severity,
  };
}

export function simulateCompoundLoss(input: CompoundLossInput): CompoundLossResult {
  const { frequency, severity, dispersion, threshold, futures, seed } = input;
  assertInRange('frequency', frequency, 0, 1000);
  assertInRange('severity', severity, Number.MIN_VALUE, Number.MAX_VALUE);
  assertInRange('dispersion', dispersion, 0, 10);
  assertInRange('threshold', threshold, 0, Number.MAX_VALUE);
  assertInRange('futures', futures, 1, 1_000_000, true);

  const rng = createRng(seed);
  const mu = Math.log(severity);
  const totals = new Float64Array(futures);
  let exceeded = 0;
  for (let f = 0; f < futures; f++) {
    const events = poisson(rng, frequency);
    let total = 0;
    for (let e = 0; e < events; e++) total += lognormal(rng, mu, dispersion);
    totals[f] = total;
    if (total > threshold) exceeded++;
  }
  totals.sort();

  return {
    input,
    exact: compoundLossExact(input),
    sortedTotals: totals,
    mean: mean(totals),
    median: quantileSorted(totals, 0.5),
    p90: quantileSorted(totals, 0.9),
    p99: quantileSorted(totals, 0.99),
    exceedance: estimateProportion(exceeded, futures),
  };
}
