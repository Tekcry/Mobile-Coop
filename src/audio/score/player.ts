import type { MusicState, Plan } from './arrange';
import { Director, type DirectorAction, type GameAwareness } from './director';
import type { Rendered } from './render';

/**
 * Plays the rendered V4 stems (docs/music/score-design.md Sections 5-8). Calm and Cautious share one looping group
 * (vertical layers); Alert and Evasion are a second group restarted from its top after each stinger (horizontal).
 * Fades start on the next beat or bar line of the group they belong to. At play time it is only looping buffers and
 * gain automation. The music bus has a mid cut, a limiter and a duck; gameplay sounds use their own bus.
 */

const dbToGain = (db: number): number => Math.pow(10, db / 20);

type Param = AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam };

/** A gain whose linear automation is tracked, so a new fade can start from wherever the old one had got to. */
class Fader {
  private v0: number;
  private t0 = 0;
  private v1: number;
  private t1 = 0;

  constructor(
    private readonly param: Param,
    v: number,
  ) {
    param.value = v;
    this.v0 = v;
    this.v1 = v;
  }

  valueAt(t: number): number {
    if (t <= this.t0) return this.v0;
    if (t >= this.t1) return this.v1;
    return this.v0 + ((this.v1 - this.v0) * (t - this.t0)) / (this.t1 - this.t0);
  }

  /** Fade to `target` over `dur` seconds, starting at `at` (>= now). */
  to(now: number, at: number, target: number, dur: number): void {
    const p = this.param;
    const vAt = this.valueAt(at);
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now);
    else {
      p.cancelScheduledValues(now);
      p.setValueAtTime(this.valueAt(now), now);
    }
    if (at > now) p.linearRampToValueAtTime(vAt, at);
    const end = at + Math.max(0.01, dur);
    p.linearRampToValueAtTime(target, end);
    this.v0 = vAt;
    this.t0 = at;
    this.v1 = target;
    this.t1 = end;
  }
}

export interface LayerRt {
  r: Rendered;
  group: 'menu' | 'low' | 'alert';
  user: GainNode;
  userValue: number;
  muted: boolean;
  state: Fader;
  stateNode: GainNode;
  src: AudioBufferSourceNode | null;
}

interface GroupRt {
  plan: Plan;
  layers: LayerRt[];
  bus: GainNode;
  t0: number;
  beat: number;
  bar: number;
  running: boolean;
}

export interface PlayerStatus {
  mode: 'idle' | 'menu' | 'mission' | 'shot';
  game: GameAwareness;
  music: MusicState;
  held: number;
  nextStep: number | null;
  group: string;
  bar: number;
  beat: number;
  bpm: number;
}

export class ScorePlayer {
  readonly ctx: AudioContext;
  /** Gameplay sounds (fake footsteps, voices) go here; they skip the music processing. */
  readonly sfxBus: GainNode;
  readonly musicVol: GainNode;
  private readonly master: GainNode;
  private readonly musicIn: GainNode;
  private readonly midEq: BiquadFilterNode;
  private readonly duckG: GainNode;
  readonly director = new Director();
  mode: PlayerStatus['mode'] = 'idle';
  game: GameAwareness = 'calm';
  midCut = true;
  private menu: GroupRt | null = null;
  private low: GroupRt | null = null;
  private alert: GroupRt | null = null;
  private stingerBuf: AudioBuffer | null = null;
  private stingerShortBuf: AudioBuffer | null = null;
  private shot: AudioBufferSourceNode | null = null;
  private timer = 0;
  onEvent: (msg: string) => void = () => {};

  constructor() {
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    this.ctx = ctx;
    // like the game: buses -> master -> a gentle master compressor
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(comp);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    // music: groups -> mid cut -> limiter -> duck -> music volume -> master
    this.musicIn = ctx.createGain();
    this.midEq = ctx.createBiquadFilter();
    this.midEq.type = 'peaking';
    this.midEq.frequency.value = 2200;
    this.midEq.Q.value = 0.8;
    this.midEq.gain.value = 0;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 3;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.15;
    this.duckG = ctx.createGain();
    this.musicVol = ctx.createGain();
    this.musicVol.gain.value = 0.5;
    this.musicIn.connect(this.midEq).connect(limiter).connect(this.duckG).connect(this.musicVol).connect(this.master);
  }

  // ------------------------------------------------------------ start / stop

