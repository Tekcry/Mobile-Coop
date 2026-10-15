import { impulseResponse, type IrSpec } from '../music/dsp';
import { Rng } from '../music/rng';
import type { Ev, LayerDef } from './arrange';
import { Kit, type Bus } from './instruments';
import { gatedDb } from './synth';

/**
 * Renders one layer into an AudioBuffer with an OfflineAudioContext (docs/music/score-design.md Section 3).
 * Loops: the tail past the loop end is folded back onto the start, so reverb and long notes wrap and the loop is
 * seamless. Every stem is then scaled to its target gated loudness, so the mix levels are set by numbers, not guesses.
 */

export interface Rendered {
  def: LayerDef;
  buffer: AudioBuffer;
  /** Loop length (s); for one-shots, the time of the musical end (before the tail). */
  loopSec: number;
  /** Gated loudness before scaling (dBFS), and the gain applied. */
  rawDb: number;
  gain: number;
  ms: number;
  /** For decoded files with padding around the loop: the loop region inside the buffer (s). */
  loopStart?: number;
  loopEnd?: number;
  /** The clean opening (first bars from silence, after `loopStart` seconds of padding) and its length (s). */
  head?: AudioBuffer;
  headSec?: number;
}

const IRS: Record<'room' | 'hall' | 'far', IrSpec> = {
  room: { sec: 0.9, early: [0.007, 0.013, 0.021, 0.029], low: 0.5, mid: 0.42, high: 0.28 },
  hall: { sec: 3.4, early: [0.019, 0.033, 0.047, 0.061], low: 2.9, mid: 2.3, high: 1.1 },
  far: { sec: 6.5, early: [0.045, 0.071, 0.11], low: 5.5, mid: 4.2, high: 1.6 },
};

const irCache = new Map<string, [Float32Array, Float32Array]>();

function ir(kind: 'room' | 'hall' | 'far', rate: number): [Float32Array, Float32Array] {
  const key = `${kind}-${rate}`;
  let v = irCache.get(key);
  if (!v) {
    v = impulseResponse(new Rng(0x5eed ^ rate ^ kind.length), rate, IRS[kind]);
    irCache.set(key, v);
  }
  return v;
}

function convolver(ctx: BaseAudioContext, kind: 'room' | 'hall' | 'far'): ConvolverNode {
  const [l, r] = ir(kind, ctx.sampleRate);
  const b = ctx.createBuffer(2, l.length, ctx.sampleRate);
  b.copyToChannel(l as Float32Array<ArrayBuffer>, 0);
  b.copyToChannel(r as Float32Array<ArrayBuffer>, 1);
  const c = ctx.createConvolver();
  c.normalize = false;
  c.buffer = b;
  return c;
}

export function loopSeconds(def: LayerDef): number {
  return (def.bars * 4 * 60) / def.bpm;
}

