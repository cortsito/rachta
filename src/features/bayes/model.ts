/**
 * Bayes lab kernel: a binary condition and an imperfect binary test.
 * The positive predictive value is computed exactly; the simulated
 * population only illustrates it and is always labelled as an estimate.
 */
import { assertInRange } from '../../lib/params.ts';
import { createRng } from '../../lib/random.ts';
import { estimateProportion, type ProportionEstimate } from '../../lib/stats.ts';
import type { BayesParams } from './params.ts';

export type BayesRates = Pick<BayesParams, 'prevalence' | 'sensitivity' | 'specificity'>;

export interface BayesInput extends BayesParams {
  seed: string;
}

/** A 2×2 table. Probabilities (summing to 1) or counts, depending on context. */
export interface Confusion {
  /** Condition present, test positive. */
  truePositive: number;
  /** Condition absent, test positive. */
  falsePositive: number;
  /** Condition present, test negative. */
  falseNegative: number;
  /** Condition absent, test negative. */
  trueNegative: number;
}

export const CONFUSION_CELLS = ['truePositive', 'falsePositive', 'falseNegative', 'trueNegative'] as const;

export interface BayesExact {
  joint: Confusion;
  /** P(test positive). */
  positiveRate: number;
  /** P(condition | positive); null when no one can test positive. */
  ppv: number | null;
  /** P(no condition | negative); null when no one can test negative. */
  npv: number | null;
}

export interface BayesResult {
  input: BayesInput;
  exact: BayesExact;
  /** Natural frequencies: exact expectations rounded to whole people summing to `population`. */
  expected: Confusion;
  /** One seeded simulated population. */
  simulated: Confusion;
  /** TP / (TP + FP) in the simulated population; null when nobody tested positive. */
  simulatedPpv: ProportionEstimate | null;
}

function assertRates({ prevalence, sensitivity, specificity }: BayesRates): void {
  assertInRange('prevalence', prevalence, 0, 1);
  assertInRange('sensitivity', sensitivity, 0, 1);
  assertInRange('specificity', specificity, 0, 1);
}

export function bayesExact(rates: BayesRates): BayesExact {
  assertRates(rates);
  const { prevalence, sensitivity, specificity } = rates;
  const joint: Confusion = {
    truePositive: prevalence * sensitivity,
    falsePositive: (1 - prevalence) * (1 - specificity),
    falseNegative: prevalence * (1 - sensitivity),
    trueNegative: (1 - prevalence) * specificity,
  };
  const positiveRate = joint.truePositive + joint.falsePositive;
  const negativeRate = joint.falseNegative + joint.trueNegative;
  return {
    joint,
    positiveRate,
    ppv: positiveRate > 0 ? joint.truePositive / positiveRate : null,
    npv: negativeRate > 0 ? joint.trueNegative / negativeRate : null,
  };
}

/**
 * Rounds the exact joint distribution to whole people with the largest
 * remainder method, so the four cells always add up to `population`.
 * Ties are broken in CONFUSION_CELLS order for determinism.
 */
export function expectedCounts(rates: BayesRates, population: number): Confusion {
  assertInRange('population', population, 0, Number.MAX_SAFE_INTEGER, true);
  const { joint } = bayesExact(rates);
  const quotas = CONFUSION_CELLS.map((cell) => joint[cell] * population);
  const counts = quotas.map(Math.floor);
  let remaining = population - counts.reduce((sum, count) => sum + count, 0);
  const byRemainder = CONFUSION_CELLS.map((_, i) => i).sort(
    (a, b) => quotas[b]! - counts[b]! - (quotas[a]! - counts[a]!) || a - b,
  );
  for (const index of byRemainder) {
    if (remaining <= 0) break;
    counts[index]!++;
    remaining--;
  }
  return {
    truePositive: counts[0]!,
    falsePositive: counts[1]!,
    falseNegative: counts[2]!,
    trueNegative: counts[3]!,
  };
}

/** Draws each person's condition, then their test result given the condition. */
export function simulatePopulation(input: BayesInput): Confusion {
  assertRates(input);
  assertInRange('population', input.population, 1, 10_000_000, true);
  const { prevalence, sensitivity, specificity, population } = input;
  const rng = createRng(input.seed);
  const counts: Confusion = { truePositive: 0, falsePositive: 0, falseNegative: 0, trueNegative: 0 };
  for (let i = 0; i < population; i++) {
    const hasCondition = rng() < prevalence;
    const testDraw = rng();
    if (hasCondition) {
      if (testDraw < sensitivity) counts.truePositive++;
      else counts.falseNegative++;
    } else if (testDraw < specificity) {
      counts.trueNegative++;
    } else {
      counts.falsePositive++;
    }
  }
  return counts;
}

export function simulateBayes(input: BayesInput): BayesResult {
  const simulated = simulatePopulation(input);
  const positives = simulated.truePositive + simulated.falsePositive;
  return {
    input,
    exact: bayesExact(input),
    expected: expectedCounts(input, input.population),
    simulated,
    simulatedPpv: positives > 0 ? estimateProportion(simulated.truePositive, positives) : null,
  };
}
