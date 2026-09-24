/**
 * Seeded pseudo-random numbers.
 *
 * A seed is a short URL-safe string. It is hashed with cyrb128 into four
 * 32-bit words that initialise an sfc32 generator. Both algorithms are public
 * domain, fast, and have no dependencies.
 *
 * Reproducibility contract: the same seed must always yield the same stream.
 * Changing the hash, the generator, the warm-up, or the order in which a
 * kernel consumes numbers invalidates every previously shared URL; golden
 * tests in `random.test.ts` and the feature tests guard this.
 */

/** Uniform number in [0, 1). */
export type Rng = () => number;

export const SEED_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

export function isValidSeed(value: unknown): value is string {
  return typeof value === 'string' && SEED_PATTERN.test(value);
}

function cyrb128(text: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

const WARM_UP_DRAWS = 15;

/** Creates an independent generator for `seed`. Throws on an invalid seed. */
export function createRng(seed: string): Rng {
  if (!isValidSeed(seed)) {
    throw new RangeError(`Invalid seed: ${JSON.stringify(seed)}`);
  }
  let [a, b, c, d] = cyrb128(seed);
  const next: Rng = () => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  for (let i = 0; i < WARM_UP_DRAWS; i++) next();
  return next;
}

const SEED_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
const GENERATED_SEED_LENGTH = 8;

/** Fresh, non-deterministic seed for a new run (uses Web Crypto). */
export function generateSeed(): string {
  const words = new Uint32Array(GENERATED_SEED_LENGTH);
  crypto.getRandomValues(words);
  let seed = '';
  for (const word of words) seed += SEED_ALPHABET[word % SEED_ALPHABET.length];
  return seed;
}
