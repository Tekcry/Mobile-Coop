/**
 * Offline stem render (node, on the PC): `npm run music:render` (scripts/music/render.mjs bundles and runs this).
 * Loads the CC0 samples from `.music-cache/samples`, renders each sketch's stems, levels them as a stack, writes
 * padded WAVs to `.music-cache/out` and MP3s (Windows Media Foundation) to `src/assets/music/sketches`, plus a manifest.
 *
 * Each file holds the loop with PAD seconds of its own wrap on each side: [end of loop][loop][start of loop]. The
 * player loops [PAD, PAD + loop). Any encoder delay shorter than PAD only shifts the phase of a seamless loop, and
 * every stem shares it, so the stems stay in sync.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { biquad } from '../dsp';
import { encodeWav, levels } from '../wav';
import { makeSrc, peakOf, RATE, scale, secs, type Src, type Stereo } from './canvas';
import { db, loudness, sum } from './kit';
import { loopSeconds, renderSketch, ROOTS, SKETCHES, STEM_IDS, type SketchId, type StemId } from './sketches';
import { readWav } from './wavRead';

export const PAD = 0.5;
export const KBPS = 128;
/** Stack targets (gated K-weighted dB, see `loudness`): calm alone, calm + caution, all three. Peaks of the full stack stay under PEAK. */
const TARGET = { calm: -30, caution: -24, alert: -18 };
const PEAK = 0.7;

