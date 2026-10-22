// (menu-ui slice 6, step 11) The cinematic menu background's shot director: pure, Babylon-free, no allocation in
// `update`. The stage (`menuScene.ts`) reads `shot`, `t` and `fade` every frame and applies them.
import { mulberry } from '../core/rng';

/** Which screen the menu stage sits behind. */
export type MenuContext = 'title' | 'main' | 'loadout' | 'lobby';

/** The kind of camera pass (the path itself is the hero shot's start and end pose in `menuSets.ts`). */
export type MoveKind = 'push' | 'dolly' | 'tilt' | 'crane' | 'arc' | 'orbit' | 'track' | 'static';

export interface ShotDef {
  id: string;
  /** The hero shot in `menuSets.ts` (its id), or 'stage' (today's diorama). */
  setup: string;
  /** Seconds the shot runs before the next one (cycling contexts). */
  durS: number;
  /** The pass, as a label (`amount`: its size, for the docs and tests; the stage eases from the hero shot's start
   *  pose to its end pose). */
  move: { kind: MoveKind; amount: number };
  /** Light colour family: a change between shots cuts through black instead of the crossfade. */
  light?: string;
  /** Contexts that may show it. */
  contexts: readonly MenuContext[];
  solo: boolean;
  /** A held shot that plays once and stays on its last frame (the title), instead of easing back and forth. */
  once?: boolean;
  /** The main cycle's opening shot: played first, never picked again. */
  intro?: boolean;
}

/**
 * Slice 6 (Michael 2026-10-19, overriding SPEC 8.1's rooms): cinematic shots of Wren in a black void. T1 the title: her
 * face and goggle filling the frame, the goggle flickering on (plays once, then holds). T2 the main menu's opening: the
 * same shot carried on from the title without a cut, easing back to clear the list, held. Then H1-H6 equipment macros
 * in a seeded deck (goggle unit, front plate, magazine pouches, belt pouches, thigh holster, back plate), each its own angle,
 * lens and pass; every change crossfades through black. S6 loadout and S7 lobby keep today's stage. (menu-notes slice 3)
 * W1 / W2 join the deck: the rifle and the pistol in her hands (each hero shot names its hold, menuSets.ts). (slice 4d)
 * W3 on the sights, the one tactical mock-up Michael picked (M4: "X5 only").
 */
export const SHOTS: readonly ShotDef[] = [
  { id: 'T1', setup: 'T1', durS: 14, move: { kind: 'push', amount: 0.08 }, light: 'void', contexts: ['title'], solo: true, once: true },
  { id: 'T2', setup: 'T2', durS: 10, move: { kind: 'push', amount: -0.18 }, light: 'void', contexts: ['main'], solo: true, intro: true },
  { id: 'H1', setup: 'H1', durS: 11, move: { kind: 'arc', amount: 0.3 }, light: 'void', contexts: ['main'], solo: true },
  { id: 'H2', setup: 'H2', durS: 11, move: { kind: 'push', amount: 0.15 }, light: 'void', contexts: ['main'], solo: true },
  { id: 'H3', setup: 'H3', durS: 11, move: { kind: 'track', amount: 0.14 }, light: 'void', contexts: ['main'], solo: true },
  { id: 'H4', setup: 'H4', durS: 12, move: { kind: 'track', amount: 0.15 }, light: 'void', contexts: ['main'], solo: true },
  { id: 'H5', setup: 'H5', durS: 11, move: { kind: 'orbit', amount: 0.35 }, light: 'void', contexts: ['main'], solo: true },
  { id: 'H6', setup: 'H6', durS: 11, move: { kind: 'arc', amount: 0.4 }, light: 'void', contexts: ['main'], solo: true },
  // (menu-notes slice 3) the weapons in her hands: the rifle at low ready, the pistol at compressed ready
  { id: 'W1', setup: 'W1', durS: 12, move: { kind: 'arc', amount: 0.3 }, light: 'void', contexts: ['main'], solo: true },
  { id: 'W2', setup: 'W2', durS: 12, move: { kind: 'tilt', amount: 0.09 }, light: 'void', contexts: ['main'], solo: true },
  // (menu-notes slice 4d, Michael's M4: "X5 only") on the sights: the rifle shouldered, aiming into the dark
  { id: 'W3', setup: 'W3', durS: 12, move: { kind: 'arc', amount: 0.13 }, light: 'void', contexts: ['main'], solo: true },
  { id: 'S6', setup: 'stage', durS: 14, move: { kind: 'static', amount: 0 }, contexts: ['loadout'], solo: true },
  { id: 'S7', setup: 'stage', durS: 14, move: { kind: 'static', amount: 0 }, contexts: ['lobby'], solo: false },
];

