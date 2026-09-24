import { describe, expect, it } from 'vitest';
import { interpretRuin } from './interpretation.ts';
import { simulateRuin, type RuinInput } from './model.ts';

const plain = (text: string) => text.replace(/[  ]/g, ' ');
const base: RuinInput = { capital: 1000, p: 0.55, gain: 1, loss: 1, fraction: 0.25, rounds: 200, futures: 2000, seed: 'x' };

describe('interpretRuin', () => {
  it('flags a positive edge with negative typical growth (over-betting)', () => {
    const result = simulateRuin(base);
    const [, growth] = interpretRuin(result).map(plain);
    expect(growth).toContain('ventaja media es positiva');
    expect(growth).toContain('crecimiento típico');
    expect(growth).toContain('negativo');
  });

  it('describes a positive edge with positive typical growth', () => {
    const result = simulateRuin({ ...base, fraction: 0.05 });
    const [, growth] = interpretRuin(result).map(plain);
    expect(growth).toContain('también se refleja en el crecimiento típico');
  });

  it('describes a negative edge', () => {
    const result = simulateRuin({ ...base, p: 0.3 });
    const [, growth] = interpretRuin(result).map(plain);
    expect(growth).toContain('ventaja media ya es negativa o nula');
  });

  it('reports the ruin probability and disclaims financial advice', () => {
    const result = simulateRuin(base);
    const [, , outcome] = interpretRuin(result).map(plain);
    expect(outcome).toContain('nivel de ruina');
    expect(outcome).toContain('no es una recomendación financiera');
  });

  it('does not infer the finite-horizon outcome from positive long-run growth', () => {
    // Positive edge and log growth, but in 10 rounds ending above 1000 needs ≥ 6 wins (P ≈ 0,4).
    const result = simulateRuin({ capital: 1000, p: 0.51, gain: 1, loss: 1, fraction: 0.01, rounds: 10, futures: 10000, seed: 'x' });
    expect(result.exact.expectedLogGrowth).toBeGreaterThan(0);
    expect(result.medianFinalCapital).toBeLessThan(1000);
    const [, growth] = interpretRuin(result).map(plain);
    expect(growth).not.toContain('terminan con más capital');
    expect(growth).toContain('a la larga');
    expect(growth).toContain('En estas 10 rondas');
    expect(growth).toContain('al menos la mitad de los futuros simulados termina con menos capital del que empezó');
  });

  it('reports a finite-horizon gain when the simulated median ends above the start', () => {
    const result = simulateRuin({ ...base, fraction: 0.05 });
    expect(result.medianFinalCapital).toBeGreaterThan(base.capital);
    const [, growth] = interpretRuin(result).map(plain);
    expect(growth).toContain('termina con más capital del que empezó');
  });
});
