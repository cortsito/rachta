/** Spanish, input-dependent reading of a compound-loss result (pure, testable). */
import { formatNumber, formatPercent } from '../../lib/format.ts';
import { countAtMost } from '../../lib/stats.ts';
import type { CompoundLossResult } from './model.ts';

/** Proportion of already-sorted values that are less than or equal to `threshold`. */
export function proportionAtMost(sortedValues: ArrayLike<number>, threshold: number): number {
  const n = sortedValues.length;
  return n === 0 ? Number.NaN : countAtMost(sortedValues, threshold) / n;
}

/** Relative gaps between mean and median read as "much" / "somewhat" different. */
const LARGE_GAP = 0.25;
const SMALL_GAP = 0.05;

export function interpretCompoundLoss(result: CompoundLossResult): string[] {
  const { frequency, dispersion, threshold } = result.input;
  const { exact, median, p90, exceedance } = result;

  // Measured skew: how far the simulated median sits below the exact mean, relative to the mean.
  const gap = exact.mean > 0 ? (exact.mean - median) / exact.mean : 0;
  const comparison =
    gap >= LARGE_GAP
      ? `pero la mediana simulada es de solo ${formatNumber(median)}: mucho menor que la media`
      : gap >= SMALL_GAP
        ? `y la mediana simulada es de ${formatNumber(median)}: algo menor que la media`
        : gap > -SMALL_GAP
          ? `y la mediana simulada es de ${formatNumber(median)}: muy parecida a la media`
          : `y la mediana simulada es de ${formatNumber(median)}: mayor que la media`;
  const moments =
    `Con una frecuencia media de ${formatNumber(frequency)} eventos por periodo y una severidad típica (mediana) de ` +
    `${formatNumber(exact.severityMedian)} por evento, la pérdida total media esperada es ${formatNumber(exact.mean)} ` +
    `por periodo, ${comparison}.`;

  // Law of total variance: Var[S] = λ·Var[X] + λ·E[X]², so severity dispersion
  // explains the share Var[X] / E[X²] = 1 − e^(−σ²); the rest comes from the event count.
  const severityShare = 1 - Math.exp(-(dispersion * dispersion));
  const causes: string[] = [];
  if (exact.probabilityOfNoLoss > 0.5) causes.push('más de la mitad de los periodos no tiene ningún evento');
  causes.push(
    severityShare > 0.5
      ? `unos pocos eventos mucho más costosos que el típico elevan la media (la pérdida media por evento es ` +
          `${formatNumber(exact.severityMean)}, frente a una típica de ${formatNumber(exact.severityMedian)})`
      : 'la variación viene sobre todo del número de eventos por periodo, no de eventos excepcionalmente costosos',
  );

  const belowMean = formatPercent(proportionAtMost(result.sortedTotals, exact.mean));
  let skew: string;
  if (gap >= LARGE_GAP) {
    skew =
      `La media no es un valor típico: el ${belowMean} de los periodos simulados pierde menos que la media, porque ` +
      `${causes.join(', y ')}. Así es como un promedio puede describir mal la experiencia habitual.`;
  } else if (gap >= SMALL_GAP) {
    skew =
      `La media queda algo por encima de lo típico: el ${belowMean} de los periodos simulados pierde menos que la ` +
      `media, porque ${causes.join(', y ')}.`;
  } else if (gap > -SMALL_GAP) {
    skew =
      `Aquí la media sí se parece a un periodo típico: la mediana simulada está a menos de un ` +
      `${formatPercent(SMALL_GAP)} de ella y el ${belowMean} de los periodos simulados pierde menos que la media.`;
  } else {
    skew = `La mediana simulada supera a la media: el ${belowMean} de los periodos simulados pierde menos que la media.`;
  }

  const tail =
    `Superar ${formatNumber(threshold)} en un periodo ocurrió en el ${formatPercent(exceedance.value)} de los ` +
    `futuros simulados. Como referencia, el percentil 90 es ${formatNumber(p90)}, frente a una mediana de ` +
    `${formatNumber(median)}. Con ${formatPercent(exact.probabilityOfNoLoss)} de probabilidad, un periodo no tiene ` +
    `ningún evento.`;

  return [moments, skew, tail];
}
