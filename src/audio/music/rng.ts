/**
 * Seeded random numbers for the score. One seed renders the same library and the same pattern sequence every time.
 * mulberry32 core; `fork(label)` makes an independent sub-stream (library / patterns / calm) from the same seed.
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0;
  }

  /** Uniform in [0, 1). */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  /** Integer in [0, n). */
  int(n: number): number {
    return Math.floor(this.next() * n);
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Symmetric jitter: 1 +- frac. */
  jitter(frac: number): number {
    return 1 + (this.next() * 2 - 1) * frac;
  }

  /** Log-uniform in [a, b] (a, b > 0). */
  logRange(a: number, b: number): number {
    return a * Math.pow(b / a, this.next());
  }

  pick<T>(arr: readonly T[]): T {
    return arr[this.int(arr.length)]!;
  }

  /** Independent stream: the same (seed, label) always gives the same sequence. */
  fork(label: string): Rng {
    return new Rng(hashString(label) ^ this.s);
  }

  /** The state, for tests. */
  get state(): number {
    return this.s;
  }
}

export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** The three named streams of a score seed. */
export function scoreStreams(seed: number): { library: Rng; patterns: Rng; calm: Rng } {
  const base = new Rng(seed);
  return { library: base.fork('library'), patterns: base.fork('patterns'), calm: base.fork('calm') };
}