/** Crossfade through black: the outgoing shot's last half and the incoming shot's first half (s). */
export const XFADE_S = 1.6;
/** Black hold between shots whose light differs (s). */
export const CUT_S = 0.4;
/** `?menuClock=fast`. */
export const FAST_CLOCK = 8;

/**
 * (menu-notes slice 4a, Michael's M1) The title in full darkness until the first press, which strikes the goggle in the
 * dark on the title close-up, then brings the lights up before the main menu's opening shot. Seconds of director time
 * after the press: the flicker, the goggle alone, the lights rising.
 */
export const IGNITE = { flickerS: 2.4, holdS: 0.6, riseS: 1.8 } as const;
export const IGNITE_S = IGNITE.flickerS + IGNITE.holdS + IGNITE.riseS;

/** The title's phase: 'none' (no title this launch: lit from the start), 'dark' (waiting for the press), 'ignite' (the
 *  goggle flicker and the lights coming up), 'done'. */
export type TitlePhase = 'none' | 'dark' | 'ignite' | 'done';

/** The goggle level `s` seconds after the press (pure): the authored flicker (`goggleLevel`), then on. */
export function igniteGlow(s: number): number {
  return goggleLevel(s, 0, IGNITE.flickerS);
}

/** The void lights' level `s` seconds after the press (pure): off through the flicker and the hold, then eased up. */
export function igniteLit(s: number): number {
  const r = s - (IGNITE.flickerS + IGNITE.holdS);
  return r <= 0 ? 0 : easeInOut(r / IGNITE.riseS);
}

export interface DirectorOpts {
  shots?: readonly ShotDef[];
  seed: number;
  reducedMotion: boolean;
  context: MenuContext;
  /** `?menuShot=<id>`: holds that shot on the title / main contexts. */
  force?: string | null;
  /** `?menuT=<0..1>`: freezes a held shot at that time (screenshots, contact sheets). */
  freezeT?: number | null;
}

export interface Director {
  /** The shot on screen. */
  readonly shot: ShotDef;
  /** Normalised time in the shot 0..1 (held shots ping-pong with an ease, so the move never jumps). */
  readonly t: number;
  /** Black overlay alpha 0..1. */
  readonly fade: number;
  /** The shot after this one (the same shot on held contexts). */
  readonly next: ShotDef;
  readonly context: MenuContext;
  /** Shot changes so far (tests and the debug hook). */
  readonly changes: number;
  /** (slice 4a) The title's phase (once per director: the title shows once per launch). */
  readonly titlePhase: TitlePhase;
  /** (slice 4a) Seconds since the press while the goggle strikes (0 before). */
  readonly igniteT: number;
  /** (slice 4a) The void lights' level 0..1 (0 on the dark title). */
  readonly lit: number;
  /** (slice 4a) The goggle level 0..1 the title phase sets, or -1: the shot decides (its `goggleOn`). */
  readonly glow: number;
  /** (slice 4c) Seconds until the title's lights are fully up: the whole strike while dark, 0 once done / no title. */
  readonly titleLeftS: number;
  update(dtS: number): void;
  setContext(c: MenuContext): void;
  /** (slice 4c, A3) A second press during the strike: straight to the lit main menu on the next update. */
  skipTitle(): void;
}

const smooth = (x: number): number => x * x * (3 - 2 * x);

class ShotDirector implements Director {
  shot: ShotDef;
  next: ShotDef;
  t = 0;
  fade = 0;
  context: MenuContext;
  changes = 0;
  titlePhase: TitlePhase = 'none';
  igniteT = 0;
  lit = 1;
  glow = -1;
  /** The context asked for while the goggle strikes (entered when it is done). */
  private pending: MenuContext | null = null;
  private readonly shots: readonly ShotDef[];
  private readonly main: ShotDef[];
  private readonly rng: () => number;
  private readonly reduced: boolean;
  private readonly forced: ShotDef | null;
  /** The main cycle's own state (kept while a sub-context shows its shot). */
  private mainShot: ShotDef;
  private mainNext: ShotDef;
  private mainClock = 0;
  private mainFadeIn = false;
  /** Seconds left of the black hold of a cut (main cycle). */
  private black = 0;
  /** A held context's clock. */
  private holdClock = 0;
  /** Main shots shown this round (bit per main index): every shot plays once before any plays again. */
  private used = 0;
  /** The intro shots' bits (always counted as used). */
  private introMask = 0;
  private readonly freezeT: number | null;

