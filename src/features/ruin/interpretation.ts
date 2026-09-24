/** Spanish, input-dependent reading of a hypothetical ruin result (pure, testable). */
import { formatInteger, formatNumber, formatPercent } from '../../lib/format.ts';
import type { RuinResult } from './model.ts';

export function interpretRuin(result: RuinResult): string[] {
  const { capital, p, gain, loss, fraction, rounds } = result.input;
  const { expectedMultiplier, expectedLogGrowth } = result.exact;
  const { ruined, medianMaxDrawdown, medianFinalCapital } = result;

  const setup =
    `Cada ronda expones el ${formatPercent(fraction)} del capital actual: con ${formatPercent(p)} de probabilidad ` +
    `ganas el ${formatPercent(gain)} de esa parte expuesta, y si no, pierdes el ${formatPercent(loss)}. En promedio, ` +
    `el capital se multiplica por ${formatNumber(expectedMultiplier)} cada ronda.`;

  // Exact growth rates describe the long run; what happens within `rounds` is read from the simulation.
  let longRun: string;
  if (expectedMultiplier > 1 && expectedLogGrowth < 0) {
    longRun =
      `Aunque la ventaja media es positiva, el crecimiento típico (mediana) es negativo: a la larga, la mayoría de los ` +
      `futuros tiende a perder capital, porque exponer una fracción tan alta hace que las malas rondas pesen más que ` +
      `las buenas al multiplicarse.`;
  } else if (expectedMultiplier > 1) {
    longRun =
      `La ventaja media también se refleja en el crecimiento típico: a la larga, la mayoría de los futuros tiende a ` +
      `${expectedLogGrowth > 0 ? 'crecer' : 'mantener su capital'}.`;
  } else {
    longRun =
      `La ventaja media ya es negativa o nula: en promedio, cada ronda no aumenta el capital, y las malas rachas solo ` +
      `lo empeoran.`;
  }

  // Type-7 median above (below) the start ⇒ at least half the futures end above (below) it.
  const horizon =
    medianFinalCapital > capital
      ? `al menos la mitad de los futuros simulados termina con más capital del que empezó`
      : medianFinalCapital < capital
        ? `al menos la mitad de los futuros simulados termina con menos capital del que empezó`
        : `el capital final típico coincide con el inicial`;
  const growth =
    `${longRun} En estas ${formatInteger(rounds)} rondas, el capital final típico (mediana) es ` +
    `${formatNumber(medianFinalCapital)} frente a ${formatNumber(capital)} al empezar: ${horizon}.`;

  const outcome =
    `Con estos valores, el ${formatPercent(ruined.value)} de los futuros simulados cae por debajo del nivel de ruina ` +
    `y la caída máxima típica (mediana) es del ${formatPercent(medianMaxDrawdown)}. Son unidades hipotéticas: no es ` +
    `una recomendación financiera ni de apuestas.`;

  return [setup, growth, outcome];
}
