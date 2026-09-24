import { describe, expect, it } from 'vitest';
import {
  assertInRange,
  defaultParams,
  defineSchema,
  normalizeParams,
  normalizeValue,
  paramsEqual,
  parseParams,
  parseValue,
  serializeParams,
  stepDecimals,
} from './params.ts';

const percent = { min: 0, max: 1, step: 0.01, default: 0.55, display: 'percent' as const };
const count = { min: 10, max: 1000, step: 10, default: 100 };

const schema = defineSchema({
  specs: { p: percent, n: count, k: { min: 1, max: 100, step: 1, default: 8 } },
  constrain: (v) => ({ ...v, k: Math.min(v.k, v.n) }),
});

describe('normalizeValue', () => {
  it('clamps, snaps to the step grid and removes float noise', () => {
    expect(normalizeValue(percent, 1.7)).toBe(1);
    expect(normalizeValue(percent, -3)).toBe(0);
    expect(normalizeValue(percent, 0.555)).toBe(0.56);
    expect(normalizeValue(percent, 0.1 + 0.2)).toBe(0.3);
    expect(normalizeValue(count, 14)).toBe(10);
    expect(normalizeValue(count, 15)).toBe(20);
    expect(normalizeValue(count, Number.NaN)).toBe(100);
    expect(normalizeValue(count, Infinity)).toBe(100);
  });

  it('counts step decimals, including exponent notation', () => {
    expect(stepDecimals(1)).toBe(0);
    expect(stepDecimals(0.05)).toBe(2);
    expect(stepDecimals(0.0001)).toBe(4);
    expect(stepDecimals(1e-7)).toBe(7);
  });
});

describe('parseValue', () => {
  it('falls back to the default for anything but a plain decimal', () => {
    for (const raw of [null, '', '  ', 'abc', '0x10', '1e3', 'Infinity', 'NaN', '5,5', '--1', '.5']) {
      expect(parseValue(count, raw)).toBe(100);
    }
  });

  it('clamps valid numbers that are out of range', () => {
    expect(parseValue(count, '999999')).toBe(1000);
    expect(parseValue(count, '-40')).toBe(10);
    expect(parseValue(percent, ' 0.42 ')).toBe(0.42);
  });
});

describe('schema helpers', () => {
  it('parses a query, applying cross-field constraints', () => {
    const values = parseParams(schema, new URLSearchParams('p=0.6&n=50&k=90&extra=1'));
    expect(values).toEqual({ p: 0.6, n: 50, k: 50 });
  });

  it('serializes in schema order with canonical decimals', () => {
    expect(serializeParams(schema, { p: 0.5, n: 200, k: 7 })).toEqual([
      ['p', '0.5'],
      ['n', '200'],
      ['k', '7'],
    ]);
  });

  it('round-trips through the URL representation', () => {
    const values = normalizeParams(schema, { p: 0.37, n: 440, k: 12 });
    const search = new URLSearchParams(serializeParams(schema, values));
    expect(parseParams(schema, search)).toEqual(values);
    expect(paramsEqual(schema, parseParams(schema, search), values)).toBe(true);
  });

  it('fills missing values with defaults', () => {
    expect(defaultParams(schema)).toEqual({ p: 0.55, n: 100, k: 8 });
    expect(normalizeParams(schema, { p: 0.9 })).toEqual({ p: 0.9, n: 100, k: 8 });
  });
});

describe('assertInRange', () => {
  it('accepts bounds and rejects NaN, out-of-range and non-integers', () => {
    expect(() => assertInRange('x', 0, 0, 1)).not.toThrow();
    expect(() => assertInRange('x', 1, 0, 1)).not.toThrow();
    expect(() => assertInRange('x', Number.NaN, 0, 1)).toThrow(RangeError);
    expect(() => assertInRange('x', 1.01, 0, 1)).toThrow(RangeError);
    expect(() => assertInRange('x', 1.5, 0, 3, true)).toThrow(RangeError);
  });
});
