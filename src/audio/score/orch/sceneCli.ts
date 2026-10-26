/**
 * Offline render of the scene music prototypes (node, on the PC): `npm run music:scene [-- intro1 mission2 ...]`
 * (scripts/music/render-scene.mjs bundles and runs this). Needs the CC0 samples first:
 * `node scripts/music/fetch-samples.mjs orch-samples.json orch` and `node scripts/music/fetch-samples.mjs`.
 *
 * Mastering: the mix is measured with ffmpeg (EBU R128, integrated loudness and true peak), brought to -16 LUFS, a
 * look-ahead peak limiter holds the peaks under the ceiling, and ffmpeg encodes 192 kb/s MP3, which is measured again.
 * Writes `<out>/<file>.mp3` (default `scratch/music/real` next to the repo folder; `--out <dir>` to change it).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { setPriority, constants } from 'node:os';
import { encodeWav } from '../../music/wav';
import { RATE, secs, type Stereo } from '../../music/render/canvas';
import { Bank, type SampleEntry } from './bank';
import { mixdown, Scene, SCENE_PIECES } from './scenePieces';

const TARGET = -16;
/** Sample-peak ceiling before encoding (dBFS); the MP3's true peak is checked against -1 dBTP after. */
const CEILING_DB = -1.8;
/** Share of the time the limiter took more than 1 dB (last call). */
let limiterBusy = 0;

try {
  setPriority(0, constants.priority.PRIORITY_BELOW_NORMAL);
} catch {
  // not allowed: render at normal priority
}

const root = process.cwd();
const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const outDir = outArg >= 0 ? resolve(args[outArg + 1]!) : resolve(root, '..', 'scratch', 'music', 'real');
const only = args.filter((a, i) => !a.startsWith('-') && (outArg < 0 || i !== outArg + 1));
const wavDir = join(root, '.music-cache', 'scene-out');
mkdirSync(outDir, { recursive: true });
mkdirSync(wavDir, { recursive: true });

const bank = Bank.load(root, join(root, 'scripts', 'music', 'orch-samples.json'));
bank.tune('timp');
bank.tune('timpRoll');
const kitManifest = JSON.parse(readFileSync(join(root, 'scripts', 'music', 'samples.json'), 'utf8')) as { samples: { id: string; path: string }[] };
const kit = new Bank(
  join(root, '.music-cache', 'samples'),
  kitManifest.samples.map((x): SampleEntry => ({ id: x.id, inst: x.id, path: x.path, midi: null })),
);

interface R128 {
  i: number;
  tp: number;
  lra: number;
}
function parseR128(text: string): R128 {
  const sum = text.slice(text.lastIndexOf('Summary:'));
  const num = (re: RegExp): number => Number(re.exec(sum)?.[1] ?? NaN);
  return { i: num(/I:\s+(-?[\d.]+) LUFS/), tp: num(/Peak:\s+(-?[\d.]+) dBFS/), lra: num(/LRA:\s+(-?[\d.]+) LU/) };
}
/** EBU R128 integrated loudness and true peak of a file (ffmpeg prints its summary on stderr). */
function r128(file: string): R128 {
  const res = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' });
  return parseR128(res.stderr);
}

/** Look-ahead peak limiter: gain never above what keeps |x| <= ceiling, ramped in over the look-ahead, released slowly. */
function limit(x: Stereo, ceiling: number): number {
  const n = x.l.length;
  const look = secs(0.004);
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const a = Math.max(Math.abs(x.l[i]!), Math.abs(x.r[i]!));
    need[i] = a > ceiling ? ceiling / a : 1;
  }
  // forward minimum over the look-ahead window
  const fmin = new Float32Array(n);
  const dq: number[] = [];
  let head = 0;
  for (let i = n - 1; i >= 0; i--) {
    while (dq.length > head && need[dq[dq.length - 1]!]! >= need[i]!) dq.pop();
    dq.push(i);
    while (dq[head]! > i + look - 1) head++;
    fmin[i] = need[dq[head]!]!;
  }
  // average over the window (so the gain ramps in before the peak), then a slow release
  const rel = Math.exp(-1 / (0.12 * RATE));
  let acc = 0;
  let g = 1;
  let most = 1;
  let busy = 0;
  for (let i = 0; i < n; i++) {
    acc += fmin[i]!;
    if (i >= look) acc -= fmin[i - look]!;
    const avg = acc / Math.min(i + 1, look);
    const target = Math.min(avg, fmin[i]!);
    g = target < g ? target : 1 - (1 - g) * rel;
    if (g > target) g = target;
    most = Math.min(most, g);
    if (g < 0.891) busy++;
    x.l[i]! *= g;
    x.r[i]! *= g;
  }
  limiterBusy = busy / n;
  return 20 * Math.log10(most);
}

