/**
 * ADAPTIVE SCORE - reference framework (Web Audio API, TypeScript)
 * =================================================================
 *
 * A standalone, dependency-free adaptive music system in the noir-jazz / breakbeat idiom (acoustic bass, strings and
 * flutes against chopped electronic breaks), with:
 *
 *   - a 3-tier state machine (stealth / alert / combat) driven by one game variable, `updateAlertLevel(0..1)`,
 *     with hysteresis and hold times so the music never flaps;
 *   - VERTICAL mixing: every stem of a section loops continuously and in phase; states only move stem gains,
 *     with sample-accurate automation that starts on beat boundaries;
 *   - HORIZONTAL re-sequencing: section changes (stealth/alert bed <-> combat A <-> combat B) are quantised to the
 *     next beat, bar or phrase, with a lead-in fill (drum roll, glitch) that ends exactly on the boundary;
 *   - one master clock (`AudioContext.currentTime`) and an integer-sample musical grid, so nothing drifts.
 *
 * NOT wired into Night Shift. The game's agreed direction is `docs/audio/music-direction-v2.md` (five phases,
 * 84 / 168 BPM, the subtle noir mood). This file is a reference architecture; its musical content is placeholder
 * synthesis written for this file, not a reproduction of any existing track.
 *
 * ---------------------------------------------------------------------------------------------------------------
 * THREADS AND TIMING (why there are no pops and no drift)
 * ---------------------------------------------------------------------------------------------------------------
 *
 *  GAME THREAD           SCHEDULER (main thread timer)                 AUDIO RENDER THREAD
 *  -----------           -----------------------------                 -------------------
 *  updateAlertLevel(x)   every 25 ms: read the level, run the          plays sources and AudioParam automation
 *  writes ONE number --> state machine, and for anything due within -> at exact sample frames. Never waits on
 *  (no audio calls)      the look-ahead window, schedule source        JS; never sees a half-written decision.
 *                        starts/stops and gain ramps at FUTURE
 *                        audio-clock times on the musical grid.
 *
 *  1. One clock. Every time in this file is `ctx.currentTime` seconds. JS timers only decide WHEN WE SCHEDULE,
 *     never WHEN IT SOUNDS. Timer jitter (GC, frame spikes, a 1 Hz throttled background tab) is absorbed by the
 *     look-ahead: as long as the timer fires before `boundary - lookahead`, the event lands on the exact frame.
 *  2. An integer-sample grid. A beat is `round(sampleRate * 60 / bpm)` frames (140 BPM at 48 kHz = 20571 frames,
 *     i.e. 140.003 BPM). Every loop buffer is exactly `bars * barFrames` long, and every boundary is
 *     `t0 + n * frames / sampleRate`. Loop period and grid are the same integer, so loops and grid can never
 *     slide against each other, however long the session runs. (Computing the grid from the float 60/140 instead
 *     would drift by a fraction of a sample per loop and audibly flam after tens of minutes.)
 *  3. Loops never restart for vertical changes. All stems of a section start together with one `start(when)` and
 *     keep looping; muting is a gain of 0. Re-starting a source is the classic cause of phase drift and clicks.
 *  4. Gains never jump. Every change is a linear ramp of at least `minRamp` (8 ms) that starts on a beat boundary.
 *     `Fader` remembers its own ramp so a new ramp starts from the exact value the param will have at that time
 *     (`cancelAndHoldAtTime` where available; otherwise the new ramp waits for the old one to finish).
 *  5. Commit late, then never change. A transition is PLANNED as soon as the state changes but only COMMITTED
 *     (sources created, automation written) once its boundary is inside the look-ahead window. If the game changes
 *     its mind before that, the plan is just dropped: nothing was scheduled, so there is nothing to undo. If the main
 *     thread stalls past the point where the transition could still start on time, it is never started late (out of
 *     phase): it moves to the next boundary, and `missedBoundaries` counts it.
 *  6. Seamless loop buffers. Stems are rendered one bar longer than the loop and the tail is folded back onto the
 *     head, so reverb tails wrap and the loop point carries no step. Sources that start or stop mid-buffer get
 *     a short fade (never a hard edge).
 *  7. If the game runs in a Worker, send the level with `postMessage` (or a SharedArrayBuffer read with `Atomics`):
 *     the scheduler only ever reads the latest value, so ordering does not matter.
 */

// =================================================================================================================
// Types and configuration
// =================================================================================================================

export type MusicState = 'stealth' | 'alert' | 'combat';

/** A quantisation unit for transitions. */
export type GridUnit = 'beat' | 'bar' | 'phrase';

