/** Spanish, input-dependent reading of a Streaks result (pure, testable). */
import { formatInteger, formatNumber, formatOneIn, formatPercent } from '../../lib/format.ts';
import type { StreaksResult } from './model.ts';

export function interpretStreaks(result: StreaksResult): string[] {
  const { p, attempts, streak, futures } = result.input;
  const { successes } = result.reached;
  const exact = result.exactReachProbability;
  const oneIn = formatOneIn(exact);

  const frequency =
    `Con un ${formatPercent(p)} de acierto y ${formatInteger(attempts)} intentos por futuro, ` +
    `perder ${formatInteger(streak)} o más seguidas ocurrió en ${formatInteger(successes)} de ` +
    `${formatInteger(futures)} futuros simulados. La probabilidad exacta es ${formatPercent(exact)}` +
    (oneIn ? ` (${oneIn} futuros).` : '.');

  let edge: string;
  if (p > 0.5) {
    edge =
      `Acertar más de la mitad de las veces es una ventaja real, pero no impide las malas rachas: ` +
      `la peor racha típica (mediana) fue de ${formatNumber(result.medianLongest)} fallos seguidos.`;
  } else if (p === 0.5) {
    edge = `Con un 50 % de acierto, la peor racha típica (mediana) fue de ${formatNumber(result.medianLongest)} fallos seguidos.`;
  } else {
    edge =
      `Con desventaja, las rachas largas de fallos son todavía más frecuentes: ` +
      `la peor racha típica (mediana) fue de ${formatNumber(result.medianLongest)} fallos seguidos.`;
  }

  let rarity: string;
  if (exact >= 0.5) {
    rarity = 'Con estos valores, una racha así no es mala suerte excepcional: aparece en la mayoría de los futuros.';
  } else if (exact >= 0.05) {
    rarity = 'No es lo habitual, pero tampoco es extraordinario: si repites el experimento muchas veces, lo verás.';
  } else if (exact > 0) {
    rarity = 'Es poco frecuente con estos valores, pero poco frecuente no es imposible: más intentos la hacen más probable.';
  } else {
    rarity = 'Con estos valores es imposible: no hay suficientes intentos o nunca se falla.';
  }

  return [frequency, edge, rarity];
}
