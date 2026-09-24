/**
 * Numeric parameter schemas: the single source of bounds, defaults, steps
 * and URL encoding for every lab input.
 *
 * Values are always stored in model units (probabilities as fractions in
 * [0, 1], counts as integers). `display: 'percent'` only tells form fields to
 * show `value × 100` with a "%" suffix.
 */

export interface NumberSpec {
  readonly min: number;
  readonly max: number;
  /** Grid spacing from `min`; also fixes the decimals written to the URL. */
  readonly step: number;
  readonly default: number;
  readonly display?: 'percent';
}

export type ParamSpecs = Readonly<Record<string, NumberSpec>>;

export type ParamValues<S extends ParamSpecs> = { -readonly [K in keyof S]: number };

export interface ParamSchema<S extends ParamSpecs = ParamSpecs> {
  readonly specs: S;
  /** Cross-field rules applied after each value is individually normalized. */
  readonly constrain?: (values: ParamValues<S>) => ParamValues<S>;
}

export function defineSchema<S extends ParamSpecs>(schema: ParamSchema<S>): ParamSchema<S> {
  return schema;
}

export function stepDecimals(step: number): number {
  const text = String(step);
  const exponent = /e-(\d+)$/.exec(text);
  if (exponent) return Number(exponent[1]);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}

/** Clamps to [min, max], snaps to the step grid, and removes float noise. */
export function normalizeValue(spec: NumberSpec, value: number): number {
  if (!Number.isFinite(value)) return spec.default;
  const clamped = Math.min(spec.max, Math.max(spec.min, value));
  const snapped = spec.min + Math.round((clamped - spec.min) / spec.step) * spec.step;
  const rounded = Number(snapped.toFixed(stepDecimals(spec.step)));
  return Math.min(spec.max, Math.max(spec.min, rounded));
}

const PLAIN_DECIMAL = /^-?\d+(\.\d+)?$/;

/**
 * Parses an untrusted URL value. Anything that is not a plain decimal
 * (empty, hex, exponent, "Infinity", …) falls back to the default; numbers
 * outside the bounds are clamped.
 */
export function parseValue(spec: NumberSpec, raw: string | null | undefined): number {
  const text = raw?.trim() ?? '';
  if (!PLAIN_DECIMAL.test(text)) return spec.default;
  return normalizeValue(spec, Number(text));
}

export function formatValueForUrl(spec: NumberSpec, value: number): string {
  return String(Number(normalizeValue(spec, value).toFixed(stepDecimals(spec.step))));
}

function specEntries<S extends ParamSpecs>(schema: ParamSchema<S>): [keyof S & string, NumberSpec][] {
  return Object.entries(schema.specs) as [keyof S & string, NumberSpec][];
}

export function defaultParams<S extends ParamSpecs>(schema: ParamSchema<S>): ParamValues<S> {
  const values = {} as ParamValues<S>;
  for (const [key, spec] of specEntries(schema)) values[key] = spec.default;
  return schema.constrain ? schema.constrain(values) : values;
}

export function normalizeParams<S extends ParamSpecs>(
  schema: ParamSchema<S>,
  values: Partial<Record<keyof S, number>>,
): ParamValues<S> {
  const result = {} as ParamValues<S>;
  for (const [key, spec] of specEntries(schema)) {
    const value = values[key];
    result[key] = value === undefined ? spec.default : normalizeValue(spec, value);
  }
  return schema.constrain ? schema.constrain(result) : result;
}

export function parseParams<S extends ParamSpecs>(schema: ParamSchema<S>, search: URLSearchParams): ParamValues<S> {
  const result = {} as ParamValues<S>;
  for (const [key, spec] of specEntries(schema)) result[key] = parseValue(spec, search.get(key));
  return schema.constrain ? schema.constrain(result) : result;
}

/** Entries in schema order, so equal states always produce identical URLs. */
export function serializeParams<S extends ParamSpecs>(schema: ParamSchema<S>, values: ParamValues<S>): [string, string][] {
  const normalized = normalizeParams(schema, values);
  return specEntries(schema).map(([key, spec]) => [key, formatValueForUrl(spec, normalized[key])]);
}

export function paramsEqual<S extends ParamSpecs>(schema: ParamSchema<S>, a: ParamValues<S>, b: ParamValues<S>): boolean {
  return specEntries(schema).every(([key]) => a[key] === b[key]);
}

/**
 * Kernel-side guard. Kernels receive normalized params from the URL layer,
 * but they are public pure functions and must fail loudly on impossible input
 * rather than return plausible-looking numbers.
 */
export function assertInRange(name: string, value: number, min: number, max: number, integer = false): void {
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    const kind = integer ? 'an integer' : 'a number';
    throw new RangeError(`${name} must be ${kind} in [${min}, ${max}]; received ${value}`);
  }
}