export interface ScoreConfig {
  bpm: number;
  beatsPerBar: number;
  /** Bars per phrase (down-transitions and section cycling wait for a phrase end). */
  phraseBars: number;
  /** Bars per loop buffer. Every stem in a section has exactly this length. */
  loopBars: number;
  /** Seconds of audio scheduled ahead of the clock (visible tab / hidden tab). */
  lookahead: number;
  lookaheadHidden: number;
  /** Scheduler timer period (ms). */
  tickMs: number;
  /** Shortest gain ramp (s): below ~5 ms a gain change can click. */
  minRamp: number;
  /** Vertical mix ramps last this many beats. */
  rampBeats: number;
  /** Section crossfade at a horizontal switch (s). Short: the new section's downbeat should hit. */
  sectionXfade: number;
  /** Combat alternates between its A and B sections every this many bars. */
  combatCycleBars: number;
  /** Hysteresis thresholds on the 0..1 alert level. */
  enterAlert: number;
  exitAlert: number;
  enterCombat: number;
  exitCombat: number;
  /** Seconds the level must stay below an exit threshold before the music steps down. */
  holdAlert: number;
  holdCombat: number;
  /** Master output level (linear). */
  master: number;
}

export const DEFAULT_CONFIG: ScoreConfig = {
  bpm: 140,
  beatsPerBar: 4,
  phraseBars: 4,
  loopBars: 4,
  lookahead: 0.15,
  lookaheadHidden: 1.5,
  tickMs: 25,
  minRamp: 0.008,
  rampBeats: 1,
  sectionXfade: 0.04,
  combatCycleBars: 8,
  enterAlert: 0.35,
  exitAlert: 0.2,
  enterCombat: 0.7,
  exitCombat: 0.5,
  holdAlert: 6,
  holdCombat: 4,
  master: 0.8,
};

/**
 * A stem: one looping buffer inside a section, with its gain per state. `scaleWithLevel` stems also follow the
 * continuous alert level inside a state (vertical intensity), e.g. strings swelling as suspicion grows.
 */
export interface StemDef {
  id: string;
  gains: Record<MusicState, number>;
  scaleWithLevel?: boolean;
  pan?: number;
}

/** A horizontal segment: a set of stems that loop together. */
export interface SectionDef {
  id: string;
  stems: StemDef[];
}

/**
 * The arrangement. Stealth and alert share one section (vertical layering only); combat has two sections that
 * alternate (horizontal re-sequencing). Fills are one-shot buffers placed so they END on a boundary.
 */
export const ARRANGEMENT = {
  sections: {
    bed: {
      id: 'bed',
      stems: [
        { id: 'pad', gains: { stealth: 0.55, alert: 0.45, combat: 0 } },
        { id: 'bassline', gains: { stealth: 0.75, alert: 0.8, combat: 0 } },
        { id: 'sparsePerc', gains: { stealth: 0.5, alert: 0.45, combat: 0 }, pan: -0.1 },
        { id: 'shimmer', gains: { stealth: 0, alert: 0.45, combat: 0 }, scaleWithLevel: true, pan: 0.2 },
        { id: 'synHats', gains: { stealth: 0, alert: 0.4, combat: 0 }, scaleWithLevel: true, pan: 0.25 },
        { id: 'fluteHigh', gains: { stealth: 0, alert: 0.3, combat: 0 }, scaleWithLevel: true, pan: -0.3 },
      ],
    },
    combatA: {
      id: 'combatA',
      stems: [
        { id: 'breakA', gains: { stealth: 0, alert: 0, combat: 0.85 } },
        { id: 'subBass', gains: { stealth: 0, alert: 0, combat: 0.8 } },
        { id: 'acousticKit', gains: { stealth: 0, alert: 0, combat: 0.5 }, pan: 0.1 },
        { id: 'slapBass', gains: { stealth: 0, alert: 0, combat: 0.6 } },
        { id: 'stringsFrantic', gains: { stealth: 0, alert: 0, combat: 0.35 }, pan: 0.25 },
      ],
    },
    combatB: {
      id: 'combatB',
      stems: [
        { id: 'breakB', gains: { stealth: 0, alert: 0, combat: 0.85 } },
        { id: 'subBass', gains: { stealth: 0, alert: 0, combat: 0.8 } },
        { id: 'acousticKit', gains: { stealth: 0, alert: 0, combat: 0.55 }, pan: 0.1 },
        { id: 'slapBass', gains: { stealth: 0, alert: 0, combat: 0.6 } },
        { id: 'fluteFrantic', gains: { stealth: 0, alert: 0, combat: 0.35 }, pan: -0.3 },
      ],
    },
  } satisfies Record<string, SectionDef>,
  /** One-shot transition material: id and length in beats. Each is scheduled to end on the boundary. */
  fills: {
    roll: 1, // up into combat, and between combat sections: a snare roll crescendo
    glitch: 1, // down out of combat: a stuttered, pitched-down break slice
  },
} as const;

type SectionId = keyof typeof ARRANGEMENT.sections;
type FillId = keyof typeof ARRANGEMENT.fills;

/** Which section plays each state. */
const SECTION_OF: Record<MusicState, SectionId> = { stealth: 'bed', alert: 'bed', combat: 'combatA' };

/** Buffers by stem or fill id. Loop buffers must be exactly `loopBars * barFrames` long (see `MusicalClock`). */
export type StemBuffers = Record<string, AudioBuffer>;

