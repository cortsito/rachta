/**
 * Streaks lab kernel: independent attempts with success probability p.
 * Pure — no React, DOM, or ambient randomness.
 */
import { assertInRange } from '../../lib/params.ts';
import { createRng, type Rng } from '../../lib/random.ts';
import { estimateProportion, quantileFromCounts, type ProportionEstimate } from '../../lib/stats.ts';
import type { StreaksParams } from './params.ts';

export interface StreaksInput extends StreaksParams {
  seed: string;
}

export interface LosingStreak {
  length: number;
  /** 0-based index of the first attempt of the first longest streak; -1 when length is 0. */
  start: number;
}

export interface StreaksResult {
  input: StreaksInput;
  /** Future #0, shown to the user: 1 = success, 0 = failure. */
  sampleRun: Uint8Array;
  sampleRunSuccesses: number;
  sampleRunLongest: LosingStreak;
  /** `longestCounts[k]` = futures whose longest losing streak was exactly k (k = 0..attempts). */
  longestCounts: Int32Array;
  maxObservedLongest: number;
  /** Futures whose longest losing streak is ≥ `streak`. */
  reached: ProportionEstimate;
  /** Exact P(longest losing streak ≥ streak) for the same p and attempts. */
  exactReachProbability: number;
  medianLongest: number;
}

export function longestLosingStreak(outcomes: ArrayLike<number>): LosingStreak {
  let best: LosingStreak = { length: 0, start: -1 };
  let current = 0;
  for (let i = 0; i < outcomes.length; i++) {
    if (outcomes[i]) {
      current = 0;
      continue;
    }
    current++;
    if (current > best.length) best = { length: current, start: i - current + 1 };
  }
  return best;
}

/**
 * Exact probability that `attempts` independent trials contain at least
 * `streak` consecutive failures. Markov chain on the current failure run
 * (0..streak-1) with an absorbing "reached" state; O(attempts × streak).
 */
export function exactLosingStreakProbability(p: number, attempts: number, streak: number): number {
  assertInRange('p', p, 0, 1);
  assertInRange('attempts', attempts, 0, Number.MAX_SAFE_INTEGER, true);
  assertInRange('streak', streak, 1, Number.MAX_SAFE_INTEGER, true);
  if (streak > attempts) return 0;
  const q = 1 - p;
  let state = new Float64Array(streak);
  let next = new Float64Array(streak);
  state[0] = 1;
  let reached = 0;
  for (let t = 0; t < attempts; t++) {
    let alive = 0;
    for (let j = 0; j < streak; j++) alive += state[j]!;
    next[0] = p * alive;
    for (let j = 1; j < streak; j++) next[j] = q * state[j - 1]!;
    reached += q * state[streak - 1]!;
    [state, next] = [next, state];
  }
  return Math.min(1, reached);
}

function runFuture(rng: Rng, p: number, attempts: number, record?: Uint8Array): number {
  let current = 0;
  let longest = 0;
  for (let i = 0; i < attempts; i++) {
    const success = rng() < p;
    if (record) record[i] = success ? 1 : 0;
    if (success) {
      current = 0;
    } else if (++current > longest) {
      longest = current;
    }
  }
  return longest;
}

export function simulateStreaks(input: StreaksInput): StreaksResult {
  const { p, attempts, streak, futures, seed } = input;
  assertInRange('p', p, 0, 1);
  assertInRange('attempts', attempts, 1, 100_000, true);
  assertInRange('streak', streak, 1, attempts, true);
  assertInRange('futures', futures, 1, 1_000_000, true);

  const rng = createRng(seed);
  const sampleRun = new Uint8Array(attempts);
  const longestCounts = new Int32Array(attempts + 1);
  let hits = 0;
  let maxObservedLongest = 0;

  for (let f = 0; f < futures; f++) {
    const longest = runFuture(rng, p, attempts, f === 0 ? sampleRun : undefined);
    longestCounts[longest]!++;
    if (longest >= streak) hits++;
    if (longest > maxObservedLongest) maxObservedLongest = longest;
  }

  let sampleRunSuccesses = 0;
  for (const outcome of sampleRun) sampleRunSuccesses += outcome;

  return {
    input,
    sampleRun,
    sampleRunSuccesses,
    sampleRunLongest: longestLosingStreak(sampleRun),
    longestCounts,
    maxObservedLongest,
    reached: estimateProportion(hits, futures),
    exactReachProbability: exactLosingStreakProbability(p, attempts, streak),
    medianLongest: quantileFromCounts(longestCounts, 0.5),
  };
}