  constructor(o: DirectorOpts) {
    this.shots = o.shots ?? SHOTS;
    this.rng = mulberry(o.seed);
    this.reduced = o.reducedMotion;
    this.freezeT = o.freezeT ?? null;
    this.forced = o.force ? (this.shots.find((s) => s.id === o.force) ?? null) : null;
    this.main = this.shots.filter((s) => s.contexts.includes('main'));
    if (!this.main.length) throw new Error('menuShots: no main shots');
    // the intro (T2) opens the cycle, else the first main shot in the table
    for (let i = 0; i < this.main.length; i++) if (this.main[i]!.intro) this.introMask |= 1 << i;
    this.mainShot = this.main.find((m) => m.intro) ?? this.main[0]!;
    this.used = this.introMask | (1 << this.main.indexOf(this.mainShot));
    this.mainNext = this.pick(this.mainShot);
    this.context = o.context;
    this.shot = this.mainShot;
    this.next = this.mainNext;
    this.enter(o.context);
    this.changes = 0;
  }

  /** A seeded pick from the main shots not yet shown this round (a new round starts when all have played; never
   *  `cur` again straight away). Marks the pick as used. */
  private pick(cur: ShotDef): ShotDef {
    const n = this.main.length;
    if (n < 2) return cur;
    const ci = this.main.indexOf(cur);
    const all = (1 << n) - 1;
    if ((this.used | (1 << ci)) === all) this.used = (1 << ci) | this.introMask;
    let free = 0;
    for (let i = 0; i < n; i++) if (!(this.used & (1 << i)) && i !== ci) free++;
    let k = Math.floor(this.rng() * free);
    for (let i = 0; i < n; i++) {
      if (this.used & (1 << i) || i === ci) continue;
      if (k-- === 0) {
        this.used |= 1 << i;
        return this.main[i]!;
      }
    }
    return cur;
  }

  /** The shot a context holds (title, loadout, lobby, forced, reduced motion). */
  private held(c: MenuContext): ShotDef | null {
    if (this.forced && (c === 'main' || c === 'title')) return this.forced;
    if (c === 'main') return this.reduced ? this.mainShot : null;
    // (heap-asserts) a plain loop: update() calls this every frame, and find()'s closure over `c` allocated ~96 B a frame
    for (let i = 0; i < this.shots.length; i++) if (this.shots[i]!.contexts.includes(c)) return this.shots[i]!;
    return this.mainShot;
  }

  private enter(c: MenuContext): void {
    // (slice 4a) the first title is dark until the press
    if (c === 'title' && this.titlePhase === 'none') {
      this.titlePhase = 'dark';
      this.lit = 0;
      this.glow = 0;
    }
    const h = this.held(c);
    this.holdClock = 0;
    this.fade = 0;
    const prev = this.shot;
    if (h) {
      this.shot = h;
      this.next = h;
    } else {
      this.shot = this.mainShot;
      this.next = this.mainNext;
    }
    if (this.shot !== prev) this.changes++;
    this.t = 0;
    if (!h) this.applyMain();
  }

  setContext(c: MenuContext): void {
    if (c === this.context) return;
    if (this.titlePhase === 'dark' || this.titlePhase === 'ignite') {
      // (slice 4a) the press: the title gives way to the main menu, and the goggle strikes on the title shot first; the
      // main menu's opening follows when the lights are up. Any other screen (the loadout) ends it at once.
      if (c === 'main') {
        if (this.titlePhase === 'dark') {
          this.titlePhase = 'ignite';
          this.igniteT = 0;
        }
        this.pending = c;
        return;
      }
      this.endTitle();
    }
    this.context = c;
    this.enter(c);
  }

  get titleLeftS(): number {
    if (this.titlePhase === 'dark') return IGNITE_S;
    return this.titlePhase === 'ignite' ? Math.max(0, IGNITE_S - this.igniteT) : 0;
  }

  skipTitle(): void {
    if (this.titlePhase !== 'dark' && this.titlePhase !== 'ignite') return;
    this.titlePhase = 'ignite';
    this.igniteT = IGNITE_S;
    this.pending ??= 'main';
  }

  /** (slice 4a) The lights are up: the shots run as before. */
  private endTitle(): void {
    this.titlePhase = 'done';
    this.pending = null;
    this.lit = 1;
    this.glow = -1;
  }