// =================================================================================================================
// The musical clock: one integer-sample grid on the audio clock
// =================================================================================================================

export class MusicalClock {
  /** Frames per beat, bar and phrase: integers, so the grid and the loop buffers share one period. */
  readonly beatFrames: number;
  readonly barFrames: number;
  readonly phraseFrames: number;
  /** Audio-clock time of beat 0 (set by `anchor`). */
  t0 = 0;

  constructor(
    readonly sampleRate: number,
    cfg: Pick<ScoreConfig, 'bpm' | 'beatsPerBar' | 'phraseBars'>,
  ) {
    this.beatFrames = Math.round((sampleRate * 60) / cfg.bpm);
    this.barFrames = this.beatFrames * cfg.beatsPerBar;
    this.phraseFrames = this.barFrames * cfg.phraseBars;
  }

  anchor(t0: number): void {
    this.t0 = t0;
  }

  /** Seconds per unit, derived from the integer frame counts (never from 60 / bpm). */
  seconds(unit: GridUnit, count = 1): number {
    const f = unit === 'beat' ? this.beatFrames : unit === 'bar' ? this.barFrames : this.phraseFrames;
    return (f * count) / this.sampleRate;
  }

  /** The first boundary of `unit` at or after time t. */
  nextBoundary(t: number, unit: GridUnit): number {
    const u = this.seconds(unit);
    // the small epsilon keeps a time that is exactly on a boundary on that boundary despite float error
    const n = Math.ceil((t - this.t0) / u - 1e-9);
    return this.t0 + Math.max(0, n) * u;
  }
}

// =================================================================================================================
// Fader: click-free gain automation that knows its own value at any future time
// =================================================================================================================

class Fader {
  readonly node: GainNode;
  // the last ramp we wrote: from (fromT, fromV) to (toT, toV)
  private fromT = 0;
  private fromV: number;
  private toT = 0;
  private toV: number;

  constructor(ctx: BaseAudioContext, initial: number, private minRamp: number) {
    this.node = ctx.createGain();
    this.node.gain.value = initial;
    this.fromV = this.toV = initial;
  }

  /** The value our automation gives at time t (linear ramps only, so this is exact). */
  valueAt(t: number): number {
    if (t <= this.fromT) return this.fromV;
    if (t >= this.toT) return this.toV;
    return this.fromV + ((this.toV - this.fromV) * (t - this.fromT)) / (this.toT - this.fromT);
  }

  /** The value it is heading to (for "is this change worth a ramp" checks). */
  get target(): number {
    return this.toV;
  }

  /** Ramp to `target`, starting at `start`, over `dur` seconds. Never a step. */
  rampTo(target: number, start: number, dur: number): void {
    const p = this.node.gain;
    const d = Math.max(this.minRamp, dur);
    let s = start;
    const hold = (p as AudioParam & { cancelAndHoldAtTime?: (t: number) => AudioParam }).cancelAndHoldAtTime;
    if (hold) {
      // freezes the param at exactly its automated value at s and removes everything after: safe mid-ramp
      hold.call(p, s);
    } else {
      // no cancel-and-hold (older Firefox): never interrupt a ramp; start when the previous one ends
      s = Math.max(s, this.toT);
    }
    const from = this.valueAt(s);
    p.setValueAtTime(from, s);
    p.linearRampToValueAtTime(target, s + d);
    this.fromT = s;
    this.fromV = from;
    this.toT = s + d;
    this.toV = target;
  }
}

// =================================================================================================================
// The state machine (pure: no Web Audio, unit-testable)
// =================================================================================================================

/**
 * Maps the continuous alert level to a state with hysteresis (different enter and exit thresholds) and hold times
 * (the level must stay low for a while before the music steps down). Rising is immediate; falling is patient.
 */
export class AlertStateMachine {
  state: MusicState = 'stealth';
  private lowSince = -1;

  constructor(private cfg: ScoreConfig) {}

  /** Feed the latest level at audio time `now`; returns the state the music should be heading to. */
  evaluate(level: number, now: number): MusicState {
    const c = this.cfg;
    // rising: at once
    if (level >= c.enterCombat) return this.set('combat');
    if (level >= c.enterAlert && this.state === 'stealth') return this.set('alert');
    // falling: only after the level stays under the exit threshold for the hold time
    const exit = this.state === 'combat' ? c.exitCombat : this.state === 'alert' ? c.exitAlert : -1;
    if (level < exit) {
      if (this.lowSince < 0) this.lowSince = now;
      const hold = this.state === 'combat' ? c.holdCombat : c.holdAlert;
      if (now - this.lowSince >= hold) {
        // combat steps down to alert or straight to stealth, depending on the level now
        return this.set(this.state === 'combat' && level >= c.exitAlert ? 'alert' : 'stealth');
      }
    } else {
      this.lowSince = -1;
    }
    return this.state;
  }

  private set(s: MusicState): MusicState {
    if (s !== this.state) this.lowSince = -1;
    this.state = s;
    return s;
  }
}

// =================================================================================================================
// A playing section: its looping sources and per-stem faders
// =================================================================================================================

