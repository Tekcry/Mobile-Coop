/**
 * Offline weapon sprite render (node, on the PC): `npm run sfx:render-weapons` (scripts/sfx/render-weapons.mjs bundles
 * and runs this). Needs the recordings first (`npm run sfx:fetch-weapons`). Cuts the shots out of the CC0 firearm
 * library, makes the suppressed shots, cuts the handling takes, models the brass and the crossbow, lays it all out as
 * one mono sprite and writes the WAV to `.sfx-cache/weapons.wav`, the MP3 (Windows Media Foundation) to
 * `src/assets/sfx/weapons.mp3` and the index to `src/assets/sfx/weapons.json`. Deterministic (seeded).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodeWav } from '../../music/wav';
import { Rng } from '../../music/rng';
import { dedupe, layout, normalize, peakOf } from '../../foley/render/process';
import { CASE_FLOORS, CASE_KINDS, firstAbove, SD_BANKS, SHOT_SOURCES, WEAPON_BANKS, type Take, type WeaponBank, type WeaponIndex } from '../sprite';
import { bow, CASE_SPECS, casing, cut, levelBank, pickShots, RATE, readWav, resample, SD_SPECS, suppress } from './dsp';

const KBPS = 96;
/** Shots: the mean body (first 150 ms) RMS of every bank (dB), and the highest peak allowed. */
const SHOT_RMS = -15;
const SHOT_PEAK = 0.97;
/** Suppressed shots are levelled like the open ones reach (their peaks limit them), so `WEAPON_MIX.sd` is the real drop. */
const SD_RMS = -20;
/** Handling and brass, levelled by their body RMS (dB). */
const MECH_RMS = -20;
const CASE_RMS = -22;
/** Most takes kept per shot bank. */
const MAX_TAKES = 5;
const NEAR_MAX = 0.85;
const FAR_MAX = 1.0;

interface Sources {
  shots: Record<string, { dir: string; near: [string, boolean][]; far: [string, boolean][] }>;
  sd: Record<string, { from: string[]; mech: 'slideFwd' | 'bolt' }>;
  mech: Record<string, [string, number, number][]>;
}
const root = process.cwd();
const src = JSON.parse(readFileSync(join(root, 'scripts', 'sfx', 'weapon-sources.json'), 'utf8')) as Sources;
const cache = join(root, '.sfx-cache', 'weapons');
const lib = join(cache, 'lib', 'Prepared SFX Library');
const outDir = join(root, 'src', 'assets', 'sfx');
mkdirSync(outDir, { recursive: true });
const rng = new Rng(0x9e57);

const wavCache = new Map<string, Float32Array>();
function load(path: string): Float32Array {
  let s = wavCache.get(path);
  if (!s) {
    const w = readWav(readFileSync(path));
    s = resample(w.s, w.rate, RATE);
    wavCache.set(path, s);
  }
  return s;
}

const takes = new Map<WeaponBank, Float32Array[]>();
const add = (b: WeaponBank, t: Float32Array): void => {
  const l = takes.get(b) ?? [];
  l.push(t);
  takes.set(b, l);
};

// ---- shots, near and far
for (const id of SHOT_SOURCES) {
  const spec = src.shots[id];
  if (!spec) throw new Error(`weapon-sources.json: no shots for ${id}`);
  for (const [far, files] of [
    [false, spec.near],
    [true, spec.far],
  ] as const) {
    const bank = (far ? `${id}Far` : id) as WeaponBank;
    const got: Float32Array[] = [];
    for (const [file, burst] of files) {
      const s = load(join(lib, spec.dir, `${file}.wav`));
      for (const [a, b] of pickShots(s, RATE, burst, far ? FAR_MAX : NEAR_MAX)) {
        const t = cut(s, RATE, a, b, far ? 0.3 : 0.2);
        if (t.length > RATE * 0.12) got.push(t);
      }
    }
    // the single-shot file's takes first (cleanest), then the bursts' last rounds
    const kept = dedupe(got).slice(0, MAX_TAKES);
    levelBank(kept, RATE, SHOT_RMS, SHOT_PEAK);
    for (const t of kept) add(bank, t);
  }
}

