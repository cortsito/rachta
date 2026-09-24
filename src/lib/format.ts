/**
 * Spanish number formatting. Defaults to three significant figures so results
 * never suggest more precision than a simulation provides.
 * Note: es-ES does not group four-digit integers ("1000", but "10.000").
 */
import type { Interval } from './stats.ts';

export const LOCALE = 'es-ES';
export const MISSING = '—';

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.NumberFormat(LOCALE, options);
    formatters.set(key, cached);
  }
  return cached;
}

/** Avoids "-0" after rounding. */
function unsign(value: number): number {
  return Object.is(value, -0) ? 0 : value;
}

export function formatNumber(value: number, significantDigits = 3): string {
  if (Number.isNaN(value)) return MISSING;
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '−∞';
  const rounded = unsign(Number(value.toPrecision(significantDigits)));
  return formatter({ maximumSignificantDigits: significantDigits }).format(rounded);
}

export function formatInteger(value: number): string {
  if (!Number.isFinite(value)) return formatNumber(value);
  return formatter({ maximumFractionDigits: 0 }).format(unsign(Math.round(value)));
}

/**
 * Formats a probability in [0, 1] as a percentage ("12,5 %").
 * Only exactly 0 and 1 render as "0 %" and "100 %"; values that would round to
 * an endpoint are shown as bounds ("> 99,9 %") instead of false certainty.
 */
export function formatPercent(probability: number, significantDigits = 3): string {
  if (Number.isNaN(probability)) return MISSING;
  const percent = formatter({ style: 'percent', maximumSignificantDigits: significantDigits });
  if (probability <= 0) return percent.format(0);
  if (probability >= 1) return percent.format(1);
  if (Number(probability.toPrecision(significantDigits)) >= 1) {
    const bound = 1 - 10 ** -significantDigits;
    return `> ${formatter({ style: 'percent', maximumFractionDigits: significantDigits - 2 }).format(bound)}`;
  }
  return percent.format(probability);
}

export function formatInterval(interval: Interval, format: (value: number) => string = formatPercent): string {
  return `${format(interval.low)} – ${format(interval.high)}`;
}

export function formatSampleCount(samples: number): string {
  return `${formatInteger(samples)} ${samples === 1 ? 'simulación' : 'simulaciones'}`;
}

/** Visible provenance label for estimated metrics. */
export function estimatedLabel(samples: number): string {
  return `Estimado con ${formatSampleCount(samples)}`;
}

export const EXACT_LABEL = 'Exacto';

/** "1 de cada 23" style frequency, or null when it would be misleading. */
export function formatOneIn(probability: number): string | null {
  if (!(probability > 0) || probability > 0.5) return null;
  return `1 de cada ${formatNumber(1 / probability, 2)}`;
}
