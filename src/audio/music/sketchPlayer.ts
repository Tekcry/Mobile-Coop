/**
 * Plays one V3 sketch: three pre-rendered stems (MP3, decoded once) looping in sync, each through its own gain, which
 * the caller crossfades by threat. No synthesis and no scheduler: once started, the main thread does nothing per frame.
 *
 * Stems decode at `DECODE_RATE` (32 kHz): the render rolls the top off below 11 kHz, so nothing audible is lost, and the
 * decoded PCM is a third smaller than at 48 kHz (about 47 MB for three 61 s stereo stems). Only one sketch is kept.
 */
import { fadeTime, loopRegion, type StemGains } from './stemMix';

export const DECODE_RATE = 32000;

export interface SketchFiles {
  pad: number;
  loop: number;
  /** URLs of the calm, caution and alert stems. */
  urls: readonly [string, string, string];
}

export interface PlayerStats {
  /** Fetch + decode time (ms) of the last load, on this device. */
  decodeMs: number;
  /** Decoded PCM held in memory (bytes, Float32). */
  pcmBytes: number;
  /** Compressed bytes fetched. */
  fileBytes: number;
}

export class SketchPlayer {
  private bus: GainNode;
  private gains: GainNode[] = [];
  private srcs: AudioBufferSourceNode[] = [];
  private buffers = new Map<string, AudioBuffer>();
  private current: StemGains = [1, 0, 0];
  stats: PlayerStats = { decodeMs: 0, pcmBytes: 0, fileBytes: 0 };

  constructor(
    private ctx: BaseAudioContext,
    out: AudioNode,
  ) {
    this.bus = ctx.createGain();
    this.bus.connect(out);
  }

  /** Fetch and decode a sketch's stems (kept until another sketch loads). */
  async load(f: SketchFiles): Promise<AudioBuffer[]> {
    const t0 = performance.now();
    let fileBytes = 0;
    const decoder = typeof OfflineAudioContext === 'undefined' ? this.ctx : new OfflineAudioContext(2, 1, DECODE_RATE);
    const out = await Promise.all(
      f.urls.map(async (u) => {
        const hit = this.buffers.get(u);
        if (hit) return hit;
        const data = await (await fetch(u)).arrayBuffer();
        fileBytes += data.byteLength;
        return decoder.decodeAudioData(data);
      }),
    );
    // drop the previous sketch's PCM
    this.buffers.clear();
    f.urls.forEach((u, i) => this.buffers.set(u, out[i]!));
    if (fileBytes) this.stats.decodeMs = performance.now() - t0;
    this.stats.fileBytes = fileBytes || this.stats.fileBytes;
    this.stats.pcmBytes = out.reduce((a, b) => a + b.length * b.numberOfChannels * 4, 0);
    return out;
  }

  /** Start a sketch's stems together at the given gains (stops whatever was playing). */
  async play(f: SketchFiles, gains: StemGains): Promise<void> {
    const bufs = await this.load(f);
    this.stop(0.15);
    const { start, end } = loopRegion(f.pad, f.loop);
    const when = this.ctx.currentTime + 0.1;
    this.gains = [];
    this.srcs = [];
    for (let i = 0; i < 3; i++) {
      const g = this.ctx.createGain();
      g.gain.value = gains[i]!;
      g.connect(this.bus);
      const s = this.ctx.createBufferSource();
      s.buffer = bufs[i]!;
      s.loop = true;
      s.loopStart = start;
      s.loopEnd = end;
      s.connect(g);
      s.start(when, start);
      this.gains.push(g);
      this.srcs.push(s);
    }
    this.current = gains;
  }

  /** Crossfade to new stem gains: fast when threat rises, slow when it falls, unless `seconds` is given. */
  setGains(to: StemGains, seconds?: number): void {
    const dur = seconds ?? fadeTime(this.current, to);
    const t = this.ctx.currentTime;
    for (let i = 0; i < this.gains.length; i++) {
      const p = this.gains[i]!.gain;
      p.cancelScheduledValues(t);
      p.setValueAtTime(p.value, t);
      // a time constant of a third of the fade: within 5 % of the target by the end
      p.setTargetAtTime(to[i]!, t, Math.max(0.01, dur / 3));
    }
    this.current = to;
  }

  get gainsNow(): StemGains {
    return this.current;
  }

  get playing(): boolean {
    return this.srcs.length > 0;
  }

  stop(fade = 0.3): void {
    const t = this.ctx.currentTime;
    for (const g of this.gains) {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.setTargetAtTime(0, t, fade / 3);
    }
    for (const s of this.srcs) s.stop(t + fade + 0.05);
    this.gains = [];
    this.srcs = [];
  }
}
