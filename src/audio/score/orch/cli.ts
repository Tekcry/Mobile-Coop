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
import { HEAD_BARS, PIECES, renderPiece, type Kind, type PieceMeta } from './pieces';

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
  for (const inst of process.argv.includes('--new') ? ['piano', 'harp', 'clarinet'] : ['celloSpic', 'celloSus', 'violinSus', 'hornSus', 'tbnSus', 'tubaSus', 'bassSpic', 'organLoud', 'organQuiet', 'timp']) {
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

/** Per kind of layer: reverb (a big hall) and how much of it. */
const ROOM: Record<Kind, { rt60: number; wet: number; damp: number }> = {
  strings: { rt60: 2.6, wet: 0.32, damp: 7000 },
  brass: { rt60: 3.0, wet: 0.36, damp: 5500 },
  organ: { rt60: 4.2, wet: 0.4, damp: 5000 },
  perc: { rt60: 2.4, wet: 0.3, damp: 6000 },
};

/** Balance on top of the written dynamics (dB): big drums are central to this style. */
const TRIM: Record<Kind, number> = { strings: 0, brass: 0, organ: 0, perc: 5 };

function withRoom(x: Stereo, kind: Kind, wetOverride?: number): Stereo {
  const r = ROOM[kind];
  const wet = reverbWet(x, { rt60: r.rt60, damp: r.damp, size: 3, predelay: 0.025, hp: 120 });
  const out: Stereo = { l: x.l.slice(), r: x.r.slice() };
  addInto(out, wet, wetOverride ?? r.wet);
  scale(out, Math.pow(10, TRIM[kind] / 20));
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

// rendered audition audio is not committed (it is rebuilt from the samples with this command)
const outDir = join(root, 'src', 'assets', 'music', 'orch');
const wavDir = join(root, '.music-cache', 'orch-out');
mkdirSync(outDir, { recursive: true });
mkdirSync(wavDir, { recursive: true });
const manifestPath = join(outDir, 'orch.json');

interface LayerOut {
  id: string;
  name: string;
  kind: Kind;
  file: string;
  bytes: number;
  loudness: number;
  /** The clean opening (loops only): the first HEAD_BARS bars from silence, with PAD seconds of silence in front. */
  head?: string;
}
interface Entry {
  id: string;
  name: string;
  about: string;
  use: PieceMeta['use'];
  bpm: number;
  bars: number;
  loop: number;
  layers: LayerOut[];
  presets: PieceMeta['presets'];
  /** Length of each layer's clean opening (s), 0 for one-shots. */
  head: number;
  loudness: number;
  peak: number;
}
let previous: Entry[] = [];
try {
  previous = (JSON.parse(readFileSync(manifestPath, 'utf8')) as { pieces: Entry[] }).pieces ?? [];
} catch {
  // first render
}
const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const entries: Entry[] = [];

/**
 * The game's tracks (Michael, 2026-10-16): each is one piece mixed down with one of its presets into a single stereo
 * loop (and its clean opening), so the game plays one file per state instead of a dozen layers. Committed, unlike the
 * audition stems. Evasion shares Alert's gain (they crossfade on the same timeline).
 */
interface GameTrack {
  name: string;
  piece: string;
  preset: string;
  /** Loudness target (dB, gated); or `sameGainAs` another track. */
  target?: number;
  sameGainAs?: string;
}
const GAME: GameTrack[] = [
  { name: 'menu', piece: 'grandsoft', preset: 'Softer', target: -19 },
  { name: 'caution', piece: 'brokenpluck', preset: 'Cautious', target: -23 },
  { name: 'alert', piece: 'underfire', preset: 'Alert: hook forward', target: -16 },
  { name: 'evade', piece: 'underfire', preset: 'Evasion', sameGainAs: 'alert' },
  { name: 'spotted', piece: 'spotted', preset: 'Hit', target: -16 },
];
interface GameMix {
  gt: GameTrack;
  meta: PieceMeta;
  loop: Stereo;
  head: Stereo | null;
  headSec: number;
}
const gameMixes: GameMix[] = [];
for (const meta of PIECES) {
  if (only.length && !only.includes(meta.id)) {
    const old = previous.find((e) => e.id === meta.id);
    if (old) entries.push(old);
    continue;
  }
  const t0 = performance.now();
  const piece = renderPiece(bank, meta);
  const layers: Record<string, Stereo> = {};
  for (const l of meta.layers) layers[l.id] = withRoom(piece.layers[l.id]!, l.kind, l.wet);
  // the clean opening: the same piece rendered without wrapping (so its start has no tail of its own last bar)
  const loopPiece = meta.use !== 'shot';
  const headSec = loopPiece ? (HEAD_BARS * 4 * 60) / meta.bpm : 0;
  const heads: Record<string, Stereo> = {};
  if (loopPiece) {
    const lin = renderPiece(bank, meta, true);
    for (const l of meta.layers) {
      const wet = withRoom(lin.layers[l.id]!, l.kind, l.wet);
      const k = secs(headSec);
      heads[l.id] = { l: wet.l.slice(0, k), r: wet.r.slice(0, k) };
    }
  }
  // one gain for every layer, so the balance is kept: everything on hits TARGET, peaks stay under PEAK
  const all = sum(...meta.layers.map((l): [Stereo, number] => [layers[l.id]!, 1]));
  let g = Math.pow(10, ((meta.target ?? TARGET) - loudness(all)) / 20);
  g = Math.min(g, PEAK / peakOf(all));
  for (const l of meta.layers) {
    scale(layers[l.id]!, g);
    if (heads[l.id]) scale(heads[l.id]!, g);
  }
  const full = sum(...meta.layers.map((l): [Stereo, number] => [layers[l.id]!, 1]));
  for (const gt of GAME.filter((x) => x.piece === meta.id)) {
    const mix = meta.presets[gt.preset];
    if (!mix) throw new Error(`${meta.id} has no preset ${gt.preset}`);
    const loopMix = sum(...meta.layers.map((l): [Stereo, number] => [layers[l.id]!, mix[l.id] ?? 0]));
    const headMix = loopPiece ? sum(...meta.layers.map((l): [Stereo, number] => [heads[l.id]!, mix[l.id] ?? 0])) : null;
    gameMixes.push({ gt, meta, loop: loopMix, head: headMix, headSec });
  }
  const pairs: string[] = [];
  const outs: LayerOut[] = [];
  for (const l of meta.layers) {
    const name = `${meta.id}-${l.id}`;
    const wav = join(wavDir, `${name}.wav`);
    // loops carry PAD seconds of their own wrap on each side; a one-shot (the spotted hit) is written as it is
    writeFileSync(wav, encodeWav(meta.use === 'shot' ? [layers[l.id]!.l, layers[l.id]!.r] : padded(layers[l.id]!), RATE));
    pairs.push(wav, join(outDir, `${name}.mp3`));
    const out: LayerOut = { id: l.id, name: l.name, kind: l.kind, file: `${name}.mp3`, bytes: 0, loudness: Math.round(loudness(layers[l.id]!) * 10) / 10 };
    const h = heads[l.id];
    if (h) {
      // PAD seconds of silence in front, like the loops, so both files share the encoder's delay
      const p = secs(PAD);
      const hl = new Float32Array(h.l.length + p);
      const hr = new Float32Array(h.r.length + p);
      hl.set(h.l, p);
      hr.set(h.r, p);
      const hw = join(wavDir, `${name}-head.wav`);
      writeFileSync(hw, encodeWav([hl, hr], RATE));
      pairs.push(hw, join(outDir, `${name}-head.mp3`));
      out.head = `${name}-head.mp3`;
    }
    outs.push(out);
  }
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'scripts', 'music', 'encode-mp3.ps1'), '-Kbps', String(KBPS), ...pairs], {
    stdio: 'ignore',
  });
  for (const o of outs) o.bytes = statSync(join(outDir, o.file)).size;
  const loop = (meta.bars * 4 * 60) / meta.bpm;
  const e: Entry = {
    id: meta.id,
    name: meta.name,
    about: meta.about,
    use: meta.use,
    bpm: meta.bpm,
    bars: meta.bars,
    loop,
    layers: outs,
    presets: meta.presets,
    head: headSec,
    loudness: Math.round(loudness(full) * 10) / 10,
    peak: Math.round(db(peakOf(full)) * 10) / 10,
  };
  entries.push(e);
  console.info(`${meta.name}: ${loop.toFixed(1)} s, ${outs.length} layers, all on ${e.loudness} dB (peak ${e.peak} dBFS), ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  console.info(`  ${outs.map((o) => `${o.id} ${o.loudness}`).join(', ')}`);
}
const order = PIECES.map((p) => p.id);
entries.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
writeFileSync(manifestPath, JSON.stringify({ pad: PAD, kbps: KBPS, pieces: entries }, null, 1) + '\n');
const total = entries.reduce((a, e) => a + e.layers.reduce((b, l) => b + l.bytes, 0), 0);
console.info(`total ${(total / 1e6).toFixed(2)} MB`);

// ---- the game's tracks (src/assets/music/game, committed)
if (gameMixes.length) {
  const gameDir = join(root, 'src', 'assets', 'music', 'game');
  mkdirSync(gameDir, { recursive: true });
  const gamePath = join(gameDir, 'game.json');
  interface GameOut {
    file: string;
    head?: string;
    headSec: number;
    loop: number;
    bpm: number;
    bars: number;
    loudness: number;
    bytes: number;
  }
  let prev: Record<string, GameOut> = {};
  try {
    prev = (JSON.parse(readFileSync(gamePath, 'utf8')) as { tracks: Record<string, GameOut> }).tracks ?? {};
  } catch {
    // first time
  }
  const gains: Record<string, number> = {};
  const ordered = [...gameMixes].sort((a, b) => (a.gt.sameGainAs ? 1 : 0) - (b.gt.sameGainAs ? 1 : 0));
  const pairs: string[] = [];
  const outs: Record<string, GameOut> = { ...prev };
  for (const m of ordered) {
    let g = m.gt.sameGainAs ? (gains[m.gt.sameGainAs] ?? 1) : Math.pow(10, ((m.gt.target ?? -18) - loudness(m.loop)) / 20);
    g = Math.min(g, PEAK / Math.max(peakOf(m.loop), m.head ? peakOf(m.head) : 0));
    gains[m.gt.name] = g;
    scale(m.loop, g);
    if (m.head) scale(m.head, g);
    const name = `music-${m.gt.name}`;
    const wav = join(wavDir, `${name}.wav`);
    const shot = m.meta.use === 'shot';
    writeFileSync(wav, encodeWav(shot ? [m.loop.l, m.loop.r] : padded(m.loop), RATE));
    pairs.push(wav, join(gameDir, `${name}.mp3`));
    const out: GameOut = { file: `${name}.mp3`, headSec: m.headSec, loop: (m.meta.bars * 4 * 60) / m.meta.bpm, bpm: m.meta.bpm, bars: m.meta.bars, loudness: Math.round(loudness(m.loop) * 10) / 10, bytes: 0 };
    if (m.head) {
      const p = secs(PAD);
      const hl = new Float32Array(m.head.l.length + p);
      const hr = new Float32Array(m.head.r.length + p);
      hl.set(m.head.l, p);
      hr.set(m.head.r, p);
      const hw = join(wavDir, `${name}-head.wav`);
      writeFileSync(hw, encodeWav([hl, hr], RATE));
      pairs.push(hw, join(gameDir, `${name}-head.mp3`));
      out.head = `${name}-head.mp3`;
    }
    outs[m.gt.name] = out;
  }
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', join(root, 'scripts', 'music', 'encode-mp3.ps1'), '-Kbps', String(KBPS), ...pairs], {
    stdio: 'ignore',
  });
  let bytes = 0;
  for (const m of ordered) {
    const o = outs[m.gt.name]!;
    o.bytes = statSync(join(gameDir, o.file)).size + (o.head ? statSync(join(gameDir, o.head)).size : 0);
  }
  for (const o of Object.values(outs)) bytes += o.bytes;
  writeFileSync(gamePath, JSON.stringify({ pad: PAD, kbps: KBPS, tracks: outs }, null, 1) + '\n');
  console.info(`game tracks: ${Object.entries(outs).map(([k, o]) => `${k} ${o.loudness} dB`).join(', ')}; ${(bytes / 1e6).toFixed(2)} MB`);
}
