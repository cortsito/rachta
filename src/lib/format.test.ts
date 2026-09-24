import { describe, expect, it } from 'vitest';
import {
  estimatedLabel,
  formatInteger,
  formatInterval,
  formatNumber,
  formatOneIn,
  formatPercent,
} from './format.ts';

/** Intl uses non-breaking spaces; compare with plain ones. */
const plain = (text: string) => text.replace(/[  ]/g, ' ');

describe('formatPercent', () => {
  it('uses Spanish decimals and three significant figures', () => {
    expect(plain(formatPercent(0.125))).toBe('12,5 %');
    expect(plain(formatPercent(0.123456))).toBe('12,3 %');
    expect(plain(formatPercent(0.5))).toBe('50 %');
    expect(plain(formatPercent(0.0012345))).toBe('0,123 %');
  });

  it('only prints 0 % and 100 % for exact endpoints', () => {
    expect(plain(formatPercent(0))).toBe('0 %');
    expect(plain(formatPercent(1))).toBe('100 %');
    expect(plain(formatPercent(0.99996))).toBe('> 99,9 %');
    expect(plain(formatPercent(0.999))).toBe('99,9 %');
    expect(plain(formatPercent(1e-7))).not.toBe('0 %');
  });

  it('shows a dash for undefined values', () => {
    expect(formatPercent(Number.NaN)).toBe('—');
  });
});

describe('formatNumber and formatInteger', () => {
  it('rounds to significant figures with Spanish grouping', () => {
    expect(plain(formatNumber(12345))).toBe('12.300');
    expect(plain(formatNumber(3.14159))).toBe('3,14');
    expect(plain(formatNumber(1234.5, 2))).toBe('1200');
    expect(formatNumber(-0.0001, 1)).toBe('-0,0001');
    expect(formatNumber(-0)).toBe('0');
    expect(formatNumber(Infinity)).toBe('∞');
    expect(formatNumber(Number.NaN)).toBe('—');
  });

  it('switches to scientific notation for very large magnitudes', () => {
    expect(plain(formatNumber(999_000_000_000_000))).toBe('999.000.000.000.000');
    expect(formatNumber(1.2345e15)).toBe('1,23E15');
    expect(formatNumber(2.757e294)).toBe('2,76E294');
    expect(formatNumber(-1e20)).toBe('-1E20');
  });

  it('formats counts without decimals', () => {
    expect(plain(formatInteger(10000))).toBe('10.000');
    expect(plain(formatInteger(2.6))).toBe('3');
  });
});

describe('labels', () => {
  it('names the simulation count for estimates', () => {
    expect(plain(estimatedLabel(10000))).toBe('Estimado con 10.000 simulaciones');
    expect(estimatedLabel(1)).toBe('Estimado con 1 simulación');
  });

  it('formats intervals and "1 in N" frequencies', () => {
    expect(plain(formatInterval({ low: 0.1, high: 0.125 }))).toBe('10 % – 12,5 %');
    expect(formatOneIn(0.04)).toBe('1 de cada 25');
    expect(formatOneIn(0.7)).toBeNull();
    expect(formatOneIn(0)).toBeNull();
  });
});
