/** Spanish, input-dependent reading of a compound-loss result (pure, testable). */
import { formatNumber, formatPercent } from '../../lib/format.ts';
import type { CompoundLossResult } from './model.ts';

/** Proportion of already-sorted values that are less than or equal to `threshold`. */
export function proportionAtMost(sortedValues: ArrayLike<number>, threshold: number): number {
  const n = sortedValues.length;
  if (n === 0) return Number.NaN;
  let low = 0;
  let high = n;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (sortedValues[mid]! <= threshold) low = mid + 1;
    else high = mid;
  }
  return low / n;
}

export function interpretCompoundLoss(result: CompoundLossResult): string[] {
  const { frequency, threshold } = result.input;
  const { exact, median, p90, exceedance } = result;

  const moments =
    `Con una frecuencia media de ${formatNumber(frequency)} eventos por periodo y una severidad típica (mediana) de ` +
    `${formatNumber(exact.severityMedian)} por evento, la pérdida total media esperada es ${formatNumber(exact.mean)} ` +
    `por periodo, pero la mediana simulada es de solo ${formatNumber(median)}: mucho menor que la media.`;

  const belowMean = proportionAtMost(result.sortedTotals, exact.mean);
  const skew =
    `La media no es un valor típico: el ${formatPercent(belowMean)} de los periodos simulados pierde menos que la ` +
    `media, porque unos pocos periodos con eventos raros y muy costosos la elevan. Así es como un promedio puede ` +
    `describir mal la experiencia habitual.`;

  const tail =
    `Superar ${formatNumber(threshold)} en un periodo ocurrió en el ${formatPercent(exceedance.value)} de los ` +
    `futuros simulados. Cuando ocurre, puede ser mucho más costoso que lo típico: el percentil 90 es ${formatNumber(p90)}, ` +
    `frente a una mediana de ${formatNumber(median)}. Con ${formatPercent(exact.probabilityOfNoLoss)} de probabilidad, ` +
    `un periodo no tiene ningún evento.`;

  return [moments, skew, tail];
}
