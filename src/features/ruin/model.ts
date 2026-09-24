/**
 * Hypothetical risk-of-ruin kernel (abstract units; educational only).
 *
 * Each round a fixed fraction f of the *current* capital is exposed.
 * With probability p the exposed amount grows by `gain`, otherwise it shrinks
 * by `loss`:  C ← C·(1 + f·gain)  or  C ← C·(1 − f·loss).
 * A future is ruined the first time capital falls below RUIN_FRACTION of the
 * initial capital; it then stops playing and keeps that value.
 */
import { assertInRange } from '../../lib/params.ts';
import { createRng } from '../../lib/random.ts';
import { estimateProportion, quantileSorted, type ProportionEstimate } from '../../lib/stats.ts';
import type { RuinParams } from './params.ts';

export const RUIN_FRACTION = 0.05;
/** Full-resolution paths kept for drawing (futures #0 … #n-1). */
export const SAMPLE_PATH_COUNT = 20;
/** Pointwise percentile levels summarised across all futures. */
export const BAND_LEVELS = [0.1, 0.5, 0.9] as const;
/** Upper bound on the number of rounds at which percentiles are evaluated. */
export const MAX_CHECKPOINT_INTERVALS = 100;

export interface RuinInput extends RuinParams {
  seed: string;
}

export interface RuinExact {
  /** E[C_{t+1} / C_t] = 1 + f·(p·gain − (1−p)·loss); the per-round "edge". */
  expectedMultiplier: number;
  /**
   * E[ln(C_{t+1} / C_t)] ignoring absorption. Negative means the typical
   * (median) path shrinks even when the edge is positive. −∞ when a loss can
   * wipe out the whole capital.
   */
  expectedLogGrowth: number;
}

export interface PercentileBand {
  level: (typeof BAND_LEVELS)[number];
  /** Value at each checkpoint round. */
  values: Float64Array;
}

export interface RuinResult {
  input: RuinInput;
  exact: RuinExact;
  ruinLevel: number;
  /** Up to SAMPLE_PATH_COUNT paths, each with rounds + 1 points (round 0 = initial capital). */
  samplePaths: Float64Array[];
  /** Rounds at which the bands are evaluated; starts at 0 and ends at `rounds`. */
  checkpoints: Int32Array;
  /** Pointwise percentiles across futures: not individual trajectories. */
  bands: PercentileBand[];
  ruined: ProportionEstimate;
  medianMaxDrawdown: number;
  medianFinalCapital: number;
}

export function ruinExact({ p, gain, loss, fraction }: Pick<RuinParams, 'p' | 'gain' | 'loss' | 'fraction'>): RuinExact {
  const up = 1 + fraction * gain;
  const down = 1 - fraction * loss;
  const logUp = p > 0 ? p * Math.log(up) : 0;
  const logDown = p < 1 ? (1 - p) * Math.log(down) : 0;
  return {
    expectedMultiplier: p * up + (1 - p) * down,
    expectedLogGrowth: logUp + logDown,
  };
}

export function checkpointRounds(rounds: number): Int32Array {
  const intervals = Math.min(rounds, MAX_CHECKPOINT_INTERVALS);
  const checkpoints = new Int32Array(intervals + 1);
  for (let i = 0; i <= intervals; i++) checkpoints[i] = Math.round((i * rounds) / intervals);
  return checkpoints;
}

/** Largest peak-to-trough decline as a fraction of the running peak. */
export function maxDrawdown(path: ArrayLike<number>): number {
  let peak = -Infinity;
  let worst = 0;
  for (let i = 0; i < path.length; i++) {
    const value = path[i]!;
    if (value > peak) peak = value;
    else if (peak > 0) worst = Math.max(worst, (peak - value) / peak);
  }
  return worst;
}

export function simulateRuin(input: RuinInput): RuinResult {
  const { capital, p, gain, loss, fraction, rounds, futures, seed } = input;
  assertInRange('capital', capital, Number.MIN_VALUE, Number.MAX_VALUE);
  assertInRange('p', p, 0, 1);
  assertInRange('gain', gain, 0, 1000);
  assertInRange('loss', loss, 0, 1);
  assertInRange('fraction', fraction, 0, 1);
  assertInRange('rounds', rounds, 1, 100_000, true);
  assertInRange('futures', futures, 1, 1_000_000, true);

  const rng = createRng(seed);
  const up = 1 + fraction * gain;
  const down = 1 - fraction * loss;
  const ruinLevel = capital * RUIN_FRACTION;
  const checkpoints = checkpointRounds(rounds);
  // Column-major: all futures for checkpoint c are contiguous, ready to sort.
  const atCheckpoint = new Float64Array(checkpoints.length * futures);
  const drawdowns = new Float64Array(futures);
  const samplePaths: Float64Array[] = [];
  let ruinedCount = 0;

  for (let f = 0; f < futures; f++) {
    const path = f < SAMPLE_PATH_COUNT ? new Float64Array(rounds + 1) : null;
    let value = capital;
    let peak = capital;
    let worstDrawdown = 0;
    let ruined = false;
    let nextCheckpoint = 1;
    atCheckpoint[f] = capital;
    if (path) path[0] = capital;

    for (let r = 1; r <= rounds; r++) {
      if (!ruined) {
        value *= rng() < p ? up : down;
        if (value > peak) {
          peak = value;
        } else {
          const drawdown = (peak - value) / peak;
          if (drawdown > worstDrawdown) worstDrawdown = drawdown;
        }
        if (value < ruinLevel) ruined = true;
      }
      if (path) path[r] = value;
      if (checkpoints[nextCheckpoint] === r) {
        atCheckpoint[nextCheckpoint * futures + f] = value;
        nextCheckpoint++;
      }
    }

    if (ruined) ruinedCount++;
    drawdowns[f] = worstDrawdown;
    if (path) samplePaths.push(path);
  }

  const bands: PercentileBand[] = BAND_LEVELS.map((level) => ({ level, values: new Float64Array(checkpoints.length) }));
  for (let c = 0; c < checkpoints.length; c++) {
    const column = atCheckpoint.subarray(c * futures, (c + 1) * futures).sort();
    for (const band of bands) band.values[c] = quantileSorted(column, band.level);
  }
  const finalColumn = atCheckpoint.subarray((checkpoints.length - 1) * futures);

  return {
    input,
    exact: ruinExact(input),
    ruinLevel,
    samplePaths,
    checkpoints,
    bands,
    ruined: estimateProportion(ruinedCount, futures),
    medianMaxDrawdown: quantileSorted(drawdowns.sort(), 0.5),
    medianFinalCapital: quantileSorted(finalColumn, 0.5),
  };
}
