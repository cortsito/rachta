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
});
