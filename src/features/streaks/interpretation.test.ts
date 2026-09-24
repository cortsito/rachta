import { describe, expect, it } from 'vitest';
import { interpretStreaks } from './interpretation.ts';
import { simulateStreaks } from './model.ts';
import { sequenceRows } from './RunSequence.tsx';

const plain = (text: string) => text.replace(/[  ]/g, ' ');

describe('interpretStreaks', () => {
  it('responds to the chosen inputs and uses the exact probability', () => {
    const result = simulateStreaks({ p: 0.55, attempts: 100, streak: 8, futures: 1000, seed: 'x' });
    const [frequency, edge, rarity] = interpretStreaks(result).map(plain);
    expect(frequency).toContain('55 % de acierto y 100 intentos');
    expect(frequency).toContain('perder 8 o más seguidas');
    expect(frequency).toContain('8,37 %');
    expect(edge).toContain('ventaja real');
    expect(rarity).toContain('No es lo habitual');
  });

  it('covers disadvantage, near-certain and impossible cases', () => {
    const likely = interpretStreaks(simulateStreaks({ p: 0.3, attempts: 500, streak: 5, futures: 200, seed: 'x' }));
    expect(likely[1]).toContain('desventaja');
    expect(likely[2]).toContain('mayoría de los futuros');
    const impossible = interpretStreaks(simulateStreaks({ p: 1, attempts: 50, streak: 5, futures: 200, seed: 'x' }));
    expect(impossible[2]).toContain('imposible');
  });
});

describe('sequenceRows', () => {
  it('groups attempts by ten with 1-based ranges', () => {
    const rows = sequenceRows(Uint8Array.from([1, 0, 1, 1, 0, 0, 1, 1, 1, 1, 0, 1]));
    expect(rows).toEqual([
      ['1–10', 'A F A A F F A A A A'],
      ['11–12', 'F A'],
    ]);
  });
});
