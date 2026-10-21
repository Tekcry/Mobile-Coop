import type { AudioEngine } from './audioEngine';

/** The buzz's level at the device (before distance; "quiet", Michael item 7) and how far it carries (m). */
export const JAM_BUZZ = { gain: 0.13, range: 24 } as const;

/**
 * (marlow-jammer, item 7, A4) The jammer's quiet buzzing / interference: one WebAudio synth voice (no asset) placed at
 * the nearest jammed device in the normal positional mix (`AudioEngine.spatial`). Both pages run it from their own
 * device state (the client's mirrors the host's), so both players hear it. A low mains hum (two detuned saws) chopped
 * by a fast square tremolo, plus a thin band of crackle; the voice is built once and its gain follows the jam.
 */
export class JamBuzz {
  private mix: GainNode | null = null;
  private pan: StereoPannerNode | null = null;
  private srcs: AudioScheduledSourceNode[] = [];
  private nodes: AudioNode[] = [];
  private level = 0;

  constructor(private a: AudioEngine) {}

  /** Per frame: `gain` 0 = silent (the voice idles at zero), `pan` -1..1. */
  update(gain: number, pan: number): void {
    const ctx = this.a.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (!this.mix) {
      if (gain <= 0) return;
      this.build(ctx);
    }
    // (fix round 1) automation only when something changes: nothing scheduled per frame while silent or steady
    const was = this.level;
    if (Math.abs(gain - was) > 0.002 || (gain === 0 && was !== 0)) {
      this.level = gain;
      this.mix!.gain.setTargetAtTime(gain, ctx.currentTime, 0.04);
    }
    if (gain <= 0 && was <= 0) return;
    const p = Math.max(-1, Math.min(1, pan));
    if (Math.abs(p - this.panV) > 0.01) {
      this.panV = p;
      this.pan?.pan.setTargetAtTime(p, ctx.currentTime, 0.05);
    }
  }

  private panV = 0;

  private build(ctx: AudioContext): void {
    const out = this.a.out('sfx', 1, 0, Infinity);
    if (!out) return;
    const mix = ctx.createGain();
    mix.gain.value = 0;
    const pan = ctx.createStereoPanner();
    mix.connect(pan).connect(out);
    // the hum: two detuned saws through a low-pass
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    const hum = ctx.createGain();
    hum.gain.value = 0.5;
    for (const f of [98, 147.8]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(lp);
      this.srcs.push(o);
    }
    lp.connect(hum);
    // the interference: a fast square tremolo on the hum
    const trem = ctx.createGain();
    trem.gain.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 23;
    const depth = ctx.createGain();
    depth.gain.value = 0.4;
    lfo.connect(depth).connect(trem.gain);
    hum.connect(trem).connect(mix);
    this.srcs.push(lfo);
    // the crackle: band-passed noise
    const n = this.a.noise();
    if (n) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 3200;
      bp.Q.value = 1.4;
      const ng = ctx.createGain();
      ng.gain.value = 0.25;
      n.connect(bp).connect(ng).connect(mix);
      this.srcs.push(n);
      this.nodes.push(bp, ng);
    }
    for (const s of this.srcs) s.start();
    this.nodes.push(lp, hum, trem, depth, out);
    this.mix = mix;
    this.pan = pan;
  }

  dispose(): void {
    for (const s of this.srcs) {
      try {
        s.stop();
      } catch {
        // never started
      }
      s.disconnect();
    }
    for (const n of this.nodes) n.disconnect();
    this.mix?.disconnect();
    this.pan?.disconnect();
    this.srcs = [];
    this.nodes = [];
    this.mix = null;
    this.pan = null;
  }
}
