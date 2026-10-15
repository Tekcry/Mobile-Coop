import type { Rng } from '../music/rng';
import { HITS, type Ev, type Hit } from './arrange';
import { crackle, makeHit, noiseBed, pluck, reverseCymbal, rhodes, spiccato } from './synth';
import { freq } from './theory';

/**
 * The V4 instruments (docs/music/score-design.md Section 3). Each voice schedules a small node graph into an
 * OfflineAudioContext at time `t` for `d` seconds. Percussion, the plucked bass and the noise beds are pure PCM from
 * `synth.ts`, made once per render and cached; strings, brass, horns and the bass synths are oscillator ensembles.
 */

export interface Bus {
  /** The layer's dry input (its reverb sends are taken from here). */
  dry: AudioNode;
  /** Straight into the long far reverb (wet only), for sounds placed far away. */
  far: AudioNode;
}

const now0 = 0.0001;

export class Kit {
  private readonly hits = new Map<Hit, AudioBuffer>();
  private readonly plucks = new Map<number, AudioBuffer>();
  private readonly spiccs = new Map<number, AudioBuffer>();
  private readonly keys = new Map<string, AudioBuffer>();
  private readonly beds = new Map<string, AudioBuffer>();
  private readonly shaperCache = new Map<number, Float32Array<ArrayBuffer>>();
  /** Output nodes of scheduled notes and when they are silent, so finished notes can leave the graph. */
  private live: { node: AudioNode; end: number }[] = [];
  private curEnd = 0;

  constructor(
    readonly ctx: BaseAudioContext,
    readonly rng: Rng,
  ) {}

