/**
 * Offline render of the round 6 orchestral sketches (node, on the PC): `npm run music:orch [-- pursuit ...]`
 * (scripts/music/render-orch.mjs bundles and runs this). Needs the CC0 samples first:
 * `node scripts/music/fetch-samples.mjs orch-samples.json orch`. Writes padded WAVs to `.music-cache/orch-out` and
 * MP3 stems (Windows Media Foundation) plus `orch.json` to `src/assets/music/orch`.
 *
 * Each file holds the loop with PAD seconds of its own wrap on each side; the player loops [PAD, PAD + loop), so the
 * MP3 encoder's delay never lands on the seam and all stems stay in sync. `--check` prints measured pitches instead.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodeWav } from '../../music/wav';
import { addInto, detectPitch, peakOf, RATE, scale, secs, type Stereo } from '../../music/render/canvas';
import { reverbWet } from '../../music/render/fx';
import { db, loudness, sum } from '../../music/render/kit';
import { Bank } from './bank';
import { PIECES, renderPiece, STEMS, type StemId } from './pieces';

const PAD = 0.5;
const KBPS = 128;
/** Loudness of the full mix (gated, K-weighted; see `loudness`) and its peak ceiling. */
const TARGET = -16;
const PEAK = 0.89;

const root = process.cwd();
const bank = Bank.load(root, join(root, 'scripts', 'music', 'orch-samples.json'));
bank.tune('timp');
bank.tune('timpRoll');

if (process.argv.includes('--check')) {
  for (const inst of ['celloSpic', 'celloSus', 'violinSus', 'hornSus', 'tbnSus', 'tubaSus', 'bassSpic', 'organLoud', 'organQuiet', 'timp']) {
    const zs = bank.zones(inst);
    const pickN = [zs[0]!, zs[Math.floor(zs.length / 2)]!, zs[zs.length - 1]!];
    for (const z of pickN) {
      const s = bank.src(z);
      const hz = detectPitch(s.mono, 25, 1500);
      const meas = hz ? 69 + 12 * Math.log2(hz / 440) : NaN;
      console.info(`${inst.padEnd(10)} ${z.id.padEnd(48)} assumed ${z.midi.toFixed(1).padStart(6)} measured ${meas.toFixed(1).padStart(6)}`);
    }
  }
  process.exit(0);
}

/** Per stem: reverb (a big hall) and how much of it. */
const ROOM: Record<StemId, { rt60: number; wet: number; damp: number }> = {
  strings: { rt60: 2.6, wet: 0.32, damp: 7000 },
  brass: { rt60: 3.0, wet: 0.36, damp: 5500 },
  organ: { rt60: 4.2, wet: 0.4, damp: 5000 },
  perc: { rt60: 2.4, wet: 0.3, damp: 6000 },
};

/** Section balance on top of the written dynamics (dB): big drums are central to this style. */
const TRIM: Record<StemId, number> = { strings: 0, brass: 0, organ: 0, perc: 5 };

function withRoom(x: Stereo, id: StemId): Stereo {
  const r = ROOM[id];
  const wet = reverbWet(x, { rt60: r.rt60, damp: r.damp, size: 3, predelay: 0.025, hp: 120 });
  const out: Stereo = { l: x.l.slice(), r: x.r.slice() };
  addInto(out, wet, r.wet);
  return out;
}

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

const outDir = join(root, 'src', 'assets', 'music', 'orch');
const wavDir = join(root, '.music-cache', 'orch-out');
mkdirSync(outDir, { recursive: true });
mkdirSync(wavDir, { recursive: true });
const manifestPath = join(outDir, 'orch.json');

interface Entry {
  id: string;
  name: string;
  about: string;
  bpm: number;
  bars: number;
  loop: number;
  stems: Partial<Record<StemId, { file: string; bytes: number }>>;
  loudness: number;
  peak: number;
}
let previous: Entry[] = [];
try {
  previous = (JSON.parse(readFileSync(manifestPath, 'utf8')) as { pieces: Entry[] }).pieces;
} catch {
  // first render
}
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const entries: Entry[] = [];
for (const meta of PIECES) {
  if (only.length && !only.includes(meta.id)) {
    const old = previous.find((e) => e.id === meta.id);
    if (old) entries.push(old);
    continue;
  }
  const t0 = performance.now();
  const piece = renderPiece(bank, meta);
  const stems = {} as Record<StemId, Stereo>;
  for (const id of STEMS) {
    stems[id] = withRoom(piece.stems[id], id);
    scale(stems[id], Math.pow(10, TRIM[id] / 20));
  }
  // one gain for every stem, so the orchestra's balance is kept: the full mix hits TARGET, peaks stay under PEAK
  const mix = sum(...STEMS.map((id): [Stereo, number] => [stems[id], 1]));
  let g = Math.pow(10, (TARGET - loudness(mix)) / 20);
  g = Math.min(g, PEAK / peakOf(mix));
  for (const id of STEMS) scale(stems[id], g);
  const full = sum(...STEMS.map((id): [Stereo, number] => [stems[id], 1]));
  const pairs: string[] = [];
  const files: Entry['stems'] = {};
  // a section the piece never uses gets no file
  const used = STEMS.filter((id) => peakOf(stems[id]) > 1e-4);
  for (const id of used) {
    const name = `${meta.id}-${id}`;
    const wav = join(wavDir, `${name}.wav`);
    writeFileSync(wav, encodeWav(padded(stems[id]), RATE));
    pairs.push(wav, join(outDir, `${name}.mp3`));
    files[id] = { file: `${name}.mp3`, bytes: 0 };
  }
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'scripts', 'music', 'encode-mp3.ps1'), '-Kbps', String(KBPS), ...pairs], {
    stdio: 'inherit',
  });
  for (const id of used) files[id]!.bytes = statSync(join(outDir, files[id]!.file)).size;
  const loop = (meta.bars * 4 * 60) / meta.bpm;
  const e: Entry = { id: meta.id, name: meta.name, about: meta.about, bpm: meta.bpm, bars: meta.bars, loop, stems: files, loudness: Math.round(loudness(full) * 10) / 10, peak: Math.round(db(peakOf(full)) * 10) / 10 };
  entries.push(e);
  console.info(`${meta.name}: ${loop.toFixed(1)} s, loudness ${e.loudness} dB, peak ${e.peak} dBFS, ${((performance.now() - t0) / 1000).toFixed(1)} s`);
}
const order = PIECES.map((p) => p.id);
entries.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
writeFileSync(manifestPath, JSON.stringify({ pad: PAD, kbps: KBPS, pieces: entries }, null, 1) + '\n');
const total = entries.reduce((a, e) => a + Object.values(e.stems).reduce((b, f) => b + (f?.bytes ?? 0), 0), 0);
console.info(`total ${(total / 1e6).toFixed(2)} MB`);
