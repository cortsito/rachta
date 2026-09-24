import { describe, expect, it } from 'vitest';
import { canonicalizeQuery, defaultLabQuery, parseQuery, resolveQuery, serializeQuery } from './query.ts';
import { LAB_IDS } from './labs.ts';

const fixedSeed = () => 'fresh01';

describe('query-state contract', () => {
  it('treats a missing or unknown lab as the landing view', () => {
    expect(parseQuery('')).toEqual({ lab: null });
    expect(parseQuery('?lab=poker&p=0.5')).toEqual({ lab: null });
    expect(canonicalizeQuery('?lab=poker&seed=x', fixedSeed)).toBe('');
    expect(serializeQuery({ lab: null })).toBe('');
  });

  it('fills defaults, clamps values, drops unknown keys and keeps a valid seed', () => {
    const search = canonicalizeQuery('?lab=streaks&p=7&attempts=abc&futures=-5&junk=1&seed=abc', fixedSeed);
    expect(search).toBe('?lab=streaks&p=1&attempts=100&streak=8&futures=100&seed=abc');
  });

  it('replaces a missing or invalid seed only during canonicalization', () => {
    expect(parseQuery('?lab=bayes&seed=bad%20seed')).toMatchObject({ lab: 'bayes', seed: null });
    expect(resolveQuery('?lab=bayes', fixedSeed)).toMatchObject({ lab: 'bayes', seed: 'fresh01' });
    expect(canonicalizeQuery('?lab=bayes&seed=%3Cscript%3E', fixedSeed)).toContain('seed=fresh01');
  });

  it('applies cross-field constraints from the schema', () => {
    const state = resolveQuery('?lab=streaks&attempts=20&streak=90&seed=s', fixedSeed);
    expect(state).toMatchObject({ lab: 'streaks', params: { attempts: 20, streak: 20 } });
  });

  it.each(LAB_IDS)('round-trips the canonical query of %s', (lab) => {
    const canonical = defaultLabQuery(lab, 'seed42');
    expect(canonical.startsWith(`?lab=${lab}&`)).toBe(true);
    expect(canonical.endsWith('&seed=seed42')).toBe(true);
    expect(canonicalizeQuery(canonical, () => 'unused')).toBe(canonical);
    expect(serializeQuery(resolveQuery(canonical, () => 'unused'))).toBe(canonical);
  });

  it('writes canonical decimals for fractional parameters', () => {
    expect(defaultLabQuery('bayes', 's')).toBe(
      '?lab=bayes&prevalence=0.01&sensitivity=0.9&specificity=0.95&population=10000&seed=s',
    );
    expect(canonicalizeQuery('?lab=bayes&prevalence=0.00012345&seed=s', fixedSeed)).toContain('prevalence=0.0001&');
  });
});
