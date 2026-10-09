/**
 * The Web Audio side of the score: stems, reverb and delay sends, the voice cap and a safety limiter. It works on any
 * `BaseAudioContext`, so the live game and the lab's offline WAV export share one code path. It plays `MusicEvent`s from
 * the conductor; it never reads game state.
 *
 * Graph: voice -> (pan) -> stem gain -> level -> duck -> pause low-pass -> limiter -> soft ceiling -> destination, with reverb and delay sends
 * returning into the level node.
 */
import { resample } from './dsp';
import { STEMS, type MusicEvent, type PlayEvent, type Stem } from './conductor';
import type { Library, ReverbName } from './library';
import { VoicePool, type Voice } from './voices';

/** Seconds late an event may be before it is dropped instead of played (a backgrounded tab, a stalled timer). */
const MAX_LATE = 0.3;
const MAX_LIVE_REVERBS = 2;
/** Linear ceiling of the music bus: -6 dBFS. */
const CEILING = 0.5;

interface Layer {
  src: AudioBufferSourceNode;
  gain: GainNode;
  voice: Voice;
}

interface ReverbSend {
  input: GainNode;
  conv: ConvolverNode;
  last: number;
}

export interface EngineStats {
  active: number;
  /** Most voices sounding at once so far (by scheduled time). */
  peak: number;
  refused: number;
  stolen: number;
  /** Sources created. */
  played: number;
  /** Events dropped for being late. */
  late: number;
}

export class MusicEngine {
  readonly stems = {} as Record<Stem, GainNode>;
  readonly pool: VoicePool;
  /** Master level for the state (dB), see `setLevelDb`. */
  private level: GainNode;
  private duck: GainNode;
  private pause: BiquadFilterNode;
  private limiter: DynamicsCompressorNode;
  private ceiling: WaveShaperNode;
  private muted = new Set<Stem>();
  private trims = {} as Record<Stem, number>;
  private buffers = new Map<string, AudioBuffer>();
  private layers = new Map<string, Layer>();
  private reverbs = new Map<ReverbName, ReverbSend>();
  private delay: { input: GainNode } | null = null;
  private readonly offline: boolean;
  private played = 0;
  private late = 0;
  private noisy = false;

  constructor(
    readonly ctx: BaseAudioContext,
    dest: AudioNode,
    readonly lib: Library,
    cap = 24,
    private delaySec = (0.75 * 60) / 84,
  ) {
    this.pool = new VoicePool(cap);
    this.offline = typeof OfflineAudioContext !== 'undefined' && ctx instanceof OfflineAudioContext;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -9;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.12;
    this.pause = ctx.createBiquadFilter();
    this.pause.type = 'lowpass';
    this.pause.frequency.value = 20000;
    this.pause.Q.value = 0.5;
    // a soft ceiling after the limiter: tanh asymptotes at 0.5, so music bus peaks can never pass -6 dBFS (direction 11.3)
    this.ceiling = ctx.createWaveShaper();
    const curve = new Float32Array(4097);
    for (let i = 0; i < curve.length; i++) curve[i] = CEILING * Math.tanh(((i / 2048 - 1)) / CEILING);
    this.ceiling.curve = curve;
    this.level = ctx.createGain();
    this.duck = ctx.createGain();
    this.level.connect(this.duck).connect(this.pause).connect(this.limiter).connect(this.ceiling).connect(dest);
    for (const s of STEMS) {
      const g = ctx.createGain();
      g.connect(this.level);
      this.stems[s] = g;
      this.trims[s] = 0;
    }
  }

  // ------------------------------------------------------------ mix controls

  setStemMuted(stem: Stem, muted: boolean): void {
    if (muted) this.muted.add(stem);
    else this.muted.delete(stem);
    this.applyStem(stem);
  }

  isMuted(stem: Stem): boolean {
    return this.muted.has(stem);
  }

  /** Static per-stem trim in dB. */
  setStemTrim(stem: Stem, db: number): void {
    this.trims[stem] = db;
    this.applyStem(stem);
  }