class SectionPlayer {
  readonly out: Fader;
  private sources: AudioBufferSourceNode[] = [];
  readonly faders = new Map<string, Fader>();
  private stopped = false;

  constructor(
    private ctx: BaseAudioContext,
    readonly def: SectionDef,
    buffers: StemBuffers,
    dest: AudioNode,
    state: MusicState,
    level: number,
    private loopSec: number,
    private cfg: ScoreConfig,
  ) {
    const minRamp = cfg.minRamp;
    // the section bus starts silent; `start` opens it exactly on the boundary
    this.out = new Fader(ctx, 0, minRamp);
    this.out.node.connect(dest);
    for (const stem of def.stems) {
      const buf = buffers[stem.id];
      if (!buf) throw new Error(`adaptive score: no buffer for stem "${stem.id}"`);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.loopStart = 0;
      // the loop period is the grid's, not the buffer's (they are equal when the stems are authored correctly)
      src.loopEnd = loopSec;
      const fader = new Fader(ctx, stemGain(stem, state, level, cfg), minRamp);
      let tail: AudioNode = fader.node;
      if (stem.pan) {
        const p = ctx.createStereoPanner();
        p.pan.value = stem.pan;
        fader.node.connect(p);
        tail = p;
      }
      src.connect(fader.node);
      tail.connect(this.out.node);
      this.sources.push(src);
      this.faders.set(stem.id, fader);
    }
  }

  /** Start every stem on the same frame. `offset` keeps a returning section in phase with the grid if wanted. */
  start(when: number, fadeIn: number, offset = 0): void {
    const off = ((offset % this.loopSec) + this.loopSec) % this.loopSec;
    for (const s of this.sources) s.start(when, off);
    this.out.rampTo(1, when, fadeIn);
  }

  /** Fade the section bus out from `when` and stop the sources after the fade. */
  stop(when: number, fade: number): void {
    if (this.stopped) return;
    this.stopped = true;
    this.out.rampTo(0, when, fade);
    const end = when + Math.max(fade, 0.01) + 0.05;
    for (const s of this.sources) s.stop(end);
    // disconnect after the audio thread is done with the graph
    const ms = Math.max(0, (end - this.ctx.currentTime) * 1000) + 200;
    setTimeout(() => this.out.node.disconnect(), ms);
  }

  /** Vertical mix: ramp every stem to its gain for (state, level), starting at `when`. */
  mix(state: MusicState, level: number, when: number, dur: number): void {
    for (const stem of this.def.stems) {
      const f = this.faders.get(stem.id)!;
      const g = stemGain(stem, state, level, this.cfg);
      if (Math.abs(f.target - g) > 0.02) f.rampTo(g, when, dur);
    }
  }
}

/** A stem's gain for a state and level. `scaleWithLevel` stems grow from half to full across the alert band. */
function stemGain(stem: StemDef, state: MusicState, level: number, cfg: ScoreConfig): number {
  const g = stem.gains[state];
  if (!stem.scaleWithLevel || state !== 'alert') return g;
  const k = clamp01((level - cfg.enterAlert) / (cfg.enterCombat - cfg.enterAlert));
  return g * (0.5 + 0.5 * k);
}

/** Minimum time (s) between scheduling a sound and its start: below this, the audio thread may already be past it. */
const SAFETY = 0.005;

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

// =================================================================================================================
// The adaptive score
// =================================================================================================================

/** A transition waiting for its commit time. */
interface Pending {
  to: MusicState;
  /** The audible change happens exactly here. */
  boundary: number;
  /** Fill that ends on the boundary (or none). */
  fill: FillId | null;
  /** Schedule everything once the clock passes this. */
  commitAt: number;
  /** Combat A/B cycling uses the same machinery with a section override. */
  section?: SectionId;
}

export class AdaptiveScore {
  readonly cfg: ScoreConfig;
  readonly clock: MusicalClock;
  /** Boundaries skipped because the main thread stalled longer than the look-ahead (diagnostics). */
  missedBoundaries = 0;
  /** Called on the scheduler thread when a transition is committed; `when` is when it becomes audible. */
  onStateChange: ((state: MusicState, when: number) => void) | null = null;

  private master: GainNode;
  private fsm: AlertStateMachine;
  private buffers: StemBuffers | null = null;
  private current: SectionPlayer | null = null;
  private currentSection: SectionId = 'bed';
  /** The state the scheduled audio is in (or will be at the committed boundary). */
  private committed: MusicState = 'stealth';
  private pending: Pending | null = null;
  /** No vertical re-mix or cycling before this time (a committed transition owns the mix until then). */
  private busyUntil = 0;
  private nextCycleAt = Infinity;
  private lastMixAt = -1;
  /** Written by the game thread; read by the scheduler. A single number: no locking needed. */
  private level = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private hidden = false;
  private onVisibility = (): void => {
    this.hidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    this.tick();
  };

