import { useState } from 'react';
import { normalizeParams, type ParamSchema, type ParamSpecs, type ParamValues } from '../../lib/params.ts';

/**
 * Editable copy of a lab's committed parameters. Every update is normalized
 * through the schema (bounds, step, cross-field rules). When the committed
 * parameters change from outside (Back/Forward, a new run), the draft follows.
 */
export function useParamDraft<S extends ParamSpecs>(schema: ParamSchema<S>, committed: ParamValues<S>) {
  const committedKey = JSON.stringify(committed);
  const [draft, setDraft] = useState(committed);
  const [syncedKey, setSyncedKey] = useState(committedKey);
  if (committedKey !== syncedKey) {
    setSyncedKey(committedKey);
    setDraft(committed);
  }

  function update<K extends keyof S>(key: K, value: number) {
    setDraft((current) => normalizeParams(schema, { ...current, [key]: value }));
  }

  return [draft, update] as const;
}
