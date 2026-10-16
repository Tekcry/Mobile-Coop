import type { AudioEngine } from '../../audioEngine';
import { Director, type DirectorAction, type GameAwareness } from '../director';

/**
 * The score in the game (Michael, 2026-10-16): the menu theme on the menu; in a mission, silence while nobody is
 * aware of you, the plucked broken hook in Cautious, the spotted hit into "Alert, under fire", its Evasion mix, and
 * the slow ladder back down. One mixed-down track per state (src/assets/music/game, made by `npm run music:orch`),
 * decoded once and looped on the music bus; the director (hysteresis) decides, this class only schedules fades.
 * Every loop starts on its clean opening (no tail of its own last bar), then hands over to the loop.
 */

interface TrackMeta {
  file: string;
  head?: string;
  headSec: number;
  loop: number;
  bpm: number;
  bars: number;
}
interface GameManifest {
  pad: number;
  tracks: Record<string, TrackMeta>;
}

const MANIFEST = Object.values(import.meta.glob('../../../assets/music/game/game.json', { eager: true, import: 'default' }))[0] as GameManifest | undefined;
const URLS = import.meta.glob('../../../assets/music/game/*.mp3', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
/** Decode at 32 kHz: a third less memory than 48 kHz, plenty for this music. */
const DECODE_RATE = 32000;
/** How often the director looks at the game (s). */
const TICK = 0.1;

type Name = 'menu' | 'caution' | 'alert' | 'evade' | 'spotted';

interface Decoded {
  meta: TrackMeta;
  loop: AudioBuffer;
  head: AudioBuffer | null;
}

/** One playing loop (its clean opening, then the loop) through its own gain. */
interface Voice {
  gain: GainNode;
  srcs: AudioBufferSourceNode[];
  t0: number;
  beat: number;
}

export class GameMusic {
  private readonly decoded = new Map<Name, Promise<Decoded | null>>();
  private readonly ready = new Map<Name, Decoded>();
  private bus: GainNode | null = null;
  private mode: 'off' | 'menu' | 'mission' = 'off';
  private menuV: Voice | null = null;
  private cautionV: Voice | null = null;
  private alertV: Voice | null = null;
  private evadeV: Voice | null = null;
  private readonly director = new Director();
  private game: GameAwareness = 'calm';
  private sinceTick = 0;
  /** The menu theme keeps playing through loading and fades once the match is running (a fade while the page is busy
   *  loading sounds like a cut). */
  private menuFadePending = false;

  constructor(private readonly audio: AudioEngine) {}

  /** The music state (debug overlay, tests). */
  get state(): string {
    return this.mode === 'mission' ? this.director.music : this.mode;
  }

  /** What is playing and what is decoded (tests). */
  get debug(): { menu: boolean; caution: boolean; alert: boolean; evade: boolean; ready: string } {
    return { menu: !!this.menuV, caution: !!this.cautionV, alert: !!this.alertV, evade: !!this.evadeV, ready: [...this.ready.keys()].sort().join(',') };
  }

  /** The main menu: the menu theme, from its opening. */
  menu(): void {
    this.mode = 'menu';
    this.stopMission(1);
    this.audio.whenReady(() => {
      void this.load('menu').then((d) => {
        if (!d || this.mode !== 'menu' || this.menuV) return;
        const ctx = this.audio.ctx!;
        this.menuV = this.start(d, ctx.currentTime + 0.1, 0);
        this.fade(this.menuV, 1, ctx.currentTime + 0.1, 2.5);
      });
    });
  }

  /** A mission starts: silence (Calm) until the guards stir; the mission's tracks load in the background. */
  mission(): void {
    this.mode = 'mission';
    const ctx = this.audio.ctx;
    this.menuFadePending = !!this.menuV;
    this.game = 'calm';
    this.director.reset(ctx?.currentTime ?? 0);
    // one at a time, so the decoding does not pile onto the match's loading
    this.audio.whenReady(() => {
      void (async () => {
        for (const n of ['caution', 'alert', 'spotted', 'evade'] as const) await this.load(n);
      })();
    });
  }

  /** Every frame in a mission, with the game's awareness (from `awareness()`). Cheap: the director runs at 10 Hz. */
  update(dt: number, game: GameAwareness): void {
    if (this.mode !== 'mission') return;
    if (this.menuFadePending) {
      // the first frame of the running match: the menu theme fades out gently
      this.menuFadePending = false;
      const c = this.audio.ctx;
      if (this.menuV && c) this.release(this.menuV, c.currentTime, 3.5);
      this.menuV = null;
    }
    this.game = game;
    this.sinceTick += dt;
    if (this.sinceTick < TICK) return;
    this.sinceTick = 0;
    const ctx = this.audio.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const acts = this.director.update(ctx.currentTime, this.game);
    for (let i = 0; i < acts.length; i++) this.apply(acts[i]!, ctx);
  }

  /** Leaving: everything fades out. */
  stop(): void {
    this.mode = 'off';
    this.stopMission(1);
    const ctx = this.audio.ctx;
    if (this.menuV && ctx) this.release(this.menuV, ctx.currentTime, 1);
    this.menuV = null;
  }

  // ------------------------------------------------------------------ the director's decisions

  private apply(a: DirectorAction, ctx: AudioContext): void {
    const now = ctx.currentTime;
    const caution = this.ready.get('caution');
    const alert = this.ready.get('alert');
    const evade = this.ready.get('evade');
    if (a.kind === 'stinger') {
      // the spotted build: a two-beat roll and climbing violins that rise into Alert's first downbeat
      const rise = this.ready.get('spotted');
      const at = now + 0.03;
      if (rise) this.oneShot(rise.loop, at, a.restart ? 1 : 0.6);
      if (!alert || !evade) return;
      if (a.restart || !this.alertV) {
        // Cautious fades under the build; Alert lands on its downbeat two beats later and settles in over two beats
        const beat = 60 / alert.meta.bpm;
        const start = at + 2 * beat;
        if (this.cautionV) this.release(this.cautionV, now, 2 * beat);
        this.cautionV = null;
        this.stopAlert(now);
        this.alertV = this.start(alert, start, 0.55);
        this.fade(this.alertV, 1, start, 2 * beat);
        this.evadeV = this.start(evade, start, 0);
      } else {
        // spotted again during Evasion: back to the full mix on the next bar
        const bar = this.nextBar(this.alertV, now);
        this.fade(this.alertV, 1, bar, this.alertV.beat);
        if (this.evadeV) this.fade(this.evadeV, 0, bar, this.alertV.beat);
      }
      return;
    }
    const { from, to } = a;
    if (to === 'alert') return; // handled with the stinger
    if (from === 'calm' && to === 'caution') {
      if (!caution) return;
      this.cautionV = this.start(caution, now + 0.05, 0);
      this.fade(this.cautionV, 1, now + 0.05, (60 / caution.meta.bpm) * 4);
    } else if (from === 'caution' && to === 'calm') {
      if (this.cautionV) this.release(this.cautionV, this.nextBar(this.cautionV, now), this.cautionV.beat * 16);
      this.cautionV = null;
    } else if (from === 'alert' && to === 'evade') {
      if (!this.alertV || !this.evadeV) return;
      const bar = this.nextBar(this.alertV, now);
      this.fade(this.alertV, 0, bar, this.alertV.beat * 8);
      this.fade(this.evadeV, 1, bar, this.alertV.beat * 8);
    } else if (from === 'evade' && to === 'caution') {
      if (this.alertV) this.stopAlert(this.nextBar(this.alertV, now), this.alertV.beat * 8);
      if (caution) {
        this.cautionV = this.start(caution, now + 0.05, 0);
        this.fade(this.cautionV, 1, now + 0.05, (60 / caution.meta.bpm) * 8);
      }
    }
  }

  // ------------------------------------------------------------------ playback

  private output(): GainNode | null {
    if (!this.bus) this.bus = this.audio.out('music', 1, 0, Infinity);
    return this.bus;
  }

  private load(n: Name): Promise<Decoded | null> {
    let p = this.decoded.get(n);
    if (!p) {
      p = this.decode(n);
      this.decoded.set(n, p);
    }
    return p;
  }

  private async decode(n: Name): Promise<Decoded | null> {
    const meta = MANIFEST?.tracks[n];
    if (!meta) return null;
    try {
      const decoder = new OfflineAudioContext(2, 1, DECODE_RATE);
      const get = async (file: string): Promise<AudioBuffer> => {
        const url = URLS[`../../../assets/music/game/${file}`];
        if (!url) throw new Error(`missing ${file}`);
        return decoder.decodeAudioData(await (await fetch(url)).arrayBuffer());
      };
      const d: Decoded = { meta, loop: await get(meta.file), head: meta.head ? await get(meta.head) : null };
      this.ready.set(n, d);
      return d;
    } catch (e) {
      console.warn('music', n, e);
      return null;
    }
  }

  /** Start a loop at `at`: the clean opening first, then the loop from the same point. */
  private start(d: Decoded, at: number, gain: number): Voice {
    const ctx = this.audio.ctx!;
    const g = ctx.createGain();
    g.gain.value = gain;
    g.connect(this.output() ?? ctx.destination);
    const pad = MANIFEST?.pad ?? 0.5;
    const srcs: AudioBufferSourceNode[] = [];
    const loop = ctx.createBufferSource();
    loop.buffer = d.loop;
    loop.loop = true;
    loop.loopStart = pad;
    loop.loopEnd = pad + d.meta.loop;
    loop.connect(g);
    if (d.head && d.meta.headSec) {
      const h = ctx.createBufferSource();
      h.buffer = d.head;
      h.connect(g);
      h.start(at, pad);
      h.stop(at + d.meta.headSec);
      srcs.push(h);
      loop.start(at + d.meta.headSec, pad + d.meta.headSec);
    } else loop.start(at, pad);
    srcs.push(loop);
    return { gain: g, srcs, t0: at, beat: 60 / d.meta.bpm };
  }

  private fade(v: Voice, to: number, at: number, dur: number): void {
    const p = v.gain.gain as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };
    const now = this.audio.ctx!.currentTime;
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now);
    else {
      p.cancelScheduledValues(now);
      p.setValueAtTime(p.value, now);
    }
    if (at > now) p.setValueAtTime(p.value, at);
    p.linearRampToValueAtTime(to, Math.max(at, now) + Math.max(0.02, dur));
  }

  /** Fade a voice out from `at` over `dur` and stop it. */
  private release(v: Voice, at: number, dur: number): void {
    this.fade(v, 0, at, dur);
    const end = Math.max(at, this.audio.ctx!.currentTime) + dur + 0.1;
    for (const s of v.srcs) {
      try {
        s.stop(end);
      } catch {
        // already stopped
      }
    }
    setTimeout(() => v.gain.disconnect(), (end - this.audio.ctx!.currentTime + 0.2) * 1000);
  }

  private stopAlert(at: number, dur = 0.2): void {
    if (this.alertV) this.release(this.alertV, at, dur);
    if (this.evadeV) this.release(this.evadeV, at, dur);
    this.alertV = null;
    this.evadeV = null;
  }

  private stopMission(dur: number): void {
    const ctx = this.audio.ctx;
    if (!ctx) return;
    if (this.cautionV) this.release(this.cautionV, ctx.currentTime, dur);
    this.cautionV = null;
    this.stopAlert(ctx.currentTime, dur);
  }

  private nextBar(v: Voice, now: number): number {
    const bar = v.beat * 4;
    const k = Math.ceil((now + 0.03 - v.t0) / bar);
    return v.t0 + Math.max(0, k) * bar;
  }

  private oneShot(buf: AudioBuffer, at: number, gain: number): void {
    const ctx = this.audio.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = gain;
    s.connect(g).connect(this.output() ?? ctx.destination);
    s.start(at);
    s.onended = () => g.disconnect();
  }
}