  private applyStem(stem: Stem): void {
    const g = this.muted.has(stem) ? 0 : Math.pow(10, this.trims[stem] / 20);
    this.stems[stem].gain.setTargetAtTime(g, this.ctx.currentTime, 0.03);
  }

  /** State level in dB, glided (time constant `tc` seconds). */
  setLevelDb(db: number, t = this.ctx.currentTime, tc = 0.4): void {
    this.level.gain.setTargetAtTime(Math.pow(10, db / 20), t, tc);
  }

  /** Pause / duck: a gain drop and a low-pass, over `tc` seconds (direction 6.5: -12 dB and 800 Hz). */
  setDuck(db: number, lpHz: number, t = this.ctx.currentTime, tc = 0.1): void {
    this.pause.frequency.setTargetAtTime(lpHz, t, tc);
    this.duck.gain.setTargetAtTime(Math.pow(10, db / 20), t, tc);
  }

  stats(): EngineStats {
    return {
      active: this.pool.active(this.ctx.currentTime),
      peak: this.pool.peak,
      refused: this.pool.refused,
      stolen: this.pool.stolen,
      played: this.played,
      late: this.late,
    };
  }

  // ------------------------------------------------------------ events

  handle(e: MusicEvent): void {
    if (e.k === 'stop') this.stopLayer(e.layer, e.t, e.fade);
    else this.play(e);
  }

  private buffer(id: string): AudioBuffer | null {
    let b = this.buffers.get(id);
    if (b) return b;
    const s = this.lib.sounds.get(id);
    if (!s) return null;
    b = this.ctx.createBuffer(1, s.data.length, this.lib.rate);
    b.copyToChannel(s.data as Float32Array<ArrayBuffer>, 0);
    this.buffers.set(id, b);
    return b;
  }

  private reverbSend(name: ReverbName): GainNode {
    let r = this.reverbs.get(name);
    if (!r) {
      // at most two convolvers live at once (the current state's and the next one's): evict the least recently used
      if (!this.offline && this.reverbs.size >= MAX_LIVE_REVERBS) {
        let oldest: [ReverbName, ReverbSend] | null = null;
        for (const kv of this.reverbs) if (!oldest || kv[1].last < oldest[1].last) oldest = kv;
        if (oldest) {
          this.reverbs.delete(oldest[0]);
          const ev = oldest[1];
          ev.input.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
          setTimeout(() => {
            ev.input.disconnect();
            ev.conv.disconnect();
          }, 4000);
        }
      }
      const [l, rr] = this.lib.irs[name];
      const n = this.ctx.sampleRate === this.lib.rate ? l.length : Math.round((l.length * this.ctx.sampleRate) / this.lib.rate);
      const buf = this.ctx.createBuffer(2, n, this.ctx.sampleRate);
      buf.copyToChannel((this.ctx.sampleRate === this.lib.rate ? l : resample(l, this.lib.rate, this.ctx.sampleRate)) as Float32Array<ArrayBuffer>, 0);
      buf.copyToChannel((this.ctx.sampleRate === this.lib.rate ? rr : resample(rr, this.lib.rate, this.ctx.sampleRate)) as Float32Array<ArrayBuffer>, 1);
      const input = this.ctx.createGain();
      const conv = this.ctx.createConvolver();
      conv.buffer = buf;
      input.connect(conv).connect(this.level);
      r = { input, conv, last: 0 };
      this.reverbs.set(name, r);
    }
    r.last = this.ctx.currentTime;
    return r.input;
  }

  /** Dub delay (dotted eighth at the lab tempo, feedback 0.35, low-passed at 1.8 kHz in the loop). */
  private delaySend(): GainNode {
    if (!this.delay) {
      const input = this.ctx.createGain();
      const d = this.ctx.createDelay(2);
      d.delayTime.value = this.delaySec;
      const fb = this.ctx.createGain();
      fb.gain.value = 0.35;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1800;
      input.connect(d);
      d.connect(lp).connect(fb).connect(d);
      lp.connect(this.level);
      this.delay = { input };
    }
    return this.delay.input;
  }