  private buffer(data: Float32Array): AudioBuffer {
    const b = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate);
    b.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
    return b;
  }

  hit(h: Hit): AudioBuffer {
    let b = this.hits.get(h);
    if (!b) {
      b = this.buffer(makeHit(h, this.ctx.sampleRate, this.rng.fork(`hit-${h}-${HITS.indexOf(h)}`)));
      this.hits.set(h, b);
    }
    return b;
  }

  pluck(n: number): AudioBuffer {
    let b = this.plucks.get(n);
    if (!b) {
      const f = freq(n);
      b = this.buffer(pluck(this.ctx.sampleRate, f, this.rng.fork(`pluck-${n}`), 2.4, n < 40 ? 1.6 : 1.3, 0.3));
      this.plucks.set(n, b);
    }
    return b;
  }

  spicc(n: number): AudioBuffer {
    let b = this.spiccs.get(n);
    if (!b) {
      b = this.buffer(spiccato(this.ctx.sampleRate, freq(n), this.rng.fork(`spicc-${n}`)));
      this.spiccs.set(n, b);
    }
    return b;
  }

  /** Cached tuned samples: electric piano, open guitar, palm-muted guitar. */
  tuned(kind: 'rhodes' | 'guitar' | 'guitarMute', n: number): AudioBuffer {
    const key = `${kind}-${n}`;
    let b = this.keys.get(key);
    if (!b) {
      const rate = this.ctx.sampleRate;
      const r = this.rng.fork(key);
      const f = freq(n);
      const data =
        kind === 'rhodes' ? rhodes(rate, f, r) : kind === 'guitar' ? pluck(rate, f, r, 2.6, 1.5, 0.8, 4200, 220) : pluck(rate, f, r, 0.9, 0.22, 0.6, 2200, 180);
      b = this.buffer(data);
      this.keys.set(key, b);
    }
    return b;
  }

  bed(kind: 'white' | 'pink' | 'brown' | 'crackle' | 'swell'): AudioBuffer {
    let b = this.beds.get(kind);
    if (!b) {
      const r = this.rng.fork(`bed-${kind}`);
      const rate = this.ctx.sampleRate;
      const data = kind === 'crackle' ? crackle(7, rate, r) : kind === 'swell' ? reverseCymbal(3, rate, r) : noiseBed(kind, 6, rate, r);
      b = this.buffer(data);
      this.beds.set(kind, b);
    }
    return b;
  }

  shaper(drive: number): WaveShaperNode {
    const key = Math.round(drive * 10);
    let curve = this.shaperCache.get(key);
    if (!curve) {
      curve = new Float32Array(1024);
      const norm = 1 / Math.tanh(drive);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / (curve.length - 1)) * 2 - 1;
        curve[i] = Math.tanh(x * drive) * norm;
      }
      this.shaperCache.set(key, curve);
    }
    const w = this.ctx.createWaveShaper();
    w.curve = curve;
    return w;
  }

  /** Disconnect every note that is silent by `now` (thousands of idle nodes slow an offline render badly). */
  cleanup(now: number): void {
    const keep: { node: AudioNode; end: number }[] = [];
    for (const x of this.live) {
      if (x.end < now) x.node.disconnect();
      else keep.push(x);
    }
    this.live = keep;
  }

  // ------------------------------------------------------------ plumbing

  private track(node: AudioNode): void {
    this.live.push({ node, end: this.curEnd });
  }

  private out(bus: Bus, pan: number, gain: number): GainNode {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = gain;
    if (pan !== 0 && ctx.destination.channelCount > 1) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p).connect(bus.dry);
      this.track(p);
    } else {
      g.connect(bus.dry);
      this.track(g);
    }
    return g;
  }

  private osc(type: OscillatorType, f: number, t: number, end: number, detune = 0): OscillatorNode {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    o.start(t);
    o.stop(end);
    return o;
  }

  private filter(type: BiquadFilterType, f: number, q = 0.7, gain = 0): BiquadFilterNode {
    const b = this.ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = Math.min(f, this.ctx.sampleRate * 0.45);
    b.Q.value = q;
    b.gain.value = gain;
    return b;
  }

  private src(buf: AudioBuffer, t: number, rate = 1, loop = false): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.playbackRate.value = rate;
    s.loop = loop;
    s.start(t, loop ? this.rng.next() * buf.duration * 0.9 : 0);
    return s;
  }

  /** Attack to `peak`, hold, release from `t + d` with time constant `rel`. */
  private adsr(g: AudioParam, t: number, d: number, peak: number, attack: number, rel: number, sustain = 1, decay = 0.3): void {
    g.setValueAtTime(0, t);
    g.linearRampToValueAtTime(peak, t + attack);
    if (sustain !== 1) g.setTargetAtTime(peak * sustain, t + attack, decay / 3);
    g.setTargetAtTime(0, t + Math.max(d, attack), rel / 3);
  }

  // ------------------------------------------------------------ voices

  play(e: Ev, t: number, d: number, bus: Bus): void {
    // generous: the longest release or ring-out of any voice
    this.curEnd = t + Math.max(0, d) + 4;
    switch (e.v) {
      case 'pizz':
        return this.pizz(e, t, d, bus);
      case 'heart':
        return this.heart(e, t, bus);
      case 'darkBass':
      case 'reese':
        return this.synthBass(e, t, d, bus, e.v === 'reese');
      case 'strSpicc': {
        // short notes are cached samples: hundreds of them per loop
        const s = this.src(this.spicc(e.n), t);
        s.connect(this.out(bus, e.pan, e.vel));
        return;
      }
      case 'rhodes':
      case 'guitar':
      case 'guitarMute':
        return this.tunedVoice(e, e.v, t, d, bus);
      case 'str':
      case 'strHi':
      case 'strTrem':
        return this.strings(e, t, d, bus);
      case 'harm':
        return this.harm(e, t, d, bus);
      case 'brass':
        return this.brass(e, t, d, bus);
      case 'horn':
      case 'mutedHorn':
      case 'farHorn':
        return this.horn(e, t, d, bus);
      case 'melody':
        return this.melody(e, t, d, bus);
      case 'air':
      case 'rumble':
      case 'crackle':
        return this.bedVoice(e, t, d, bus);
      case 'riser':
        return this.riser(e, t, d, bus);
      case 'swell':
        return this.swell(e, t, d, bus);
      case 'boom':
        return this.boom(e, t, bus);
      default:
        return this.hitVoice(e, e.v, t, d, bus);
    }
  }

  private hitVoice(e: Ev, h: Hit, t: number, d: number, bus: Bus): void {
    const buf = this.hit(h);
    const s = this.src(buf, t, e.p);
    const g = this.out(bus, e.pan, e.vel * e.vel * 0.9 + e.vel * 0.1);
    if (d > 0 && d < buf.duration / e.p) {
      g.gain.setValueAtTime(g.gain.value, t + d);
      g.gain.linearRampToValueAtTime(0, t + d + 0.006);
      s.stop(t + d + 0.01);
    }
    s.connect(g);
  }

  private pizz(e: Ev, t: number, d: number, bus: Bus): void {
    const s = this.src(this.pluck(e.n), t);
    const f = freq(e.n);
    const lp = this.filter('lowpass', Math.min(2600, 380 + f * 4 + e.vel * 500), 0.6);
    const g = this.out(bus, e.pan, e.vel * 0.9);
    // damp the string when the note ends (a jazz bassist's left hand)
    g.gain.setTargetAtTime(0, t + d + 0.03, 0.05);
    s.stop(t + d + 0.5);
    s.connect(lp).connect(g);
  }

  private tunedVoice(e: Ev, kind: 'rhodes' | 'guitar' | 'guitarMute', t: number, d: number, bus: Bus): void {
    const s = this.src(this.tuned(kind, e.n), t);
    const g = this.out(bus, e.pan, e.vel);
    g.gain.setTargetAtTime(0, t + d, kind === 'rhodes' ? 0.12 : 0.06);
    s.stop(t + d + 0.8);
    if (kind === 'rhodes') s.connect(g);
    else s.connect(this.shaper(kind === 'guitar' ? 1.5 : 1.8)).connect(g);
  }

  /** "Lub" or "dub": a sub sine with a fast pitch drop plus a soft pluck an octave up. */
  private heart(e: Ev, t: number, bus: Bus): void {
    const f = freq(e.n - 12);
    const o = this.osc('sine', f * 1.7, t, t + 0.7);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    const g = this.out(bus, 0, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(e.vel * 0.9, t + 0.006);
    g.gain.exponentialRampToValueAtTime(now0, t + 0.55);
    o.connect(g);
    const s = this.src(this.pluck(e.n), t);
    const lp = this.filter('lowpass', 420, 0.6);
    const g2 = this.out(bus, 0, e.vel * 0.3);
    g2.gain.setTargetAtTime(0, t + 0.25, 0.08);
    s.stop(t + 0.8);
    s.connect(lp).connect(g2);
  }

  /** Alert bass: two detuned saws and a sub, driven; `reese` is wider and darker with a moving filter. */
  private synthBass(e: Ev, t: number, d: number, bus: Bus, reese: boolean): void {
    const f = freq(e.n);
    const end = t + d + 0.3;
    const det = reese ? 17 : 8;
    const lp = this.filter('lowpass', reese ? 420 : 1400, reese ? 2.2 : 0.9);
    lp.frequency.setValueAtTime(reese ? 900 : 1500, t);
    lp.frequency.setTargetAtTime(reese ? 360 : 520, t + 0.01, reese ? 0.12 : 0.05);
    const sh = this.shaper(reese ? 2.2 : 2.8);
    const mix = this.ctx.createGain();
    mix.gain.value = 0.3;
    for (const dt of [-det, det]) this.osc('sawtooth', f, t, end, dt).connect(mix);
    const sub = this.osc('sine', f, t, end);
    const subG = this.ctx.createGain();
    subG.gain.value = 0.5;
    sub.connect(subG).connect(sh);
    mix.connect(lp).connect(sh);
    const post = this.filter('lowpass', 1800, 0.7);
    const g = this.out(bus, e.pan, 0);
    this.adsr(g.gain, t, d, e.vel * 0.45, 0.004, 0.07, 0.8, 0.2);
    sh.connect(post).connect(g);
  }

  /** String section: sustained (`str`, `strHi`) or tremolo (`strTrem`). `p` = attack (s). Short notes are cached samples. */
  private strings(e: Ev, t: number, d: number, bus: Bus): void {
    const ctx = this.ctx;
    const f = freq(e.n);
    const hi = e.v === 'strHi';
    const trem = e.v === 'strTrem';
    const attack = Math.max(0.02, Math.min(e.p, d * 0.95));
    const rel = 0.5;
    const end = t + d + rel * 2 + 0.05;
    const detunes = [-12, -5, 0, 5, 11];
    const sum = ctx.createGain();
    sum.gain.value = 1 / detunes.length;
    // shared vibrato, fading in (players settle into the note)
    let lfoGain: GainNode | null = null;
    if (d > 0.4) {
      const lfo = this.osc('sine', 4.9 + this.rng.next() * 0.8, t, end);
      lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0, t);
      lfoGain.gain.linearRampToValueAtTime(hi ? 11 : 7, t + Math.min(1, d));
      lfo.connect(lfoGain);
    }
    for (const dt of detunes) {
      const o = this.osc('sawtooth', f, t + this.rng.next() * 0.01, end, dt + (this.rng.next() - 0.5) * 3);
      if (lfoGain) lfoGain.connect(o.detune);
      o.connect(sum);
    }
    const cutoff = hi ? Math.min(7500, f * 6) : Math.min(3600, 500 + f * 3.2);
    const lp1 = this.filter('lowpass', cutoff, 0.5);
    const lp2 = this.filter('lowpass', cutoff * 1.3, 0.5);
    // bow noise
    const bow = this.src(this.bed('white'), t, 1, true);
    bow.stop(end);
    const bowBp = this.filter('bandpass', Math.min(5000, f * 4), 1.2);
    const bowG = ctx.createGain();
    bowG.gain.value = 0.05;
    bow.connect(bowBp).connect(bowG).connect(lp2);
    const amp = this.out(bus, e.pan, 0);
    this.adsr(amp.gain, t, d, e.vel * 0.32, attack, rel);
    let node: AudioNode = sum;
    if (trem) {
      const tg = ctx.createGain();
      tg.gain.value = 0.55;
      const l = this.osc('triangle', 12.5 + this.rng.next() * 1.5, t, end);
      const lg = ctx.createGain();
      lg.gain.value = 0.45;
      l.connect(lg).connect(tg.gain);
      sum.connect(tg);
      node = tg;
    }
    node.connect(lp1).connect(lp2).connect(amp);
  }

  /** Glassy high harmonics: almost pure sines, long attack (`p`), very quiet. */
  private harm(e: Ev, t: number, d: number, bus: Bus): void {
    const f = freq(e.n);
    const end = t + d + 2;
    const g = this.out(bus, e.pan, 0);
    this.adsr(g.gain, t, d, e.vel * 0.06, Math.min(e.p, d), 1.4);
    const o = this.osc('sine', f, t, end);
    const o2 = this.osc('sine', f * 2.001, t, end);
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.12;
    o.connect(g);
    o2.connect(g2).connect(g);
  }

  /** Low brass: saws and a triangle, a filter that opens on the attack and settles, a pitch scoop, breath. `p` = attack. */
  private brass(e: Ev, t: number, d: number, bus: Bus): void {
    const ctx = this.ctx;
    const f = freq(e.n);
    const attack = Math.max(0.01, e.p);
    const end = t + d + 0.7;
    const sum = ctx.createGain();
    sum.gain.value = 0.28;
    const scoop = attack < 0.15;
    for (const dt of [-7, 0, 6]) {
      const o = this.osc('sawtooth', f, t, end, dt);
      if (scoop) {
        o.detune.setValueAtTime(dt - 35, t);
        o.detune.linearRampToValueAtTime(dt, t + 0.07);
      }
      o.connect(sum);
    }
    const tri = this.osc('triangle', f, t, end);
    const tg = ctx.createGain();
    tg.gain.value = 0.9;
    tri.connect(tg).connect(sum);
    const v = e.vel;
    const peakC = Math.min(5200, f * (2.6 + 6 * v));
    const susC = Math.min(4000, f * (1.8 + 3.2 * v));
    const lp = this.filter('lowpass', f * 1.3, 1.1);
    lp.frequency.setValueAtTime(f * 1.3, t);
    lp.frequency.linearRampToValueAtTime(peakC, t + Math.max(0.05, attack * 0.9));
    lp.frequency.setTargetAtTime(susC, t + Math.max(0.05, attack), 0.12);
    lp.frequency.setTargetAtTime(f * 1.2, t + d, 0.05);
    const lp2 = this.filter('lowpass', 4200, 0.6);
    const sh = this.shaper(1 + 1.6 * v);
    const amp = this.out(bus, e.pan, 0);
    this.adsr(amp.gain, t, d, v * 0.3, attack, 0.22, 0.82, 0.25);
    sum.connect(lp).connect(sh).connect(lp2).connect(amp);
    // breath on the attack
    const br = this.src(this.bed('white'), t, 1, true);
    br.stop(t + 0.3);
    const bp = this.filter('bandpass', 1100, 0.8);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0, t);
    bg.gain.linearRampToValueAtTime(v * 0.05, t + 0.02);
    bg.gain.setTargetAtTime(0, t + 0.03, 0.05);
    br.connect(bp).connect(bg).connect(amp);
  }

  /** Horns: rounder brass, slower attack, late vibrato. `p` = section size. Muted and far versions are darker. */
  private horn(e: Ev, t: number, d: number, bus: Bus): void {
    const ctx = this.ctx;
    const f = freq(e.n);
    const far = e.v === 'farHorn';
    const muted = e.v === 'mutedHorn';
    const copies = Math.max(1, Math.round(e.p));
    const cap = far ? 650 : muted ? 1000 : 3200;
    for (let c = 0; c < copies; c++) {
      const tOff = c ? 0.006 + this.rng.next() * 0.018 : 0;
      const det = c ? (this.rng.next() - 0.5) * 14 : 0;
      const t0 = t + tOff;
      const end = t0 + d + 0.6;
      const sum = ctx.createGain();
      sum.gain.value = 1;
      const o1 = this.osc('triangle', f, t0, end, det);
      const o2 = this.osc('sawtooth', f, t0, end, det + 3);
      const o3 = this.osc('sine', f * 2, t0, end, det);
      const g2 = ctx.createGain();
      g2.gain.value = 0.22;
      const g3 = ctx.createGain();
      g3.gain.value = 0.1;
      o1.connect(sum);
      o2.connect(g2).connect(sum);
      o3.connect(g3).connect(sum);
      if (d > 0.55) {
        const lfo = this.osc('sine', 4.8 + this.rng.next() * 0.6, t0, end);
        const lg = ctx.createGain();
        lg.gain.setValueAtTime(0, t0);
        lg.gain.setValueAtTime(0, t0 + 0.3);
        lg.gain.linearRampToValueAtTime(7, t0 + 0.8);
        lfo.connect(lg);
        lg.connect(o1.detune);
        lg.connect(o2.detune);
      }
      const lp = this.filter('lowpass', f * 1.4, 0.8);
      const top = Math.min(cap, f * (2.2 + 2.6 * e.vel));
      lp.frequency.setValueAtTime(f * 1.4, t0);
      lp.frequency.linearRampToValueAtTime(top, t0 + 0.09);
      lp.frequency.setTargetAtTime(top * 0.85, t0 + 0.1, 0.2);
      const pan = e.pan + (copies > 1 ? (c - (copies - 1) / 2) * 0.35 : 0);
      const amp = far ? ctx.createGain() : this.out(bus, pan, 0);
      this.adsr(amp.gain, t0, d, (e.vel * 0.34) / Math.sqrt(copies), far ? 0.12 : 0.065, far ? 0.4 : 0.15);
      sum.connect(lp).connect(amp);
      if (far) {
        // mostly reverb: a little dry signal, a strong send into the far space
        amp.connect(this.out(bus, pan, 0.22));
        const send = ctx.createGain();
        send.gain.value = 1.6;
        amp.connect(send).connect(bus.far);
        this.track(send);
      }
    }
  }

  /** A plain, soft tone for the theme-alone test. */
  private melody(e: Ev, t: number, d: number, bus: Bus): void {
    const f = freq(e.n);
    const end = t + d + 0.5;
    const g = this.out(bus, 0, 0);
    this.adsr(g.gain, t, d, e.vel * 0.35, 0.015, 0.1, 0.7, 0.4);
    const o = this.osc('sine', f, t, end);
    const o2 = this.osc('triangle', f, t, end);
    const g2 = this.ctx.createGain();
    g2.gain.value = 0.3;
    if (d > 0.4) {
      const lfo = this.osc('sine', 5.2, t, end);
      const lg = this.ctx.createGain();
      lg.gain.setValueAtTime(0, t + 0.25);
      lg.gain.linearRampToValueAtTime(6, t + 0.6);
      lfo.connect(lg).connect(o.detune);
      lg.connect(o2.detune);
    }
    o.connect(g);
    o2.connect(g2).connect(g);
  }

  /** Noise beds: cold air (high, moving band), city rumble (very low), vinyl crackle. Fades in and out over 2 s. */
  private bedVoice(e: Ev, t: number, d: number, bus: Bus): void {
    const ctx = this.ctx;
    const end = t + d;
    const fade = Math.min(2, d / 3);
    const level = e.v === 'air' ? 0.22 : e.v === 'rumble' ? 0.55 : 0.12;
    const sides = e.v === 'rumble' ? [0] : [-0.6, 0.6];
    for (const pan of sides) {
      const s = this.src(this.bed(e.v === 'air' ? 'pink' : e.v === 'rumble' ? 'brown' : 'crackle'), t, 1, true);
      s.stop(end + 0.05);
      const g = this.out(bus, pan, 0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(e.vel * level, t + fade);
      g.gain.setValueAtTime(e.vel * level, end - fade);
      g.gain.linearRampToValueAtTime(0, end);
      if (e.v === 'air') {
        const bp = this.filter('bandpass', e.p, 0.9);
        const lfo = this.osc('sine', 0.05 + this.rng.next() * 0.05, t, end);
        const lg = ctx.createGain();
        lg.gain.value = e.p * 0.3;
        lfo.connect(lg).connect(bp.frequency);
        const hp = this.filter('highpass', 3500, 0.7);
        s.connect(bp).connect(hp).connect(g);
      } else if (e.v === 'rumble') {
        const lp = this.filter('lowpass', 110, 0.7);
        const lp2 = this.filter('lowpass', 160, 0.7);
        s.connect(lp).connect(lp2).connect(g);
      } else s.connect(g);
    }
  }

  /** Riser: rising band of noise plus a rising tritone cluster, cut dead at the end. */
  private riser(e: Ev, t: number, d: number, bus: Bus): void {
    const ctx = this.ctx;
    const end = t + d;
    const s = this.src(this.bed('white'), t, 1, true);
    s.stop(end + 0.02);
    const bp = this.filter('bandpass', 300, 2);
    bp.frequency.setValueAtTime(300, t);
    bp.frequency.exponentialRampToValueAtTime(Math.min(7000, ctx.sampleRate * 0.4), end);
    const g = this.out(bus, 0, 0);
    g.gain.setValueAtTime(now0, t);
    g.gain.exponentialRampToValueAtTime(e.vel * 0.4, end - 0.01);
    g.gain.linearRampToValueAtTime(0, end + 0.015);
    s.connect(bp).connect(g);
    const lp = this.filter('lowpass', 400, 0.8);
    lp.frequency.setValueAtTime(400, t);
    lp.frequency.exponentialRampToValueAtTime(3000, end);
    const tg = ctx.createGain();
    tg.gain.setValueAtTime(now0, t);
    tg.gain.exponentialRampToValueAtTime(e.vel * 0.07, end - 0.01);
    tg.gain.linearRampToValueAtTime(0, end + 0.015);
    for (const iv of [0, 1, 6]) {
      const o = this.osc('sawtooth', freq(50 + iv), t, end + 0.02);
      o.detune.setValueAtTime(0, t);
      o.detune.linearRampToValueAtTime(1200, end);
      o.connect(lp);
    }
    const tOut = this.out(bus, 0, 1);
    lp.connect(tg).connect(tOut);
  }

  /** Reversed cymbal swell ending exactly at `t + d`. */
  private swell(e: Ev, t: number, d: number, bus: Bus): void {
    const buf = this.bed('swell');
    const len = Math.min(buf.duration, d);
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.start(t + d - len, buf.duration - len);
    s.stop(t + d + 0.01);
    const g = this.out(bus, e.pan, e.vel * 0.8);
    s.connect(g);
  }

  /** Impact: a sub drop with a low thump. */
  private boom(e: Ev, t: number, bus: Bus): void {
    const o = this.osc('sine', 72, t, t + 2.8);
    o.frequency.exponentialRampToValueAtTime(29, t + 1.8);
    const g = this.out(bus, 0, 0);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(e.vel * 0.9, t + 0.005);
    g.gain.exponentialRampToValueAtTime(now0, t + 2.6);
    const sh = this.shaper(1.6);
    o.connect(sh).connect(g);
    const s = this.src(this.bed('brown'), t);
    s.stop(t + 0.5);
    const lp = this.filter('lowpass', 280, 0.7);
    const g2 = this.out(bus, 0, 0);
    g2.gain.setValueAtTime(e.vel * 0.8, t);
    g2.gain.setTargetAtTime(0, t + 0.01, 0.08);
    s.connect(lp).connect(g2);
  }
}
