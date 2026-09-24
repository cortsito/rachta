/** Minimal scale and tick helpers for the SVG chart primitives (pure). */

export type Scale = (value: number) => number;

export function linearScale([d0, d1]: readonly [number, number], [r0, r1]: readonly [number, number]): Scale {
  if (d0 === d1) return () => (r0 + r1) / 2;
  const factor = (r1 - r0) / (d1 - d0);
  return (value) => r0 + (value - d0) * factor;
}

/**
 * Log10 scale. Values at or below zero have no logarithm and are pinned to the
 * domain minimum; positive values outside the domain map outside the range.
 */
export function logScale([d0, d1]: readonly [number, number], range: readonly [number, number]): Scale {
  if (!(d0 > 0 && d1 > 0)) throw new RangeError('logScale requires a positive domain');
  const inner = linearScale([Math.log10(d0), Math.log10(d1)], range);
  return (value) => inner(Math.log10(value > 0 ? value : d0));
}

function cleanFloat(value: number): number {
  return Number(value.toPrecision(12));
}

/** Step from the 1–2–5 sequence giving at most roughly `maxCount` intervals. */
export function niceStep(span: number, maxCount: number): number {
  if (!(span > 0)) return 1;
  const raw = span / Math.max(1, maxCount);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const residual = raw / magnitude;
  const factor = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return factor * magnitude;
}

/** Round-number ticks inside [min, max]. */
export function niceTicks(min: number, max: number, maxCount = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  const step = niceStep(max - min, maxCount);
  const ticks: number[] = [];
  for (let value = Math.ceil(min / step) * step; value <= max + step * 1e-9; value += step) {
    ticks.push(cleanFloat(value));
  }
  return ticks;
}

/** Smallest round number ≥ max on the same step grid as niceTicks. */
export function niceUpperBound(max: number, maxCount = 5): number {
  if (!(max > 0)) return 1;
  const step = niceStep(max, maxCount);
  return cleanFloat(Math.ceil(max / step) * step);
}

/** Most ticks on a log axis; wider domains use every 2nd, 3rd, … power of ten. */
const MAX_LOG_TICKS = 8;

/** Powers of ten in [min, max]; adds 2× and 5× when that would leave fewer than three ticks. */
export function logTicks(min: number, max: number): number[] {
  if (!(min > 0 && max > min)) return [];
  const low = Math.ceil(Math.log10(min));
  const high = Math.floor(Math.log10(max));
  const every = Math.max(1, Math.ceil((high - low + 1) / MAX_LOG_TICKS));
  const powers: number[] = [];
  for (let e = Math.ceil(low / every) * every; e <= high; e += every) powers.push(cleanFloat(10 ** e));
  if (powers.length >= 3) return powers;
  const ticks: number[] = [];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) {
    for (const factor of [1, 2, 5]) {
      const value = cleanFloat(factor * 10 ** e);
      if (value >= min && value <= max) ticks.push(value);
    }
  }
  return ticks;
}
