/** Total-loss histogram whose hatching follows the exceedance metric exactly (pure). */
import type { HistogramBin } from '../../components/charts/Histogram.tsx';
import { binEqualWidth, countAtMost } from '../../lib/stats.ts';

export interface LossHistogram {
  /** Equal-width bins on [0, upper]; `highlightedCount` = periods in the bin with total > threshold. */
  bins: HistogramBin[];
  /** Periods above `upper`. Since upper ≥ threshold, all of them exceed the threshold. */
  overflow: number;
}

/**
 * Bins ascending period totals and, per bin, counts the periods whose total is
 * strictly greater than `threshold` (the model's exceedance rule). Both counts
 * use the same binning, so a bin that straddles the threshold, or that holds
 * zero-loss periods when the threshold is 0, is only partly highlighted.
 */
export function lossHistogram(sortedTotals: Float64Array, threshold: number, upper: number, binCount: number): LossHistogram {
  if (!(upper >= threshold)) throw new RangeError('lossHistogram requires upper ≥ threshold');
  const all = binEqualWidth(sortedTotals, 0, upper, binCount);
  const exceeding = binEqualWidth(sortedTotals.subarray(countAtMost(sortedTotals, threshold)), 0, upper, binCount);
  return {
    bins: all.bins.map((bin, i) => ({ ...bin, highlightedCount: exceeding.bins[i]!.count })),
    overflow: all.overflow,
  };
}