// ---- handling
function slice(file: string, a: number, b: number): Float32Array {
  const s = load(join(cache, file));
  const t = cut(s, RATE, a, b, 0.03);
  normalize(t, 0.8);
  return t;
}
for (const [bank, parts] of Object.entries(src.mech)) {
  const got = parts.map(([file, a, b]) => slice(file, a, b));
  // by level, not peak: a slide slam and a magazine seat should sit together
  levelBank(got, RATE, MECH_RMS, 0.9);
  for (const t of got) add(bank as WeaponBank, t);
}

// ---- suppressed shots from the near takes
const clackSlide = takes.get('slideFwd')![0]!.slice(0, Math.round(0.07 * RATE));
const clackBolt = resample(takes.get('rifleMagIn')![1]!.slice(Math.round(0.06 * RATE), Math.round(0.16 * RATE)), RATE, RATE * 0.85).slice();
for (const b of SD_BANKS) {
  const spec = src.sd[b]!;
  const got: Float32Array[] = [];
  for (const from of spec.from) {
    for (const shot of (takes.get(from as WeaponBank) ?? []).slice(0, 2)) got.push(suppress(shot, spec.mech === 'bolt' ? clackBolt : clackSlide, SD_SPECS[b], rng));
  }
  levelBank(got, RATE, SD_RMS, SHOT_PEAK);
  for (const t of got) add(b, t);
}

// ---- brass and shells, three drops per kind and floor
for (const k of CASE_KINDS) {
  for (const f of CASE_FLOORS) {
    for (let i = 0; i < 3; i++) {
      const c = casing(CASE_SPECS[k], f, rng);
      // by level, so a shell's dull knock and brass's ring land at the same loudness
      levelBank([c], RATE, CASE_RMS, 0.9);
      add(`case_${k}_${f}`, c);
    }
  }
}
for (let i = 0; i < 3; i++) {
  const b = bow(rng);
  normalize(b, 0.85);
  add('bow', b);
}

// ---- one sprite in bank order (the 1911's first shot opens it: its sharp onset is the alignment mark)
const order: { bank: WeaponBank; take: Float32Array }[] = [];
for (const b of WEAPON_BANKS) for (const t of takes.get(b) ?? []) order.push({ bank: b, take: t });
const { buf, at } = layout(
  order.map((o) => o.take),
  RATE,
  0.1,
  0.05,
);
const banks = Object.fromEntries(WEAPON_BANKS.map((b) => [b, [] as Take[]])) as Record<WeaponBank, Take[]>;
order.forEach((o, i) => banks[o.bank].push(at[i]!));
const index: WeaponIndex = { rate: RATE, mark: Math.round(firstAbove(buf, RATE) * 1e5) / 1e5, length: Math.round((buf.length / RATE) * 1e3) / 1e3, banks };
const wav = join(root, '.sfx-cache', 'weapons.wav');
writeFileSync(wav, encodeWav([buf], RATE));
const mp3 = join(outDir, 'weapons.mp3');
execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'scripts', 'music', 'encode-mp3.ps1'), '-Kbps', String(KBPS), wav, mp3], { stdio: 'inherit' });
writeFileSync(join(outDir, 'weapons.json'), JSON.stringify(index) + '\n');
const line: string[] = [];
for (const b of WEAPON_BANKS) line.push(`${b} ${banks[b].length}`);
console.info(line.join(', '));
console.info(`weapon sprite: ${order.length} takes, ${index.length.toFixed(2)} s, peak ${peakOf(buf).toFixed(2)}, ${(statSync(mp3).size / 1024).toFixed(0)} KB (MP3 ${KBPS} kbps)`);