  private play(e: PlayEvent): void {
    const ctx = this.ctx;
    const now = ctx.currentTime;
    if (e.t < now - MAX_LATE) {
      this.late++;
      return;
    }
    const buf = this.buffer(e.id);
    if (!buf) {
      if (!this.noisy) {
        this.noisy = true;
        console.warn(`music: sound "${e.id}" is not in the library`);
      }
      return;
    }
    const t = Math.max(e.t, now);
    const rate = Math.max(0.05, e.rate);
    const loops = this.lib.sounds.get(e.id)!.loop;
    const natural = buf.duration / rate;
    const fadeOut = e.fadeOut ?? 0.02;
    const end = e.dur !== undefined ? t + e.dur + fadeOut : loops ? Infinity : t + natural;

    // a new play on a named layer replaces the one before it
    if (e.layer) this.stopLayer(e.layer, t, Math.max(0.02, e.fadeIn ?? 0.03));

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    if (loops) {
      src.loop = true;
      src.loopStart = 0;
      src.loopEnd = buf.duration;
    }
    const gain = ctx.createGain();
    const cutVoice = (tc: number): void => {
      gain.gain.cancelScheduledValues(tc);
      gain.gain.setTargetAtTime(0, tc, 0.01);
      try {
        src.stop(tc + 0.08);
      } catch {
        /* not started yet */
      }
    };
    const voice = this.pool.begin(e.prio, t, end, cutVoice);
    if (!voice) return;

    const hasEnv = e.fadeIn !== undefined || e.dur !== undefined;
    if (hasEnv) {
      const fi = Math.max(0.002, e.fadeIn ?? 0.002);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(e.gain, t + fi);
      if (e.dur !== undefined) {
        gain.gain.setValueAtTime(e.gain, Math.max(t + fi, t + e.dur));
        gain.gain.linearRampToValueAtTime(0, t + e.dur + fadeOut);
      }
    } else {
      gain.gain.value = e.gain;
    }
    src.connect(gain);
    let tail: AudioNode = gain;
    if (e.pan) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, e.pan));
      gain.connect(p);
      tail = p;
    }
    tail.connect(this.stems[e.stem]);
    if (e.reverb && e.send) {
      const s = ctx.createGain();
      s.gain.value = e.send;
      tail.connect(s).connect(this.reverbSend(e.reverb));
    }
    if (e.delay) {
      const s = ctx.createGain();
      s.gain.value = e.delay;
      tail.connect(s).connect(this.delaySend());
    }
    src.start(t);
    if (e.dur !== undefined) src.stop(t + e.dur + fadeOut + 0.02);
    this.played++;
    src.onended = (): void => {
      gain.disconnect();
      if (tail !== gain) tail.disconnect();
    };
    if (e.layer) this.layers.set(e.layer, { src, gain, voice });
  }

  private stopLayer(name: string, t: number, fade: number): void {
    const l = this.layers.get(name);
    if (!l) return;
    this.layers.delete(name);
    const at = Math.max(t, this.ctx.currentTime);
    const tc = Math.max(0.008, fade / 4);
    l.gain.gain.setTargetAtTime(0, at, tc);
    try {
      l.src.stop(at + fade * 1.3 + 0.05);
    } catch {
      /* already stopped */
    }
    this.pool.finish(l.voice, at + fade * 1.3 + 0.05);
  }

  /** Stop everything that is sustained (the lab's Stop button, a state reset). */
  stopAll(fade = 0.3): void {
    const t = this.ctx.currentTime;
    for (const name of [...this.layers.keys()]) this.stopLayer(name, t, fade);
  }

  dispose(): void {
    this.stopAll(0.05);
    this.level.disconnect();
    for (const r of this.reverbs.values()) {
      r.input.disconnect();
      r.conv.disconnect();
    }
    this.reverbs.clear();
  }
}
