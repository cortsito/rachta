/** Descriptive statistics over simulation samples. Pure, allocation-conscious. */

export type Numbers = ArrayLike<number>;

export function mean(values: Numbers): number {
  if (values.length === 0) return Number.NaN;
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i]!;
  return sum / values.length;
}

/** Ascending copy as a Float64Array (numeric sort, unlike Array#sort's default). */
export function sortedCopy(values: Numbers): Float64Array {
  return Float64Array.from(values).sort();
}

/**
 * Quantile of already-sorted data with linear interpolation between order
 * statistics (Hyndman–Fan type 7, the default in R and NumPy).
 */
export function quantileSorted(sorted: Numbers, q: number): number {
  const n = sorted.length;
  if (n === 0) return Number.NaN;
  const clampedQ = Math.min(1, Math.max(0, q));
  const position = (n - 1) * clampedQ;
  const lower = Math.floor(position);
  const upper = Math.min(lower + 1, n - 1);
  const weight = position - lower;
  const low = sorted[lower]!;
  return weight === 0 ? low : low + (sorted[upper]! - low) * weight;
}

export function quantiles(values: Numbers, qs: readonly number[]): number[] {
  const sorted = sortedCopy(values);
  return qs.map((q) => quantileSorted(sorted, q));
}

export function median(values: Numbers): number {
  return quantiles(values, [0.5])[0]!;
}

/**
 * Type-7 quantile of integer data given as a frequency table:
 * `counts[v]` is how many observations equal `v`.
 */
export function quantileFromCounts(counts: Numbers, q: number): number {
  let total = 0;
  for (let v = 0; v < counts.length; v++) total += counts[v]!;
  if (total === 0) return Number.NaN;
  const position = (total - 1) * Math.min(1, Math.max(0, q));
  const lowerRank = Math.floor(position);
  const weight = position - lowerRank;
  const low = valueAtRank(counts, lowerRank);
  if (weight === 0) return low;
  return low + (valueAtRank(counts, Math.min(lowerRank + 1, total - 1)) - low) * weight;
}

function valueAtRank(counts: Numbers, rank: number): number {
  let seen = 0;
  for (let v = 0; v < counts.length; v++) {
    seen += counts[v]!;
    if (seen > rank) return v;
  }
  return counts.length - 1;
}

export interface Interval {
  low: number;
  high: number;
}

/** 95% two-sided normal quantile. */
export const Z_95 = 1.959963984540054;

/**
 * Wilson score interval for a binomial proportion. Well-behaved at 0 and n
 * successes, which matters for rare events estimated from finite samples.
 */
export function wilsonInterval(successes: number, trials: number, z = Z_95): Interval {
  if (trials <= 0) return { low: 0, high: 1 };
  const p = successes / trials;
  const z2 = z * z;
  const denominator = 1 + z2 / trials;
  const centre = (p + z2 / (2 * trials)) / denominator;
  const half = (z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials))) / denominator;
  // The exact endpoints are analytic; avoid rounding residue like 2e-19.
  return {
    low: successes <= 0 ? 0 : Math.max(0, centre - half),
    high: successes >= trials ? 1 : Math.min(1, centre + half),
  };
}

export interface ProportionEstimate {
  successes: number;
  trials: number;
  /** successes / trials */
  value: number;
  interval95: Interval;
}

export function estimateProportion(successes: number, trials: number): ProportionEstimate {
  return {
    successes,
    trials,
    value: trials > 0 ? successes / trials : Number.NaN,
    interval95: wilsonInterval(successes, trials),
  };
}

export interface Bin {
  /** Inclusive lower edge. */
  x0: number;
  /** Exclusive upper edge, except for the last bin, which includes `max`. */
  x1: number;
  count: number;
}

export interface Binned {
  bins: Bin[];
  /** Observations below `min`. */
  underflow: number;
  /** Observations above `max`. */
  overflow: number;
  total: number;
}

/** Equal-width histogram on [min, max]. Values outside are counted, not dropped silently. */
export function binEqualWidth(values: Numbers, min: number, max: number, binCount: number): Binned {
  if (!(max > min) || !Number.isInteger(binCount) || binCount < 1) {
    throw new RangeError('binEqualWidth requires max > min and a positive integer binCount');
  }
  const width = (max - min) / binCount;
  const counts = new Array<number>(binCount).fill(0);
  let underflow = 0;
  let overflow = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    if (v < min) underflow++;
    else if (v > max) overflow++;
    else counts[Math.min(binCount - 1, Math.floor((v - min) / width))]!++;
  }
  const bins = counts.map((count, i) => ({
    x0: min + i * width,
    x1: i === binCount - 1 ? max : min + (i + 1) * width,
    count,
  }));
  return { bins, underflow, overflow, total: values.length };
}

/** One bin per integer value 0..counts.length-1, from a frequency table. */
export function binsFromCounts(counts: Numbers): Bin[] {
  const bins: Bin[] = [];
  for (let v = 0; v < counts.length; v++) bins.push({ x0: v, x1: v + 1, count: counts[v]! });
  return bins;
}
