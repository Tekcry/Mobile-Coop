/**
 * WebAudio engine: buses (sfx, music, ui) -> compressor -> destination.
 * Everything is synthesised; no audio files. The context is created/resumed on the first
 * user gesture (required on iOS). Voice count is capped so heavy fights cannot overload phones.
 */
export interface Volumes {
  master: number;
  sfx: number;
  music: number;
  ui: number;
}

export type Bus = 'sfx' | 'music' | 'ui';

const MAX_VOICES = 28;

export class AudioEngine {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private buses: Partial<Record<Bus, GainNode>> = {};
  private vol: Volumes = { master: 0.8, sfx: 1, music: 0.5, ui: 0.7 };
  private voices = 0;
  private noiseBuf: AudioBuffer | null = null;
  private lastPlay = new Map<string, number>();
  /** Listener for positional sounds: position + right vector (XZ). */
  readonly listener = { x: 0, y: 0, z: 0, rx: 1, rz: 0 };
  private onReady: (() => void)[] = [];

  constructor() {
    const unlock = (): void => {
      this.ensure();
      void this.ctx?.resume();
      if (this.ctx?.state === 'running') {
        window.removeEventListener('pointerdown', unlock, true);
        window.removeEventListener('keydown', unlock, true);
      }
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  /** Called by gamepad input too (a controller button counts as a gesture on most browsers). */
  ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try {
      this.ctx = new AC({ latencyHint: 'interactive' });
    } catch {
      return null;
    }
    const ctx = this.ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.connect(comp);
    for (const b of ['sfx', 'music', 'ui'] as const) {
      const g = ctx.createGain();
      g.connect(this.master);
      this.buses[b] = g;
    }
    // 1 s of white noise reused by every noise-based voice
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    this.applyVolumes();
    for (const fn of this.onReady.splice(0)) fn();
    return ctx;
  }

  whenReady(fn: () => void): void {
    if (this.ctx) fn();
    else this.onReady.push(fn);
  }

  setVolumes(v: Volumes): void {
    this.vol = { ...v };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.02);
    this.buses.sfx?.gain.setTargetAtTime(this.vol.sfx, t, 0.02);
    this.buses.music?.gain.setTargetAtTime(this.vol.music * 0.6, t, 0.02);
    this.buses.ui?.gain.setTargetAtTime(this.vol.ui, t, 0.02);
  }

  get running(): boolean {
    return this.ctx?.state === 'running';
  }

  /** Throttle identical sounds (e.g. many impacts in one frame). */
  allow(key: string, minGap: number): boolean {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || this.voices >= MAX_VOICES) return false;
    const now = ctx.currentTime;
    const last = this.lastPlay.get(key) ?? -1;
    if (now - last < minGap) return false;
    this.lastPlay.set(key, now);
    return true;
  }

  /** Output node for a voice: gain (+ stereo pan for positional sounds) into a bus. */
  out(bus: Bus, gain: number, pan = 0, duration = 1): GainNode | null {
    const ctx = this.ctx;
    const b = this.buses[bus];
    if (!ctx || !b) return null;
    const g = ctx.createGain();
    g.gain.value = gain;
    if (pan !== 0 && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p);
      p.connect(b);
    } else {
      g.connect(b);
    }
    if (!Number.isFinite(duration)) return g; // persistent (music bus)
    this.voices++;
    setTimeout(() => {
      this.voices--;
      g.disconnect();
    }, (duration + 0.1) * 1000);
    return g;
  }

  noise(): AudioBufferSourceNode | null {
    if (!this.ctx || !this.noiseBuf) return null;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    s.loopStart = Math.random() * 0.5;
    return s;
  }

  /** Distance attenuation + pan for a world position relative to the listener. */
  spatial(x: number, y: number, z: number, range = 40): { gain: number; pan: number; dist: number } {
    const L = this.listener;
    const dx = x - L.x;
    const dy = y - L.y;
    const dz = z - L.z;
    const dist = Math.hypot(dx, dy, dz);
    const gain = Math.max(0, 1 / (1 + (dist / (range * 0.25)) ** 2));
    const pan = dist > 0.5 ? ((dx * L.rx + dz * L.rz) / dist) * 0.8 : 0;
    return { gain, pan, dist };
  }
}