  constructor(
    private ctx: AudioContext,
    destination: AudioNode = ctx.destination,
    cfg: Partial<ScoreConfig> = {},
  ) {
    this.cfg = { ...DEFAULT_CONFIG, ...cfg };
    this.clock = new MusicalClock(ctx.sampleRate, this.cfg);
    this.fsm = new AlertStateMachine(this.cfg);
    this.master = ctx.createGain();
    this.master.gain.value = this.cfg.master;
    this.master.connect(destination);
  }

  // ---------------------------------------------------------------------------------------------------- public API

  /** Give the score its buffers (decoded files, or `renderDemoStems`). Loop lengths are checked against the grid. */
  load(buffers: StemBuffers): void {
    const loopFrames = this.clock.barFrames * this.cfg.loopBars;
    for (const sec of Object.values(ARRANGEMENT.sections)) {
      for (const stem of sec.stems) {
        const b = buffers[stem.id];
        if (!b) throw new Error(`adaptive score: missing stem "${stem.id}"`);
        if (b.sampleRate !== this.ctx.sampleRate) throw new Error(`adaptive score: "${stem.id}" is not at the context rate`);
        // a mismatch would drift against the grid: the source loops at loopEnd anyway, but warn the author
        if (Math.abs(b.length - loopFrames) > 1) console.warn(`adaptive score: "${stem.id}" is ${b.length} frames, the grid loop is ${loopFrames}`);
      }
    }
    for (const id of Object.keys(ARRANGEMENT.fills)) if (!buffers[id]) throw new Error(`adaptive score: missing fill "${id}"`);
    this.buffers = buffers;
  }

  /** Start in stealth on a fresh grid. Call after a user gesture (autoplay policy). */
  start(): void {
    if (!this.buffers || this.timer) return;
    const t0 = this.ctx.currentTime + 0.1;
    this.clock.anchor(t0);
    this.committed = this.fsm.state;
    this.currentSection = SECTION_OF[this.committed];
    this.current = this.makeSection(this.currentSection, this.committed);
    this.current.start(t0, 1.5);
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisibility);
    this.timer = setInterval(() => this.tick(), this.cfg.tickMs);
    this.tick();
  }

  /**
   * The one input from the game: 0 = nobody suspects anything, 1 = open combat. Cheap and safe to call every frame
   * from any game code; it only stores the number. The scheduler picks it up on its next tick.
   */
  updateAlertLevel(level: number): void {
    this.level = Number.isFinite(level) ? clamp01(level) : 0;
  }

  /** The state the music is in or committed to. */
  get state(): MusicState {
    return this.committed;
  }

  /** Fade out and stop everything. */
  stop(fade = 1): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisibility);
    this.pending = null;
    this.current?.stop(this.ctx.currentTime + 0.02, fade);
    this.current = null;
  }

  dispose(): void {
    this.stop(0.05);
    this.master.disconnect();
  }

  // ---------------------------------------------------------------------------------------------------- scheduler

  /** The scheduler tick (main thread, every `tickMs`). Decides; the audio thread executes. */
  private tick(): void {
    if (!this.current || !this.buffers || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const look = this.hidden ? this.cfg.lookaheadHidden : this.cfg.lookahead;
    const target = this.fsm.evaluate(this.level, now);

    // 1. Plan, re-plan or drop a state transition. Nothing is scheduled yet, so changing our mind costs nothing.
    if (this.pending && !this.pending.section && this.pending.to !== target) this.pending = null;
    if (!this.pending && target !== this.committed && now >= this.busyUntil) this.pending = this.plan(target, now, look);

    // 2. Commit the pending transition once its boundary (minus its fill) is inside the look-ahead window. If the
    //    main thread stalled past the point where the fill could still start on time, never start late and out of
    //    phase: re-plan onto the next boundary instead.
    if (this.pending && now >= this.pending.commitAt) {
      if (now > this.fillStart(this.pending) - SAFETY) {
        this.missedBoundaries++;
        this.pending = this.plan(this.pending.to, now, look);
      } else {
        this.commit(this.pending);
        this.pending = null;
      }
    }

    // 3. Horizontal cycling inside combat: A <-> B every `combatCycleBars`, with a roll into the switch.
    if (!this.pending && this.committed === 'combat' && now >= this.busyUntil) {
      const lead = this.clock.seconds('beat', ARRANGEMENT.fills.roll);
      // a stall past the roll's start: skip to the next cycle point rather than switch out of phase
      while (now > this.nextCycleAt - lead - SAFETY) {
        this.missedBoundaries++;
        this.nextCycleAt += this.clock.seconds('bar', this.cfg.combatCycleBars);
      }
      if (now >= this.nextCycleAt - lead - look) {
        const next: SectionId = this.currentSection === 'combatA' ? 'combatB' : 'combatA';
        this.commit({ to: 'combat', boundary: this.nextCycleAt, fill: 'roll', commitAt: now, section: next });
      }
    }

    // 4. Vertical intensity inside a state (alert stems follow the level), at most once per beat, on the beat.
    if (!this.pending && now >= this.busyUntil) {
      const beat = this.clock.nextBoundary(now + look, 'beat');
      if (beat > this.lastMixAt) {
        this.lastMixAt = beat;
        this.current.mix(this.committed, this.level, beat, this.clock.seconds('beat', this.cfg.rampBeats));
      }
    }
  }

  /** When a pending transition's first sound (its fill, or the boundary itself) starts. */
  private fillStart(p: Pending): number {
    return p.fill ? p.boundary - this.clock.seconds('beat', ARRANGEMENT.fills[p.fill]) : p.boundary;
  }

  /** Choose the boundary and fill for a move to `to`. */
  private plan(to: MusicState, now: number, look: number): Pending {
    const rank = { stealth: 0, alert: 1, combat: 2 } as const;
    const up = rank[to] > rank[this.committed];
    // rising: alert on the next beat; combat on the next bar with a roll into it. Falling: the next phrase end.
    const unit: GridUnit = up ? (to === 'combat' ? 'bar' : 'beat') : 'phrase';
    const fill: FillId | null = up ? (to === 'combat' ? 'roll' : null) : this.committed === 'combat' ? 'glitch' : null;
    const lead = fill ? this.clock.seconds('beat', ARRANGEMENT.fills[fill]) : 0;
    // the earliest boundary that still leaves room for the fill and the look-ahead
    const boundary = this.clock.nextBoundary(now + look + lead + 0.01, unit);
    return { to, boundary, fill, commitAt: boundary - lead - look };
  }

  /** Schedule a transition: the fill, the section switch and/or the vertical re-mix, all on the audio clock. */
  private commit(p: Pending): void {
    const buffers = this.buffers!;
    const beat = this.clock.seconds('beat');
    // the fill: a one-shot that ENDS exactly on the boundary
    if (p.fill) {
      const buf = buffers[p.fill]!;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = 0.9;
      src.connect(g).connect(this.master);
      src.start(Math.max(this.ctx.currentTime, p.boundary - this.clock.seconds('beat', ARRANGEMENT.fills[p.fill])));
      src.onended = (): void => g.disconnect();
    }
    const section = p.section ?? SECTION_OF[p.to];
    if (section !== this.currentSection) {
      // horizontal: the new section starts on the boundary at bar 1 of its loop; the old one gets out of the way
      const next = this.makeSection(section, p.to);
      next.start(p.boundary, this.cfg.sectionXfade);
      this.current!.stop(p.boundary, this.cfg.sectionXfade);
      this.current = next;
      this.currentSection = section;
      this.nextCycleAt = p.to === 'combat' ? p.boundary + this.clock.seconds('bar', this.cfg.combatCycleBars) : Infinity;
      this.busyUntil = p.boundary;
    } else {
      // vertical: same section, the stems ramp to the new state's mix starting on the boundary
      const dur = beat * this.cfg.rampBeats;
      this.current!.mix(p.to, this.level, p.boundary, dur);
      this.busyUntil = p.boundary + dur;
    }
    this.lastMixAt = p.boundary;
    if (p.to !== this.committed) {
      this.committed = p.to;
      this.onStateChange?.(p.to, p.boundary);
    }
  }

  private makeSection(id: SectionId, state: MusicState): SectionPlayer {
    const loopSec = this.clock.seconds('bar', this.cfg.loopBars);
    return new SectionPlayer(this.ctx, ARRANGEMENT.sections[id], this.buffers!, this.master, state, this.level, loopSec, this.cfg);
  }
}

