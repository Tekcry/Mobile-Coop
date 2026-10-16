/**
 * Offline cutting of the foley takes (pure, run by `npm run sfx:render`): trim each recording to its sound, split a
 * boot step into heel and toe, level it, drop exact duplicates and lay everything out as one sprite.
 */

/** Peak magnitude. */
export function peakOf(s: ArrayLike<number>): number {
  let p = 0;
  for (let i = 0; i < s.length; i++) {
    const v = Math.abs(s[i]!);
    if (v > p) p = v;
  }
  return p;
}

/** Peak envelope in `hop`-sample frames. */
export function envelope(s: ArrayLike<number>, hop: number): Float32Array {
  const n = Math.floor(s.length / hop);
  const out = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    let m = 0;
    for (let i = k * hop; i < (k + 1) * hop; i++) m = Math.max(m, Math.abs(s[i]!));
    out[k] = m;
  }
  return out;
}

/**
 * Transient onsets (s): a 5 ms frame above `minRel` of the peak that jumps `rise` times over the 20 ms before it, at
 * least `minGap` s after the previous onset.
 */
export function onsets(s: ArrayLike<number>, rate: number, minRel = 0.15, rise = 2.2, minGap = 0.03): number[] {
  const hop = Math.max(1, Math.round(rate * 0.005));
  const env = envelope(s, hop);
  const peak = peakOf(s);
  const out: number[] = [];
  for (let k = 0; k < env.length; k++) {
    let prev = 0;
    for (let q = Math.max(0, k - 4); q < k; q++) prev = Math.max(prev, env[q]!);
    const t = (k * hop) / rate;
    if (env[k]! > minRel * peak && env[k]! > rise * prev + 1e-4 && (out.length === 0 || t - out[out.length - 1]! >= minGap)) out.push(t);
  }
  return out;
}

/** Fade the last `fade` s out (raised cosine) in place. */
export function fadeOut(s: Float32Array, rate: number, fade: number): void {
  const n = Math.min(s.length, Math.round(fade * rate));
  for (let i = 0; i < n; i++) {
    const k = s.length - n + i;
    s[k] = s[k]! * 0.5 * (1 + Math.cos((Math.PI * (i + 1)) / n));
  }
}

/** Fade the first `fade` s in (raised cosine) in place. */
export function fadeIn(s: Float32Array, rate: number, fade: number): void {
  const n = Math.min(s.length, Math.round(fade * rate));
  for (let i = 0; i < n; i++) s[i] = s[i]! * 0.5 * (1 - Math.cos((Math.PI * i) / n));
}

/**
 * Trim a recording to its sound: from 2 ms before the first sample over 2 % of the peak to where it falls below
 * -50 dB (at most `maxDur` s), with a short fade out so the cut never clicks.
 */
export function trim(s: Float32Array, rate: number, maxDur: number): Float32Array {
  const peak = peakOf(s);
  if (peak <= 0) return new Float32Array(0);
  let a = 0;
  while (a < s.length && Math.abs(s[a]!) < peak * 0.02) a++;
  a = Math.max(0, a - Math.round(rate * 0.002));
  const hop = Math.max(1, Math.round(rate * 0.005));
  const env = envelope(s, hop);
  let zk = env.length - 1;
  while (zk > 0 && env[zk]! < peak * 0.003) zk--;
  const end = Math.min(s.length, (zk + 1) * hop, a + Math.round(maxDur * rate));
  const out = s.slice(a, Math.max(a + 1, end));
  fadeOut(out, rate, Math.max(0.01, (out.length / rate) * 0.2));
  return out;
}

/**
 * A boot step recorded as heel then toe: split at the second onset (40-200 ms after the first) into two takes, each
 * faded at the cut. Null when the recording has one transient.
 */
export function splitHeelToe(s: Float32Array, rate: number): { heel: Float32Array; toe: Float32Array } | null {
  const on = onsets(s, rate);
  const first = on[0];
  const second = on.find((t) => first !== undefined && t - first >= 0.04 && t - first <= 0.2);
  if (first === undefined || second === undefined) return null;
  const cut = Math.round((second - 0.003) * rate);
  const heel = s.slice(0, cut);
  fadeOut(heel, rate, 0.012);
  const toe = s.slice(cut);
  fadeIn(toe, rate, 0.002);
  return { heel, toe };
}

/** Scale to the given peak, in place. */
export function normalize(s: Float32Array, peak: number): void {
  const p = peakOf(s);
  if (p <= 0) return;
  const k = peak / p;
  for (let i = 0; i < s.length; i++) s[i] = s[i]! * k;
}

/** True when two takes are the same recording (equal length and samples within 1e-4). */
export function sameTake(a: Float32Array, b: Float32Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i]! - b[i]!) > 1e-4) return false;
  return true;
}

/** Drop exact duplicates (some packs ship the same take twice under two names). */
export function dedupe(takes: Float32Array[]): Float32Array[] {
  const out: Float32Array[] = [];
  for (const t of takes) if (!out.some((o) => sameTake(o, t))) out.push(t);
  return out;
}

/**
 * Lay takes end to end after `lead` s of silence with `gap` s between them. Returns the buffer and each take's
 * [start, dur] (s), in order.
 */
export function layout(takes: Float32Array[], rate: number, lead = 0.1, gap = 0.08): { buf: Float32Array; at: [number, number][] } {
  const g = Math.round(gap * rate);
  let n = Math.round(lead * rate);
  const starts: number[] = [];
  for (const t of takes) {
    starts.push(n);
    n += t.length + g;
  }
  const buf = new Float32Array(n);
  takes.forEach((t, i) => buf.set(t, starts[i]!));
  const r4 = (x: number): number => Math.round(x * 1e5) / 1e5;
  return { buf, at: takes.map((t, i) => [r4(starts[i]! / rate), r4(t.length / rate)]) };
}
