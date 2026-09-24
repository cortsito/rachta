/** Spanish, input-dependent reading of a Bayes result (pure, testable). */
import { formatInteger, formatPercent } from '../../lib/format.ts';
import type { BayesResult } from './model.ts';

const NO_MEDICAL_ADVICE =
  'Esta herramienta es educativa: no sustituye un diagnóstico ni una decisión médica real.';

/**
 * −1, 0 or 1 as a is below, equal to or above b. Differences within float
 * rounding (e.g. 1 − 0.7 = 0.30000000000000004) count as equal.
 */
function compare(a: number, b: number): number {
  const difference = a - b;
  return Math.abs(difference) <= 1e-12 * Math.max(Math.abs(a), Math.abs(b)) ? 0 : Math.sign(difference);
}

export function interpretBayes(result: BayesResult): string[] {
  const { prevalence, sensitivity, specificity, population } = result.input;
  const { expected, exact } = result;

  const frequency =
    `Con una prevalencia del ${formatPercent(prevalence)}, una sensibilidad del ${formatPercent(sensitivity)} y una ` +
    `especificidad del ${formatPercent(specificity)}, de cada ${formatInteger(population)} personas simuladas se espera ` +
    `que ${formatInteger(expected.truePositive)} den positivo y tengan la condición, y ${formatInteger(expected.falsePositive)} ` +
    `den positivo sin tenerla.`;

  // Branch on the exact joint probabilities, never on the rounded counts above.
  const falseVsTrue = compare(exact.joint.falsePositive, exact.joint.truePositive);
  let ppvText: string;
  if (exact.ppv === null) {
    ppvText = `Con estos valores, nadie da positivo: la probabilidad condicional no está definida.`;
  } else if (falseVsTrue > 0) {
    ppvText =
      `La mayoría de los positivos son falsos positivos: solo el ${formatPercent(exact.ppv)} de quienes dan positivo ` +
      `tiene realmente la condición.`;
  } else if (falseVsTrue < 0) {
    ppvText =
      `La mayoría de los positivos son reales: el ${formatPercent(exact.ppv)} de quienes dan positivo tiene la condición.`;
  } else {
    ppvText = `Los positivos reales y los falsos positivos son igual de probables: la mitad de quienes dan positivo tiene la condición.`;
  }

  let baseRate: string;
  if (prevalence < 0.5) {
    baseRate =
      `${prevalence < 0.05 ? 'La condición es poco frecuente: hay' : 'Hay'} más personas sin la condición ` +
      `(${formatPercent(1 - prevalence)}) que con ella (${formatPercent(prevalence)}), así que los falsos positivos ` +
      `salen de un grupo más numeroso.`;
  } else if (prevalence > 0.5) {
    baseRate =
      `Hay más personas con la condición (${formatPercent(prevalence)}) que sin ella ` +
      `(${formatPercent(1 - prevalence)}), así que la prevalencia favorece a los positivos reales.`;
  } else {
    baseRate = `Hay tantas personas con la condición como sin ella, así que la prevalencia no favorece a ningún tipo de positivo.`;
  }

  // A positive result is informative only if it is more frequent with the condition than without it.
  const falsePositiveRate = 1 - specificity;
  const discrimination = compare(sensitivity, falsePositiveRate);
  let testText: string;
  if (specificity === 1) {
    testText = `La prueba nunca da positivo en quien no tiene la condición, así que no hay falsos positivos.`;
  } else if (discrimination > 0) {
    testText =
      `La prueba da positivo en el ${formatPercent(sensitivity)} de quienes tienen la condición y en el ` +
      `${formatPercent(falsePositiveRate)} de quienes no la tienen: un positivo hace la condición más probable, pero no segura.`;
  } else if (discrimination < 0) {
    testText =
      `La prueba da positivo más a menudo en quien no tiene la condición (${formatPercent(falsePositiveRate)}) que en ` +
      `quien la tiene (${formatPercent(sensitivity)}): un positivo hace la condición menos probable, no más.`;
  } else {
    testText =
      `La prueba da positivo con la misma frecuencia (${formatPercent(sensitivity)}) tenga o no la condición: un ` +
      `positivo no aporta información.`;
  }

  const prevalenceText = `${baseRate} ${testText} ${NO_MEDICAL_ADVICE}`;

  return [frequency, ppvText, prevalenceText];
}
