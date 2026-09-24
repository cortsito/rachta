import { describe, expect, it } from 'vitest';
import { syncFieldText, type FieldText } from './RangeField.tsx';

describe('syncFieldText', () => {
  it('clears the error and replaces invalid text when the value changes from outside', () => {
    const invalid: FieldText = { text: '1500', error: 'Introduce un valor entre 10 y 1000.', syncedValue: 200 };
    expect(syncFieldText(invalid, 380, 380)).toEqual({ text: '380', error: '', syncedValue: 380 });
  });

  it('replaces an emptied field when the value is updated to zero', () => {
    const emptied: FieldText = { text: '', error: 'Introduce un número.', syncedValue: 0.55 };
    expect(syncFieldText(emptied, 0, 0)).toEqual({ text: '0', error: '', syncedValue: 0 });
    expect(syncFieldText({ ...emptied, text: '  ' }, 0, 0).text).toBe('0');
  });

  it('keeps text the user is typing when it already reads as the new value', () => {
    const typing: FieldText = { text: '55.0', error: '', syncedValue: 0.5 };
    expect(syncFieldText(typing, 0.55, 55)).toEqual({ text: '55.0', error: '', syncedValue: 0.55 });
  });

  it('leaves state untouched while the value has not changed', () => {
    const state: FieldText = { text: 'abc', error: 'Introduce un número.', syncedValue: 3 };
    expect(syncFieldText(state, 3, 3)).toBe(state);
  });
});