  update(dtS: number): void {
    if (this.titlePhase === 'dark') {
      // (slice 4a) full darkness: the title shot waits on its first frame
      this.t = this.freezeT ?? 0;
      this.fade = 0;
      return;
    }
    if (this.titlePhase === 'ignite') {
      // reduced motion: no flicker, the lights straight up
      this.igniteT = this.reduced ? IGNITE_S : this.igniteT + dtS;
      if (this.igniteT < IGNITE_S) {
        this.glow = igniteGlow(this.igniteT);
        this.lit = igniteLit(this.igniteT);
        // the title's push runs on under the flicker
        this.t = this.freezeT ?? Math.min(1, this.igniteT / this.shot.durS);
        this.fade = 0;
        return;
      }
      const p = this.pending;
      this.endTitle();
      if (p && p !== this.context) {
        this.context = p;
        this.enter(p);
      }
      // (the main menu's opening carries on from the title's frame: the stage eases the camera across)
      return;
    }
    if (this.reduced) {
      // a held still: the title on its last frame (the goggle lit), anything else on its first
      this.t = this.shot.once ? 1 : 0;
      this.fade = 0;
      return;
    }
    if (this.held(this.context)) {
      // ping-pong with an ease: the move slows to a stop and comes back
      if (this.freezeT !== null) {
        this.t = Math.min(1, Math.max(0, this.freezeT));
        this.fade = 0;
        return;
      }
      const d = this.shot.durS;
      if (this.shot.once) {
        this.holdClock = Math.min(d, this.holdClock + dtS);
        this.t = this.holdClock / d;
        this.fade = 0;
        return;
      }
      this.holdClock = (this.holdClock + dtS) % (2 * d);
      const p = this.holdClock / d;
      this.t = smooth(p <= 1 ? p : 2 - p);
      this.fade = 0;
      return;
    }
    if (this.black > 0) {
      this.black -= dtS;
      this.fade = 1;
      if (this.black <= 0) this.advance(false);
      return;
    }
    this.mainClock += dtS;
    const d = this.mainShot.durS;
    const half = XFADE_S / 2;
    const cut = this.mainShot.light !== this.mainNext.light;
    if (this.mainClock >= d) {
      if (cut) {
        this.black = CUT_S + (this.mainClock - d);
        this.fade = 1;
        return;
      }
      this.advance(true);
      return;
    }
    this.applyMain();
    if (!cut && this.mainClock > d - half) this.fade = Math.max(this.fade, (this.mainClock - (d - half)) / half);
  }

  /** The next main shot starts (carrying the overshoot when it fades in). */
  private advance(fadeIn: boolean): void {
    const over = fadeIn ? Math.max(0, this.mainClock - this.mainShot.durS) : 0;
    this.mainShot = this.mainNext;
    this.mainNext = this.pick(this.mainShot);
    this.mainClock = over;
    this.mainFadeIn = fadeIn;
    this.black = 0;
    this.shot = this.mainShot;
    this.next = this.mainNext;
    this.changes++;
    this.applyMain();
  }

  private applyMain(): void {
    const d = this.mainShot.durS;
    this.t = Math.min(1, this.mainClock / d);
    const half = XFADE_S / 2;
    this.fade = this.mainFadeIn && this.mainClock < half ? 1 - this.mainClock / half : 0;
    if (this.mainFadeIn && this.mainClock >= half) this.mainFadeIn = false;
  }
}

export function createDirector(o: DirectorOpts): Director {
  return new ShotDirector(o);
}

/** Debug hooks from the page query: `?menuShot=<id>`, `?menuClock=fast`, `?menuT=<0..1>`. */
export function parseShotHooks(search: string): { force: string | null; clock: number; freezeT: number | null } {
  const q = new URLSearchParams(search);
  const t = q.get('menuT');
  const ft = t === null ? NaN : Number(t);
  return { force: q.get('menuShot'), clock: q.get('menuClock') === 'fast' ? FAST_CLOCK : 1, freezeT: Number.isFinite(ft) ? ft : null };
}

/** The camera pass's ease (pure): slow out, slow in. */
export function easeInOut(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

/** The goggle's power-on (pure): off before `a`, on after `b`. Between: two quick blips, a dim stutter, then a warm-up
 *  ramp with a faint shimmer that settles (a tube striking). */
export function goggleLevel(t: number, a: number, b: number): number {
  if (t <= a) return 0;
  if (t >= b) return 1;
  const r = (t - a) / (b - a);
  if (r < 0.08) return 0;
  if (r < 0.12) return 0.85;
  if (r < 0.26) return 0;
  if (r < 0.29) return 0.55;
  if (r < 0.34) return 0.1;
  if (r < 0.38) return 0.7;
  if (r < 0.46) return 0.05;
  // the warm-up: from dim to full, a shimmer fading out as it settles
  const w = (r - 0.46) / 0.54;
  const shimmer = Math.sin(r * 157) * 0.08 * (1 - w);
  return Math.max(0, Math.min(1, 0.35 + 0.65 * w * w * (3 - 2 * w) + shimmer));
}