// =================================================================================================================
// Demo stems: placeholder synthesis so the framework runs without assets
// =================================================================================================================

/**
 * Renders every stem and fill with an `OfflineAudioContext`, on the same integer grid as the score. Patterns and
 * voices are simple placeholders written for this file (swap in real recorded or produced stems of the same length).
 * Each loop is rendered one bar long and folded back onto its head, so tails wrap seamlessly.
 */
export async function renderDemoStems(sampleRate: number, cfg: ScoreConfig = DEFAULT_CONFIG): Promise<StemBuffers> {
  const clock = new MusicalClock(sampleRate, cfg);
  const loopFrames = clock.barFrames * cfg.loopBars;
  const s16 = clock.beatFrames / 4 / sampleRate;
  const out: StemBuffers = {};

  const render = async (id: string, frames: number, fold: boolean, draw: (c: OfflineAudioContext, at: (step: number) => number) => void): Promise<void> => {
    const tail = fold ? clock.barFrames : 0;
    const c = new OfflineAudioContext(2, frames + tail, sampleRate);
    draw(c, (step) => step * s16);
    const buf = await c.startRendering();
    out[id] = fold ? foldTail(buf, frames, sampleRate) : buf;
  };
  const steps = cfg.loopBars * cfg.beatsPerBar * 4;
  const loop = (id: string, draw: (c: OfflineAudioContext, at: (step: number) => number) => void): Promise<void> => render(id, loopFrames, true, draw);
  const hz = (semisFromD2: number): number => 73.416 * Math.pow(2, semisFromD2 / 12);

  // --- bed: stealth and alert
  // sustained layers ring one release past the loop end; the fold lays that release over the next attack, so the
  // linear fade-out and fade-in sum to a constant level across the loop point
  const loopSec = loopFrames / sampleRate;
  await loop('pad', (c) => {
    for (const n of [0, 7, 15]) tone(c, 'sawtooth', hz(n + 12), 0, loopSec + 2, 0.06, { lp: 600, attack: 2, release: 2, lfo: 0.25 });
  });
  await loop('bassline', (c, at) => {
    // a repetitive, tense figure: root, root, minor second, root, tritone pickup
    const fig = [[0, 0], [3, 0], [6, 1], [10, 0], [14, 6]] as const;
    for (let bar = 0; bar < cfg.loopBars; bar++) for (const [s, n] of fig) pluck(c, hz(n), at(bar * 16 + s), 0.35, 0.5, 900);
  });
  await loop('sparsePerc', (c, at) => {
    for (let s = 0; s < steps; s += 16) kick(c, at(s), 0.5);
    for (let s = 12; s < steps; s += 32) noiseHit(c, at(s), 0.15, 2500, 0.25, 0.4);
  });
  await loop('shimmer', (c) => {
    for (const n of [24, 31, 36]) tone(c, 'sawtooth', hz(n), 0, loopSec + 1.5, 0.03, { lp: 4000, attack: 1.5, release: 1.5, trem: 7 });
  });
  await loop('synHats', (c, at) => {
    for (let s = 0; s < steps; s++) if (s % 4 === 2 || s % 16 === 7 || s % 16 === 13) noiseHit(c, at(s), 0.03, 8000, s % 4 === 2 ? 0.2 : 0.12, 0);
  });
  await loop('fluteHigh', (c, at) => {
    const phrase = [[0, 36, 6], [8, 37, 2], [10, 36, 10], [32, 43, 4], [38, 42, 8]] as const;
    for (const [s, n, l] of phrase) flute(c, hz(n), at(s), at(l), 0.08);
  });

  // --- combat
  const breakPattern = (c: OfflineAudioContext, at: (s: number) => number, kicks: number[], ghosts: number[]): void => {
    for (let bar = 0; bar < cfg.loopBars; bar++) {
      for (let s = 0; s < 16; s++) {
        const t = at(bar * 16 + s);
        if (kicks.includes(s)) kick(c, t, 0.9);
        if (s === 4 || s === 12) noiseHit(c, t, 0.12, 1800, 0.7, 0.2);
        if (ghosts.includes(s)) noiseHit(c, t, 0.05, 2200, 0.2, 0.1);
        if (s % 2 === 0) noiseHit(c, t, 0.025, 9000, 0.12, 0);
      }
    }
  };
  await loop('breakA', (c, at) => breakPattern(c, at, [0, 7, 10], [3, 9, 14]));
  await loop('breakB', (c, at) => breakPattern(c, at, [0, 6, 11, 13], [2, 9, 15]));
  await loop('subBass', (c, at) => {
    for (let bar = 0; bar < cfg.loopBars; bar++) tone(c, 'sine', hz(bar % 2 ? 1 : 0) / 2, at(bar * 16), at(14), 0.5, { attack: 0.005, release: 0.05 });
  });
  await loop('acousticKit', (c, at) => {
    // tom and snare rolls in the gaps: a busy, human layer on top of the break
    for (let s = 0; s < steps; s++) if (s % 8 === 5 || s % 16 === 14 || s % 16 === 15) noiseHit(c, at(s), 0.08, 400 + (s % 3) * 250, 0.35, 0.1);
  });
  await loop('slapBass', (c, at) => {
    const riff = [[0, 0], [2, 12], [3, 0], [6, 3], [8, 0], [10, 6], [11, 5], [14, 3]] as const;
    for (let bar = 0; bar < cfg.loopBars; bar++) for (const [s, n] of riff) pluck(c, hz(n), at(bar * 16 + s), 0.18, 0.55, 2500);
  });
  await loop('stringsFrantic', (c, at) => {
    for (let s = 0; s < steps; s += 2) tone(c, 'sawtooth', hz(24 + ((s / 2) % 3)), at(s), at(1.6), 0.04, { lp: 3000, attack: 0.01, release: 0.04 });
  });
  await loop('fluteFrantic', (c, at) => {
    for (let s = 0; s < steps; s += 3) flute(c, hz(36 + ((s * 5) % 7)), at(s), at(2.5), 0.06);
  });

  // --- fills (one beat each; no fold: they are one-shots)
  await render('roll', clock.beatFrames, false, (c) => {
    const n = 12;
    for (let i = 0; i < n; i++) noiseHit(c, (i * clock.beatFrames) / n / sampleRate, 0.05, 1800, 0.15 + (0.7 * i) / n, 0.15);
  });
  await render('glitch', clock.beatFrames, false, (c) => {
    for (let i = 0; i < 6; i++) noiseHit(c, (i * clock.beatFrames) / 6 / sampleRate, 0.04, 1200 - i * 150, 0.5 - i * 0.06, 0.1);
  });
  return out;
}