function trimAndFade(x: Stereo, length: number, fade: [number, number]): Stereo {
  const n = secs(length);
  const out = { l: x.l.slice(0, n), r: x.r.slice(0, n) };
  const a = secs(fade[0]);
  const b = Math.min(n, secs(fade[1]));
  for (let i = a; i < n; i++) {
    const u = i >= b ? 1 : (i - a) / (b - a);
    const g = i >= b ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * u);
    out.l[i]! *= g;
    out.r[i]! *= g;
  }
  const fi = secs(0.01);
  for (let i = 0; i < fi; i++) {
    out.l[i]! *= i / fi;
    out.r[i]! *= i / fi;
  }
  return out;
}

function peakDb(x: Stereo): number {
  let p = 0;
  for (let i = 0; i < x.l.length; i++) p = Math.max(p, Math.abs(x.l[i]!), Math.abs(x.r[i]!));
  return 20 * Math.log10(p);
}

for (const piece of SCENE_PIECES) {
  if (only.length && !only.includes(piece.id)) continue;
  const t0 = performance.now();
  const s = new Scene(bank, kit, piece.length + 32, piece.bpm, piece.t0, 0x5ce7e + piece.id.length * 977);
  piece.render(s);
  const mixed = trimAndFade(mixdown(s, piece.levels), piece.length, piece.fade);
  if (args.includes('--stems')) {
    // each section after its hall, for checking (not mastered)
    for (const [g, x] of Object.entries(s.c)) writeFileSync(join(wavDir, `${piece.file}-${g}.wav`), encodeWav([x.l, x.r], RATE));
  }
  // measure at a safe level, then set the loudness
  const pre = peakDb(mixed);
  const k0 = Math.pow(10, (-6 - pre) / 20);
  for (let i = 0; i < mixed.l.length; i++) {
    mixed.l[i]! *= k0;
    mixed.r[i]! *= k0;
  }
  const probe = join(wavDir, `${piece.file}-probe.wav`);
  writeFileSync(probe, encodeWav([mixed.l, mixed.r], RATE));
  const m0 = r128(probe);
  let gainDb = TARGET - m0.i;
  let final: R128 = m0;
  let gr = 0;
  const mp3 = join(outDir, `${piece.file}.mp3`);
  for (let pass = 0; pass < 3; pass++) {
    const x: Stereo = { l: mixed.l.slice(), r: mixed.r.slice() };
    const k = Math.pow(10, gainDb / 20);
    for (let i = 0; i < x.l.length; i++) {
      x.l[i]! *= k;
      x.r[i]! *= k;
    }
    gr = limit(x, Math.pow(10, CEILING_DB / 20));
    const wav = join(wavDir, `${piece.file}.wav`);
    writeFileSync(wav, encodeWav([x.l, x.r], RATE));
    execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '192k', '-ar', String(RATE), mp3]);
    final = r128(mp3);
    if (Math.abs(final.i - TARGET) < 0.3 && final.tp < -1) break;
    gainDb += TARGET - final.i;
  }
  const secsTaken = ((performance.now() - t0) / 1000).toFixed(0);
  if (s.stretched.size) console.info(`  stretched notes: ${[...s.stretched].map(([k, v]) => `${k} (${v})`).join(', ')}`);
  console.info(`${piece.file}.mp3: ${final.i} LUFS, true peak ${final.tp} dBTP, LRA ${final.lra} LU, limiter at most ${gr.toFixed(1)} dB (over 1 dB for ${(limiterBusy * 100).toFixed(1)} % of the time), ${secsTaken} s`);
}
