import { describe, expect, it } from 'vitest';
import { interpretBayes } from './interpretation.ts';
import { simulateBayes } from './model.ts';

const plain = (text: string) => text.replace(/[  ]/g, ' ');

describe('interpretBayes', () => {
  it('flags low-prevalence testing where false positives outnumber true positives', () => {
    const result = simulateBayes({ prevalence: 0.01, sensitivity: 0.9, specificity: 0.95, population: 10000, seed: 'x' });
    const [frequency, ppv, prevalenceText] = interpretBayes(result).map(plain);
    expect(frequency).toContain('prevalencia del 1 %');
    expect(frequency).toContain('90');
    expect(ppv).toContain('mayoría');
    expect(ppv).toContain('falsos positivos');
    expect(prevalenceText).toContain('poco frecuente');
    expect(prevalenceText).toContain('no sustituye un diagnóstico');
  });

  it('reports true positives dominating at high prevalence', () => {
    const result = simulateBayes({ prevalence: 0.5, sensitivity: 0.95, specificity: 0.95, population: 10000, seed: 'x' });
    const [, ppv, prevalenceText] = interpretBayes(result).map(plain);
    expect(ppv).toContain('mayoría de los positivos son reales');
    expect(prevalenceText).not.toContain('poco frecuente');
  });

  it('handles an undefined PPV when nobody tests positive', () => {
    const result = simulateBayes({ prevalence: 0, sensitivity: 0.9, specificity: 1, population: 1000, seed: 'x' });
    const [, ppv] = interpretBayes(result).map(plain);
    expect(ppv).toContain('no está definida');
  });

  it('does not blame a rare condition or assume a reliable test when prevalence is high and the test is poor', () => {
    const result = simulateBayes({ prevalence: 0.9, sensitivity: 0.1, specificity: 0, population: 10000, seed: 'x' });
    const text = interpretBayes(result).map(plain);
    const [, ppv, context] = text;
    for (const paragraph of text) {
      expect(paragraph).not.toContain('fiable');
      expect(paragraph).not.toContain('más personas sin la condición');
      expect(paragraph).not.toContain('poco frecuente');
    }
    // Exact PPV = 0.09 / (0.09 + 0.1) ≈ 47,4 %.
    expect(ppv).toContain('La mayoría de los positivos son falsos positivos');
    expect(ppv).toContain('47,4 %');
    expect(context).toContain('más personas con la condición (90 %) que sin ella (10 %)');
    expect(context).toContain('menos probable, no más');
    expect(context).toContain('no sustituye un diagnóstico');
  });

  it('branches on exact probabilities, not on rounded display counts', () => {
    // 100 people: both expected counts round to 0, but false positives are ~8× as likely as true ones.
    const result = simulateBayes({ prevalence: 0.001, sensitivity: 0.5, specificity: 0.996, population: 100, seed: 'x' });
    expect(result.expected.truePositive).toBe(result.expected.falsePositive);
    const [, ppv] = interpretBayes(result).map(plain);
    expect(ppv).toContain('La mayoría de los positivos son falsos positivos');
    expect(ppv).toContain('11,1 %');
  });

  it('treats mathematically equal rates as equal despite float rounding', () => {
    const result = simulateBayes({ prevalence: 0.5, sensitivity: 0.3, specificity: 0.7, population: 1000, seed: 'x' });
    const [, ppv, context] = interpretBayes(result).map(plain);
    expect(ppv).toContain('igual de probables');
    expect(context).toContain('tantas personas con la condición como sin ella');
    expect(context).toContain('no aporta información');
  });
});
