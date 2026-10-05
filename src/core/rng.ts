/** Small deterministic PRNG (mulberry32). Returns floats in [0, 1). */
export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng: () => number, lo: number, hi: number): number {
  return lo + (hi - lo) * rng();
}

export function randInt(rng: () => number, lo: number, hiInclusive: number): number {
  return lo + Math.floor(rng() * (hiInclusive - lo + 1));
}

export function pickOne<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)]!;
}