  stopAll(): void {
    clearInterval(this.timer);
    this.timer = 0;
    const now = this.ctx.currentTime;
    for (const g of [this.menu, this.low, this.alert]) {
      if (!g) continue;
      g.bus.gain.setTargetAtTime(0, now, 0.05);
      for (const l of g.layers) l.src?.stop(now + 0.3);
      setTimeout(() => g.bus.disconnect(), 500);
    }
    this.shot?.stop(now + 0.05);
    this.shot = null;
    this.menu = this.low = this.alert = null;
    this.mode = 'idle';
  }

  private makeGroup(plan: Plan, rendered: Rendered[], kind: 'menu' | 'low' | 'alert', initial: MusicState | null): GroupRt {
    const bus = this.ctx.createGain();
    bus.connect(this.musicIn);
    const beat = 60 / plan.bpm;
    const layers = rendered.map((r): LayerRt => {
      const user = this.ctx.createGain();
      const stateNode = this.ctx.createGain();
      user.connect(stateNode).connect(bus);
      return {
        r,
        group: kind,
        user,
        userValue: 1,
        muted: false,
        state: new Fader(stateNode.gain, initial ? r.def.mix[initial] : 1),
        stateNode,
        src: null,
      };
    });
    return { plan, layers, bus, t0: 0, beat, bar: beat * 4, running: false };
  }

  private startGroup(g: GroupRt, at: number): void {
    for (const l of g.layers) {
      l.src?.stop(at);
      const s = this.ctx.createBufferSource();
      s.buffer = l.r.buffer;
      s.loop = true;
      s.connect(l.user);
      s.start(at);
      l.src = s;
    }
    g.t0 = at;
    g.running = true;
  }

  private stopGroup(g: GroupRt, at: number): void {
    for (const l of g.layers) {
      l.src?.stop(at);
      l.src = null;
    }
    g.running = false;
  }

  playMenu(plan: Plan, rendered: Rendered[]): void {
    this.stopAll();
    this.mode = 'menu';
    this.menu = this.makeGroup(plan, rendered, 'menu', null);
    this.startGroup(this.menu, this.ctx.currentTime + 0.1);
    this.setMid('calm');
  }

  playMission(low: Plan, lowR: Rendered[], alert: Plan, alertR: Rendered[], stinger: Rendered, stingerShort: Rendered): void {
    this.stopAll();
    this.mode = 'mission';
    this.low = this.makeGroup(low, lowR, 'low', 'calm');
    this.alert = this.makeGroup(alert, alertR, 'alert', 'alert');
    for (const l of this.alert.layers) l.state.to(this.ctx.currentTime, this.ctx.currentTime, 0, 0.01);
    this.stingerBuf = stinger.buffer;
    this.stingerShortBuf = stingerShort.buffer;
    this.game = 'calm';
    this.director.reset(this.ctx.currentTime);
    this.startGroup(this.low, this.ctx.currentTime + 0.1);
    this.setMid('calm');
    this.timer = window.setInterval(() => this.tick(), 50);
  }

  playShot(r: Rendered): void {
    this.stopAll();
    this.mode = 'shot';
    const s = this.ctx.createBufferSource();
    s.buffer = r.buffer;
    s.connect(this.musicIn);
    s.start(this.ctx.currentTime + 0.05);
    s.onended = () => {
      if (this.shot === s) {
        this.shot = null;
        this.mode = 'idle';
      }
    };
    this.shot = s;
    this.setMid('calm');
  }

  // ------------------------------------------------------------ live control

  setGame(state: GameAwareness): void {
    this.game = state;
    this.tick();
  }

  /** Audition the stinger on its own (no state change). */
  playStinger(short = false): void {
    const buf = short ? this.stingerShortBuf : this.stingerBuf;
    if (buf) this.oneShot(buf, this.ctx.currentTime + 0.02);
  }

  /** Dip the music by `db` for `hold` seconds (fast attack, gentle release). */
  duck(db: number, hold: number, release = 0.5): void {
    const p = this.duckG.gain as Param;
    const now = this.ctx.currentTime;
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(now);
    else {
      p.cancelScheduledValues(now);
      p.setValueAtTime(p.value, now);
    }
    p.setTargetAtTime(dbToGain(-db), now, 0.012);
    p.setTargetAtTime(1, now + hold, release / 3);
  }

  setMidCut(on: boolean): void {
    this.midCut = on;
    this.setMid(this.director.music);
  }

