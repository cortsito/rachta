import { describe, expect, it } from 'vitest';
import { parseSupportUrl } from './config.ts';

describe('support link configuration', () => {
  it('is absent unless an https URL is configured', () => {
    expect(parseSupportUrl(undefined)).toBeNull();
    expect(parseSupportUrl('')).toBeNull();
    expect(parseSupportUrl('   ')).toBeNull();
    expect(parseSupportUrl('not a url')).toBeNull();
    expect(parseSupportUrl('/relative')).toBeNull();
    expect(parseSupportUrl('http://example.org/cafe')).toBeNull();
    expect(parseSupportUrl('javascript:alert(1)')).toBeNull();
  });

  it('keeps a configured https URL', () => {
    expect(parseSupportUrl(' https://example.org/cafe ')).toBe('https://example.org/cafe');
  });
});