const root = process.cwd();
const sampleDir = join(root, '.music-cache', 'samples');
const wavDir = join(root, '.music-cache', 'out');
const outDir = join(root, 'src', 'assets', 'music', 'sketches');
mkdirSync(wavDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const cache = new Map<string, Src>();
const bank = (id: string): Src => {
  let s = cache.get(id);
  if (!s) {
    const w = readWav(readFileSync(join(sampleDir, `${id}.wav`)));
    s = makeSrc(id, w.channels, w.rate, ROOTS[id] ?? 0);
    cache.set(id, s);
  }
  return s;
};

function padded(s: Stereo): Float32Array[] {
  const n = s.l.length;
  const p = secs(PAD);
  return [s.l, s.r].map((ch) => {
    const o = new Float32Array(n + 2 * p);
    o.set(ch.subarray(n - p), 0);
    o.set(ch, p);
    o.set(ch.subarray(0, p), n + p);
    return o;
  });
}

/** Scale the stems so the stack hits the targets (searched, since stems share material and are not uncorrelated), then pull all down if the peak is high. */
function levelStack(st: Record<StemId, Stereo>): Record<StemId, number> {
  const T = { calm: Math.pow(10, TARGET.calm / 20), caution: Math.pow(10, TARGET.caution / 20), alert: Math.pow(10, TARGET.alert / 20) };
  const gc = T.calm / Math.pow(10, loudness(st.calm) / 20);
  const solve = (fixed: [Stereo, number][], s: Stereo, target: number): number => {
    let lo = 0;
    let hi = (8 * target) / Math.pow(10, loudness(s) / 20);
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (Math.pow(10, loudness(sum(...fixed, [s, mid])) / 20) < target) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  };
  const gk = solve([[st.calm, gc]], st.caution, T.caution);
  const ga = solve([[st.calm, gc], [st.caution, gk]], st.alert, T.alert);
  const peak = peakOf(sum([st.calm, gc], [st.caution, gk], [st.alert, ga]));
  const k = Math.min(1, PEAK / peak);
  return { calm: gc * k, caution: gk * k, alert: ga * k };
}

/** Share of energy per band (sub, low, mid, presence, air), to check the mix stays dark and has its low end. */
function bands(x: Stereo): string {
  const m = new Float32Array(x.l.length);
  for (let i = 0; i < m.length; i++) m[i] = (x.l[i]! + x.r[i]!) * 0.5;
  const e = (lo: number, hi: number): number => {
    const b = m.slice();
    if (lo) biquad(b, 'highpass', lo, 0.707, RATE);
    if (hi) biquad(b, 'lowpass', hi, 0.707, RATE);
    let a = 0;
    for (let i = 0; i < b.length; i++) a += b[i]! * b[i]!;
    return a;
  };
  const parts = [e(0, 60), e(60, 250), e(250, 2000), e(2000, 6000), e(6000, 0)];
  const tot = parts.reduce((a, b) => a + b, 0) || 1;
  return ['sub', 'low', 'mid', 'pres', 'air'].map((k, i) => `${k} ${Math.round((100 * parts[i]!) / tot)}%`).join(' ');
}

const only = process.argv.slice(2).filter((a) => /^[ABC]$/.test(a)) as SketchId[];
const manifestPath = join(outDir, 'sketches.json');
interface StemMeta {
  file: string;
  bytes: number;
}
interface Entry {
  id: SketchId;
  name: string;
  bpm: number;
  bars: number;
  loop: number;
  about: string;
  stems: Record<StemId, StemMeta>;
  stack: { calm: number; caution: number; alert: number; peak: number };
}
let previous: Entry[] = [];
try {
  previous = (JSON.parse(readFileSync(manifestPath, 'utf8')) as { sketches: Entry[] }).sketches;
} catch {
  // first render: no manifest yet
}
const entries: Entry[] = [];
for (const meta of SKETCHES) {
  if (only.length && !only.includes(meta.id)) {
    const old = previous.find((e) => e.id === meta.id);
    if (old) entries.push(old);
    continue;
  }
  const t0 = performance.now();
  const r = renderSketch(meta.id, bank, 1);
  const g = levelStack(r.stems);
  for (const s of STEM_IDS) scale(r.stems[s], g[s]);
  const lv = (x: Stereo): number => Math.round(loudness(x) * 10) / 10;
  const stack = {
    calm: lv(r.stems.calm),
    caution: lv(sum([r.stems.calm, 1], [r.stems.caution, 1])),
    alert: lv(sum([r.stems.calm, 1], [r.stems.caution, 1], [r.stems.alert, 1])),
    peak: Math.round(db(peakOf(sum([r.stems.calm, 1], [r.stems.caution, 1], [r.stems.alert, 1]))) * 10) / 10,
  };
  const pairs: string[] = [];
  const stems = {} as Record<StemId, StemMeta>;
  for (const s of STEM_IDS) {
    const name = `${meta.id}-${s}`;
    const wav = join(wavDir, `${name}.wav`);
    writeFileSync(wav, encodeWav(padded(r.stems[s]), RATE));
    pairs.push(wav, join(outDir, `${name}.mp3`));
    stems[s] = { file: `${name}.mp3`, bytes: 0 };
    const l = levels([r.stems[s].l, r.stems[s].r]);
    console.info(`  ${name.padEnd(10)} peak ${l.peakDb.toFixed(1)} dBFS  RMS ${l.rmsDb.toFixed(1)} dBFS  ${bands(r.stems[s])}`);
  }
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'scripts', 'music', 'encode-mp3.ps1'), '-Kbps', String(KBPS), ...pairs], { stdio: 'inherit' });
  for (const s of STEM_IDS) stems[s].bytes = statSync(join(outDir, stems[s].file)).size;
  entries.push({ id: meta.id, name: meta.name, bpm: meta.bpm, bars: meta.bars, loop: loopSeconds(meta), about: meta.about, stems, stack });
  console.info(`  ${meta.id} full stack ${bands(sum([r.stems.calm, 1], [r.stems.caution, 1], [r.stems.alert, 1]))}`);
  console.info(`${meta.id} ${meta.name}: stack loudness calm ${stack.calm.toFixed(1)} / +caution ${stack.caution.toFixed(1)} / +alert ${stack.alert.toFixed(1)} dB, peak ${stack.peak.toFixed(1)} dBFS, ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}
entries.sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(manifestPath, JSON.stringify({ pad: PAD, kbps: KBPS, sketches: entries }, null, 1) + '\n');
const total = entries.reduce((a, e) => a + STEM_IDS.reduce((b, s) => b + e.stems[s].bytes, 0), 0);
const minutes = entries.reduce((a, e) => a + (3 * (e.loop + 2 * PAD)) / 60, 0);
console.info(`total ${(total / 1e6).toFixed(2)} MB for ${minutes.toFixed(1)} stem-minutes = ${(total / 1e6 / minutes).toFixed(2)} MB per minute (stereo MP3 ${KBPS} kbps)`);