/** Adds the rendered tail (past `frames`) back onto the head: a seamless loop with wrapped reverb and decays. */
function foldTail(buf: AudioBuffer, frames: number, sampleRate: number): AudioBuffer {
  const out = new AudioBuffer({ length: frames, numberOfChannels: buf.numberOfChannels, sampleRate });
  for (let ch = 0; ch < buf.numberOfChannels; ch++) {
    const src = buf.getChannelData(ch);
    const dst = new Float32Array(frames);
    dst.set(src.subarray(0, frames));
    for (let i = frames; i < src.length; i++) dst[i - frames]! += src[i]!;
    out.copyToChannel(dst, ch);
  }
  return out;
}

// --- tiny placeholder voices (OfflineAudioContext nodes; no per-sample JS)

interface ToneOpts {
  lp?: number;
  attack?: number;
  release?: number;
  /** Slow filter LFO (Hz) for pads. */
  lfo?: number;
  /** Amplitude tremolo (Hz) for shimmering strings. */
  trem?: number;
}

function tone(c: OfflineAudioContext, type: OscillatorType, f: number, t: number, dur: number, gain: number, o: ToneOpts = {}): void {
  const osc = c.createOscillator();
  osc.type = type;
  osc.frequency.value = f;
  const g = c.createGain();
  const a = o.attack ?? 0.01;
  const r = o.release ?? 0.05;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + a);
  g.gain.setValueAtTime(gain, Math.max(t + a, t + dur - r));
  g.gain.linearRampToValueAtTime(0, t + dur);
  let node: AudioNode = osc;
  if (o.lp) {
    const lp = c.createBiquadFilter();
    lp.frequency.value = o.lp;
    if (o.lfo) {
      const l = c.createOscillator();
      const d = c.createGain();
      l.frequency.value = o.lfo;
      d.gain.value = o.lp * 0.5;
      l.connect(d).connect(lp.frequency);
      l.start(t);
      l.stop(t + dur);
    }
    node.connect(lp);
    node = lp;
  }
  if (o.trem) {
    const tg = c.createGain();
    const l = c.createOscillator();
    const d = c.createGain();
    tg.gain.value = 0.7;
    l.frequency.value = o.trem;
    d.gain.value = 0.3;
    l.connect(d).connect(tg.gain);
    l.start(t);
    l.stop(t + dur);
    node.connect(tg);
    node = tg;
  }
  node.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.01);
}

