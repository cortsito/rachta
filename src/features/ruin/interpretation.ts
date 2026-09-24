/** Spanish, input-dependent reading of a hypothetical ruin result (pure, testable). */
import { formatNumber, formatPercent } from '../../lib/format.ts';
import type { RuinResult } from './model.ts';

export function interpretRuin(result: RuinResult): string[] {
  const { p, gain, loss, fraction } = result.input;
  const { expectedMultiplier, expectedLogGrowth } = result.exact;
  const { ruined, medianMaxDrawdown, medianFinalCapital } = result;

  const setup =
    `Cada ronda expones el ${formatPercent(fraction)} del capital actual: con ${formatPercent(p)} de probabilidad ` +
    `ganas el ${formatPercent(gain)} de esa parte expuesta, y si no, pierdes el ${formatPercent(loss)}. En promedio, ` +
    `el capital se multiplica por ${formatNumber(expectedMultiplier)} cada ronda.`;

  let growth: string;
  if (expectedMultiplier > 1 && expectedLogGrowth < 0) {
    growth =
      `Aunque la ventaja media es positiva, el crecimiento típico (mediana) es negativo: la mayoría de los futuros ` +
      `terminan perdiendo capital, porque exponer una fracción tan alta hace que las malas rondas pesen más que las ` +
      `buenas al multiplicarse.`;
  } else if (expectedMultiplier > 1) {
    growth =
      `La ventaja media también se refleja en el crecimiento típico: la mayoría de los futuros terminan con más ` +
      `capital del que empezaron.`;
  } else {
    growth =
      `La ventaja media ya es negativa o nula: cada ronda reduce el capital expuesto en promedio, y las malas ` +
      `rachas solo lo empeoran.`;
  }

  const outcome =
    `Con estos valores, el ${formatPercent(ruined.value)} de los futuros simulados cae por debajo del nivel de ruina, ` +
    `la caída máxima típica (mediana) es del ${formatPercent(medianMaxDrawdown)} y el capital final típico es de ` +
    `${formatNumber(medianFinalCapital)}. Son unidades hipotéticas: no es una recomendación financiera ni de apuestas.`;

  return [setup, growth, outcome];
}
