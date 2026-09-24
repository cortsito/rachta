/**
 * URL query-state contract (pure; no DOM access).
 *
 *   ?lab=<LabId>&<param>=<value>…&seed=<seed>
 *   ?page=<PageId>
 *
 * - A valid `lab` wins: every other key except its params and seed is dropped.
 * - Otherwise a valid `page` selects a content view (`?page=method`, `?page=uses`).
 * - Anything else, including an unknown `lab` or `page`, is the landing view
 *   and serializes to "".
 * - Param keys and order come from the lab's schema; unknown keys are
 *   dropped; malformed or out-of-range values are replaced or clamped.
 * - A lab view always has a valid seed. A missing or invalid seed is replaced
 *   by a fresh one during canonicalization, never while rendering.
 */
import { isLabId, labSchemas, type LabId, type LabParams } from './labs.ts';
import { parseParams, serializeParams, type ParamSchema, type ParamSpecs } from '../lib/params.ts';
import { isValidSeed } from '../lib/random.ts';

export type LabState = { [L in LabId]: { lab: L; params: LabParams<L>; seed: string } }[LabId];
export type LabStateOf<L extends LabId> = Extract<LabState, { lab: L }>;

/** Content views without parameters. The landing view is `page: null`. */
export const PAGE_IDS = ['method', 'uses'] as const;
export type PageId = (typeof PAGE_IDS)[number];
export type PageState = { lab: null; page: PageId | null };
export type QueryState = PageState | LabState;

export const LANDING: PageState = { lab: null, page: null };

export function isPageId(value: unknown): value is PageId {
  return typeof value === 'string' && (PAGE_IDS as readonly string[]).includes(value);
}

function schemaFor(lab: LabId): ParamSchema<ParamSpecs> {
  return labSchemas[lab] as unknown as ParamSchema<ParamSpecs>;
}

/** Parses any query string. `seed` is null when absent or invalid. */
export function parseQuery(search: string): PageState | (Omit<LabState, 'seed'> & { seed: string | null }) {
  const query = new URLSearchParams(search);
  const lab = query.get('lab');
  if (!isLabId(lab)) {
    const page = query.get('page');
    return isPageId(page) ? { lab: null, page } : LANDING;
  }
  const seed = query.get('seed');
  return {
    lab,
    params: parseParams(schemaFor(lab), query),
    seed: isValidSeed(seed) ? seed : null,
  } as Omit<LabState, 'seed'> & { seed: string | null };
}

/** Parses a query string and fills a missing seed with `makeSeed()`. */
export function resolveQuery(search: string, makeSeed: () => string): QueryState {
  const parsed = parseQuery(search);
  if (parsed.lab === null) return parsed;
  return { ...parsed, seed: parsed.seed ?? makeSeed() } as LabState;
}

/** Canonical query string, including the leading "?" (or "" for the landing view). */
export function serializeQuery(state: QueryState): string {
  if (state.lab === null) return state.page === null ? '' : `?page=${state.page}`;
  const query = new URLSearchParams();
  query.set('lab', state.lab);
  for (const [key, value] of serializeParams(schemaFor(state.lab), state.params)) query.set(key, value);
  query.set('seed', state.seed);
  return `?${query.toString()}`;
}

export function canonicalizeQuery(search: string, makeSeed: () => string): string {
  return serializeQuery(resolveQuery(search, makeSeed));
}

/** Query for a lab with its default parameters and the given seed. */
export function defaultLabQuery(lab: LabId, seed: string): string {
  return canonicalizeQuery(`?lab=${lab}`, () => seed);
}