/** Plucked bass: a saw through a closing low-pass, short decay (upright with a long `dur`, slap with a bright `lp`). */
function pluck(c: OfflineAudioContext, f: number, t: number, dur: number, gain: number, lp: number): void {
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = f;
  const filt = c.createBiquadFilter();
  filt.frequency.setValueAtTime(lp, t);
  filt.frequency.exponentialRampToValueAtTime(Math.max(120, lp / 6), t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(filt).connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function kick(c: OfflineAudioContext, t: number, gain: number): void {
  const osc = c.createOscillator();
  osc.frequency.setValueAtTime(160, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + 0.4);
}

/** Filtered noise hit (snares, hats, toms, glitch slices). `body` adds a 200 Hz tone for snares and toms. */
function noiseHit(c: OfflineAudioContext, t: number, dur: number, bp: number, gain: number, body: number): void {
  const len = Math.max(1, Math.round(dur * c.sampleRate));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  let seed = Math.round(t * 1e5) ^ 0x9e3779b9;
  for (let i = 0; i < len; i++) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    d[i] = (seed / 4294967296) * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = bp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t);
  if (body > 0) tone(c, 'triangle', 200, t, dur, body, { attack: 0.001, release: dur * 0.8 });
}

/** Breathy flute: a sine with delayed vibrato plus band-passed breath noise. */
function flute(c: OfflineAudioContext, f: number, t: number, dur: number, gain: number): void {
  const osc = c.createOscillator();
  osc.frequency.value = f;
  const vib = c.createOscillator();
  const depth = c.createGain();
  vib.frequency.value = 5.5;
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.3, dur));
  vib.connect(depth).connect(osc.frequency);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.06);
  g.gain.setValueAtTime(gain, Math.max(t + 0.06, t + dur - 0.08));
  g.gain.linearRampToValueAtTime(0, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.01);
  vib.start(t);
  vib.stop(t + dur + 0.01);
  noiseHit(c, t, Math.min(0.15, dur), f * 2, gain * 0.4, 0);
}

// =================================================================================================================
// Usage
// =================================================================================================================
//
//   const ctx = new AudioContext();
//   const score = new AdaptiveScore(ctx);
//   score.load(await renderDemoStems(ctx.sampleRate));     // or decoded stems of the same loop length
//   button.onclick = async () => { await ctx.resume(); score.start(); };
//   score.onStateChange = (s, when) => console.info(`music -> ${s} at ${when.toFixed(3)} s`);
//
//   // every game frame (or whenever it changes):
//   score.updateAlertLevel(highestGuardAwareness);         // 0..1