  layers(): LayerRt[] {
    return [this.menu, this.low, this.alert].flatMap((g) => g?.layers ?? []);
  }

  setLayerGain(l: LayerRt, v: number, muted = l.muted): void {
    l.userValue = v;
    l.muted = muted;
    l.user.gain.setTargetAtTime(muted ? 0 : v, this.ctx.currentTime, 0.03);
  }

  status(): PlayerStatus {
    const now = this.ctx.currentTime;
    const music = this.mode === 'mission' ? this.director.music : 'calm';
    const g = this.mode === 'menu' ? this.menu : music === 'alert' || music === 'evade' ? this.alert : this.low;
    let bar = 0;
    let beat = 0;
    if (g?.running && now >= g.t0) {
      const pos = (now - g.t0) / g.beat;
      const loopBeats = g.plan.bars * 4;
      const inLoop = pos % loopBeats;
      bar = Math.floor(inLoop / 4) + 1;
      beat = Math.floor(inLoop % 4) + 1;
    }
    return {
      mode: this.mode,
      game: this.game,
      music,
      held: this.director.heldFor(now),
      nextStep: this.director.nextStepIn(now),
      group: g?.plan.name ?? '',
      bar,
      beat,
      bpm: g?.plan.bpm ?? 0,
    };
  }

  // ------------------------------------------------------------ the director's decisions

  private tick(): void {
    if (this.mode !== 'mission') return;
    const acts = this.director.update(this.ctx.currentTime, this.game);
    for (const a of acts) this.apply(a);
  }

  private next(g: GroupRt, unit: number, now: number): number {
    if (!g.running) return now + 0.02;
    const k = Math.ceil((now + 0.03 - g.t0) / unit);
    return g.t0 + Math.max(0, k) * unit;
  }

  private fade(g: GroupRt, state: MusicState | null, at: number, dur: number): void {
    const now = this.ctx.currentTime;
    for (const l of g.layers) l.state.to(now, at, state ? l.r.def.mix[state] : 0, dur);
  }

  private oneShot(buf: AudioBuffer, at: number): void {
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    s.connect(this.musicIn);
    s.start(at);
  }

  private setMid(state: MusicState): void {
    const db = !this.midCut ? 0 : state === 'alert' ? -2 : -4;
    this.midEq.gain.setTargetAtTime(db, this.ctx.currentTime, 0.2);
  }

  private apply(a: DirectorAction): void {
    const low = this.low;
    const alert = this.alert;
    if (!low || !alert) return;
    const now = this.ctx.currentTime;
    if (a.kind === 'stinger') {
      const at = now + 0.03;
      this.oneShot(a.short ? this.stingerShortBuf! : this.stingerBuf!, at);
      if (a.restart) {
        // Calm / Cautious dip out under the hit; Alert lands on its downbeat two beats later
        this.fade(low, null, now, 0.3);
        const start = at + 2 * alert.beat;
        this.startGroup(alert, start);
        for (const l of alert.layers) l.state.to(now, start, l.r.def.mix.alert, 0.01);
        this.onEvent(`Spotted: ${a.short ? 'short' : 'full'} stinger, Alert from its top`);
      } else {
        this.fade(alert, 'alert', this.next(alert, alert.bar, now), alert.bar * 0.25);
        this.onEvent('Spotted again: short stinger, brass and lead back on the next bar');
      }
      this.setMid('alert');
      return;
    }
    const { from, to } = a;
    if (to === 'alert') return; // handled with the stinger
    if (from === 'calm' && to === 'caution') {
      this.fade(low, 'caution', this.next(low, low.beat, now), low.bar);
    } else if (from === 'caution' && to === 'calm') {
      this.fade(low, 'calm', this.next(low, low.bar, now), low.bar * 4);
    } else if (from === 'alert' && to === 'evade') {
      this.fade(alert, 'evade', this.next(alert, alert.bar, now), alert.bar * 2);
    } else if (from === 'evade' && to === 'caution') {
      const at = this.next(alert, alert.bar, now);
      this.fade(alert, null, at, alert.bar * 2);
      this.stopGroup(alert, at + alert.bar * 2 + 0.2);
      this.fade(low, 'caution', this.next(low, low.bar, now), low.bar * 2);
    }
    this.setMid(to);
    this.onEvent(`Music: ${from} -> ${to}`);
  }
}