export async function renderLayer(def: LayerDef, loop: boolean, seed = 7): Promise<Rendered> {
  const started = performance.now();
  const spb = 60 / def.bpm;
  const loopSec = loopSeconds(def);
  const tail = loop ? 7 : 4.5;
  const rate = def.rate;
  const chans = def.mono ? 1 : 2;
  const total = Math.ceil((loopSec + tail) * rate);
  const ctx = new OfflineAudioContext(chans, total, rate);

  // layer bus: input -> [hp] -> [lp] -> [drive] -> out; reverb and echo sends from the input
  const input = ctx.createGain();
  const farIn = ctx.createGain();
  const out = ctx.createGain();
  out.connect(ctx.destination);
  let node: AudioNode = input;
  const fx = def.fx;
  if (fx.hp) {
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = fx.hp;
    node = node.connect(hp);
  }
  if (fx.lp) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(fx.lp, rate * 0.45);
    lp.Q.value = 0.6;
    node = node.connect(lp);
  }
  const rng = new Rng(seed).fork(def.id);
  const kit = new Kit(ctx, rng);
  if (fx.drive && fx.drive > 1) node = node.connect(kit.shaper(fx.drive));
  node.connect(out);
  const farVoices = def.events.some((e) => e.v === 'farHorn');
  for (const kind of ['room', 'hall', 'far'] as const) {
    const amt = fx[kind];
    if (amt <= 0 && !(kind === 'far' && farVoices)) continue;
    const conv = convolver(ctx, kind);
    const send = ctx.createGain();
    send.gain.value = amt;
    input.connect(send).connect(conv);
    if (kind === 'far') {
      farIn.connect(conv);
      // far things lose their top end
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2600;
      conv.connect(lp).connect(out);
    } else conv.connect(out);
  }
  if (fx.delay) {
    const dl = ctx.createDelay(4);
    dl.delayTime.value = fx.delay.beats * spb;
    const fb = ctx.createGain();
    fb.gain.value = fx.delay.fb;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 2200;
    const wet = ctx.createGain();
    wet.gain.value = fx.delay.wet;
    input.connect(dl);
    dl.connect(tone).connect(fb).connect(dl);
    tone.connect(wet).connect(out);
  }
  const bus: Bus = { dry: input, far: farIn };

  // schedule in chunks, one chunk ahead of the render, and drop finished notes as it goes
  const CHUNK = 4;
  const nChunks = Math.ceil((loopSec + tail) / CHUNK);
  const buckets: [Ev, number][][] = Array.from({ length: nChunks }, () => []);
  for (const e of def.events) {
    let t = e.at * spb;
    if (loop) t = ((t % loopSec) + loopSec) % loopSec;
    if (t < 0 || t >= loopSec + tail - 0.5) continue;
    buckets[Math.min(nChunks - 1, Math.floor(t / CHUNK))]!.push([e, t]);
  }
  const schedule = (k: number): void => {
    for (const [e, t] of buckets[k] ?? []) kit.play(e, t, e.dur * spb, bus);
  };
  schedule(0);
  schedule(1);
  for (let k = 1; k + 1 < nChunks; k++) {
    const at = k * CHUNK;
    void ctx.suspend(at).then(() => {
      kit.cleanup(at);
      schedule(k + 1);
      void ctx.resume();
    });
  }

  const rendered = await ctx.startRendering();
  const loopLen = Math.round(loopSec * rate);
  const outLen = loop ? loopLen : rendered.length;
  const data: Float32Array[] = [];
  for (let c = 0; c < chans; c++) {
    const src = rendered.getChannelData(c);
    const dst = new Float32Array(outLen);
    dst.set(src.subarray(0, outLen));
    if (loop) for (let i = loopLen; i < src.length; i++) dst[i - loopLen]! += src[i]!;
    data.push(dst);
  }
  const rawDb = gatedDb(data, rate);
  let gain = Math.pow(10, (def.level - rawDb) / 20);
  let pk = 0;
  for (const d of data) for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i]!));
  if (pk * gain > 0.98) gain = 0.98 / Math.max(pk, 1e-9);
  const buffer = new AudioBuffer({ length: outLen, numberOfChannels: chans, sampleRate: rate });
  for (let c = 0; c < chans; c++) {
    const d = data[c]!;
    for (let i = 0; i < d.length; i++) d[i]! *= gain;
    buffer.copyToChannel(d as Float32Array<ArrayBuffer>, c);
  }
  return { def, buffer, loopSec, rawDb, gain, ms: performance.now() - started };
}

/** Render several layers, a few at a time (each offline render runs on its own thread). */
export async function renderAll(defs: LayerDef[], loop: (d: LayerDef) => boolean, onDone?: (r: Rendered, done: number) => void, parallel = 4): Promise<Rendered[]> {
  const out: Rendered[] = new Array(defs.length);
  let next = 0;
  let done = 0;
  const worker = async (): Promise<void> => {
    while (next < defs.length) {
      const i = next++;
      const r = await renderLayer(defs[i]!, loop(defs[i]!));
      out[i] = r;
      done++;
      onDone?.(r, done);
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, defs.length) }, worker));
  return out;
}
