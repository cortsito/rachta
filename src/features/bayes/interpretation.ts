/** Spanish, input-dependent reading of a Bayes result (pure, testable). */
import { formatInteger, formatPercent } from '../../lib/format.ts';
import type { BayesResult } from './model.ts';

const NO_MEDICAL_ADVICE =
  'Esta herramienta es educativa: no sustituye un diagnóstico ni una decisión médica real.';

export function interpretBayes(result: BayesResult): string[] {
  const { prevalence, sensitivity, specificity, population } = result.input;
  const { expected, exact } = result;

  const frequency =
    `Con una prevalencia del ${formatPercent(prevalence)}, una sensibilidad del ${formatPercent(sensitivity)} y una ` +
    `especificidad del ${formatPercent(specificity)}, de cada ${formatInteger(population)} personas simuladas se espera ` +
    `que ${formatInteger(expected.truePositive)} den positivo y tengan la condición, y ${formatInteger(expected.falsePositive)} ` +
    `den positivo sin tenerla.`;

  let ppvText: string;
  if (exact.ppv === null) {
    ppvText = `Con estos valores, nadie da positivo: la probabilidad condicional no está definida.`;
  } else if (expected.falsePositive > expected.truePositive) {
    ppvText =
      `Aunque la prueba es bastante fiable, hay muchas más personas sin la condición que con ella, así que la mayoría ` +
      `de los positivos son falsos positivos: solo el ${formatPercent(exact.ppv)} de quienes dan positivo tiene realmente ` +
      `la condición.`;
  } else {
    ppvText =
      `La mayoría de los positivos son reales: el ${formatPercent(exact.ppv)} de quienes dan positivo tiene la condición.`;
  }

  let prevalenceText: string;
  if (prevalence < 0.05) {
    prevalenceText =
      `Esto ocurre porque la condición es poco frecuente: incluso una prueba fiable produce muchos falsos positivos en ` +
      `términos absolutos, simplemente porque hay muchas más personas sanas a las que probar. ${NO_MEDICAL_ADVICE}`;
  } else {
    prevalenceText =
      `Con una condición más frecuente, los positivos reales pesan más frente a los falsos positivos. ${NO_MEDICAL_ADVICE}`;
  }

  return [frequency, ppvText, prevalenceText];
}
