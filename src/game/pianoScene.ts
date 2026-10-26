import { Vector3 } from '../core/babylon';
import type { PlayerRef } from '../ai/enemy';
import type { AmmoSlot } from '../weapons/loadoutSnapshot';
import type { GameState } from './gameState';
import type { Interactable } from './interactables';
import { EMP_LABEL, EMP_OUT_S, EMP_SEEK, OBJECTIVE_LINE, PianoIntro, RADIO_LINE, REVEALS, REVEAL_CLEAR_M, SKIP_SEEK } from './pianoIntro';
import { exitZone, inZone, type SectorDef } from './sectors';
import { hyp2 } from '../core/mathx';
import { flags } from '../core/flags';
import { knifeSceneOn } from './knifeKill';

/**
 * The piano escape scene's own logic (piano-escape S1, S2), on the Sector Ops runtime. `SectorMode` calls it at named
 * seams only, and only for a map with `scene: 'piano'`: `start` (the kit, before the section's checkpoint is recorded,
 * then the intro), `step` (every sim step: the EMP prompt and press, the cut, a restart's spawn, the search, the framed
 * reveals), `holdsSpawn` / `inPlay` (no guard before the EMP, no objective before the cut), `restarted`, `porchStep`
 * (the porch line while guards are still up) and `finish` / `leave` (the end: a fade to the menu, no star, record,
 * rating or results screen; `SectorMode.complete`).
 *
 * The intro (S2, `pianoIntro.ts`, drawn by `pianoIntroView.ts`) plays once per scene: a restart never replays it and the
 * music plays on. The EMP beat runs in the PLAN's order (section 2) on a small local seam (`PianoEmpHooks`, `empHooks`:
 * the real `sceneDark`, `blackoutSearchSlots` and lightning clock; the mains cut's stand-in until #602 is on the base).
 *
 * Never imports `src/net` (co-op reaches it through the host and the lobby, S4).
 */

/** The porch line, shown once when a player steps onto the porch while a guard is still up (the door opens from inside). */
export const PORCH_LINE = 'Not yet. Nobody walks away from this.';

/** The end: seconds from the last guard down and the porch reached to the fade being complete (A9). */
export const PIANO_FADE_S = 2;

/**
 * (S2) The scene's start-spawn exception to Sector Ops' 7 m rule (`SPAWN_MIN_DIST`, sectorMode.ts): at the EMP spawn
 * (and a restart's) the opening four spawn on their stop spots 4-6 m from the players, never nearer than this.
 */
export const SCENE_SPAWN_MIN = 4;
/** (S2) The guards who search round W1 after the EMP: guard-list slots 0 and 1 (G1 + G2, Q2's recommended answer). */
export const SEARCH_SLOTS: readonly number[] = [0, 1];
/** (S2) The search's point (W1's middle). */
export const SEARCH_X = 5.5;
export const SEARCH_Z = 5.25;
/**
 * (S4) The lightning's t0 before the EMP: the clock never reaches it, so no flash in the intro (`Lightning.flashAt` of
 * -Infinity is 0; tested). The press sets the real t0.
 */
export const LIGHTNING_OFF_T0 = Number.POSITIVE_INFINITY;
/** (S2) A restart after the EMP: the spawn waits this long (s), past the players' respawn (0.3 s). */
export const RESTART_SPAWN_S = 0.4;
/** (S2) The EMP goes off at the operator's belt (m above the feet). */
export const BELT_Y = 1.0;

/** Is this map the piano scene (`MapDef.scene`)? */
export function isPianoScene(map: { readonly scene?: 'piano' } | null | undefined): boolean {
  return map?.scene === 'piano';
}

/**
 * The empty kit (A4): every gun's magazine and reserve (and quiet rounds) at 0, every gadget count at 0. Run before the
 * section's checkpoint is recorded, so a restart gives the empty kit back. Returns the index of the first pistol, or -1.
 */
export function emptyKit(slots: readonly (AmmoSlot & { readonly def: { readonly class: string } })[], gadgets: Record<string, number>): number {
  let pistol = -1;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]!;
    s.mag = 0;
    s.reserve = 0;
    if (s.sd !== undefined) s.sd = 0;
    if (pistol < 0 && s.def.class === 'pistol') pistol = i;
  }
  for (const k in gadgets) gadgets[k] = 0;
  return pistol;
}

/** What the scene needs of the match (`GameState` satisfies it): kept narrow so the scene is unit-tested without a world. */
export interface PianoHost {
  readonly weapons: {
    readonly slots: readonly (AmmoSlot & { readonly def: { readonly class: string } })[];
    readonly gadgets: { readonly counts: Record<string, number> };
    index: number;
    switchTo(i: number): void;
  };
  readonly hud: { feedItem(text: string, kind?: string): void };
  /** Co-op attachment (null: solo). */
  readonly net: unknown;
  /** The ordinary end with the results screen: the fallback when there is no way back to the menu hooked. */
  endSession(won: boolean, subtitle: string): void;
  playerRefsInto(out: PlayerRef[]): readonly PlayerRef[];
}

/** The black layer over the picture. `to` fades it in over `seconds`; `dispose` removes it. */
export interface FadeLayer {
  to(alpha: number, seconds: number): void;
  dispose(): void;
}

/** The DOM fade: one fixed black div (a CSS transition, so no per-frame work). */
export function domFade(): FadeLayer | null {
  if (typeof document === 'undefined') return null;
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:9000';
  document.body.appendChild(el);
  return {
    to(alpha, seconds) {
      el.style.transition = `opacity ${seconds}s linear`;
      // a frame after insertion so the transition runs
      void el.offsetWidth;
      el.style.opacity = String(alpha);
    },
    dispose() {
      el.remove();
    },
  };
}

/** The way back to the menu (solo), set by `main.ts` when the flag is on; none: the scene ends on the ordinary results. */
let leaveToMenu: (() => void) | null = null;

export function setPianoLeave(fn: (() => void) | null): void {
  leaveToMenu = fn;
}

// ------------------------------------------------------------------ S2: the EMP seam and the world the scene drives

/**
 * (S2, S4) The EMP beat's world calls: `empHooks` drives the real APIs (#603 `sceneDark` and `blackoutSearchSlots`,
 * #604 the lightning clock); `mainsOff` (#602) is not on this base yet, so its stand-in stays (`stubMainsOff`).
 */
export interface PianoEmpHooks {
  /** The mains cut at (x, y, z): every electric lamp out, nearest first, the last `over` s later, for good. Lamps cut. */
  mainsOff(x: number, y: number, z: number, over: number): number;
  /** The lightning clock starts: `t0` is the press time on the shared sim clock. */
  lightningT0(simTime: number): void;
  /** The scene's dark: every guard's torch on in every state, no lights-out incident (false when the scene ends). */
  sceneDark(on: boolean): void;
  /** The live section's guard-list `slots` search a 6 m ring round (x, z), the rest hold. Returns how many went. */
  blackoutSearchSlots(slots: readonly number[], x: number, z: number): number;
}

/** (S2) The lamps' side of the stand-in: `LightRegistry.disrupt`. */
export interface DisruptLights {
  disrupt(x: number, y: number, z: number, radius: number, seconds: number): number;
}

/** (S4) The guards' side of the beat: `EnemyManager`'s scene dark and blackout search (#603, GA1 / GA3). */
export interface SceneGuards {
  sceneDark: boolean;
  blackoutSearchSlots(slots: readonly number[], x: number, z: number): number;
}

/** (S2) The mains cut's stand-in: a whole-map `disrupt` that never ends. */
export function stubMainsOff(lights: DisruptLights, x: number, y: number, z: number): number {
  // TODO(#602): `world.level.lights.mainsOff(x, y, z, 0.8)` (nearest first over 0.8 s, holds through a restart; then
  // SectorMode's `retakeStart` stand-in can go). #602 is on master but not on the S4 base.
  return lights.disrupt(x, y, z, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
}

/**
 * (S4) The beat's world calls on the real APIs: the lightning clock's t0 (`world.lightning`, #604; null on a map without
 * lightning), the scene's dark and the pair's search on the guards (`em`, #603; null before the manager exists or on a
 * co-op client, whose guards are the host's). The mains cut is the stand-in until #602 reaches the base.
 */
export function empHooks(lights: DisruptLights, lightning: () => { t0: number } | null, em: () => SceneGuards | null): PianoEmpHooks {
  return {
    mainsOff: (x, y, z) => stubMainsOff(lights, x, y, z),
    lightningT0(simTime) {
      const lt = lightning();
      if (lt) lt.t0 = simTime;
    },
    sceneDark(on) {
      const e = em();
      if (e) e.sceneDark = on;
    },
    blackoutSearchSlots(slots, x, z) {
      return em()?.blackoutSearchSlots(slots, x, z) ?? 0;
    },
  };
}

/** (S2) The scene's music (`Music`, S3's `ScenePiano`): only its API is called. */
export interface PianoMusic {
  scene(on: boolean): void;
  readonly piano: { start(): Promise<void>; seek(s: number): void; fadeOut(s: number): void };
}

/** (S2) The render-only intro view (`pianoIntroView.ts`); none in tests. */
export interface PianoView {
  /** The EMP burst at the pressing operator's belt (and the EMP sound). */
  burst(x: number, y: number, z: number): void;
  /** The cut to play: the intro camera, actors, layers and letterbox go. */
  cut(): void;
  /** Framed reveal `i` (`REVEALS`) starts. */
  reveal(i: number): void;
  /** A framed reveal is running (input held). */
  readonly revealing: boolean;
  dispose(): void;
}

/** (S2) What the scene drives beyond `PianoHost` (`pianoWorld` builds it from the match and SectorMode's seams). */
export interface PianoWorld {
  readonly hooks: PianoEmpHooks;
  readonly music: PianoMusic | null;
  /** The section's guards spawn now: the opening four on their stop spots (the scene's start-spawn exception). */
  spawn(): void;
  /** Guard-list slot `k` of the live section has a living guard (fill has spawned it). */
  spawned(k: number): boolean;
  /** (stand-in until #602) The lamps as they are now become what a section restart puts back. */
  retakeStart(): void;
  /** The shared sim clock (co-op: the host's). */
  simTime(): number;
  /** The local operator pressed interact this step. */
  localPress(): boolean;
  /** The EMP items at the operators' spots (either operator; a client's use is host-checked by reach); off: removed. */
  empItems(on: boolean, use: ((by: string) => void) | null): void;
  /** Where operator `by` ('local' or a remote id) stands. */
  operatorAt(by: string, out: { x: number; y: number; z: number }): void;
  /** The HUD shown (play) or hidden (the intro). */
  hud(on: boolean): void;
  /** The cut's radio line and objective line. */
  cutLines(radio: string, objective: string): void;
  /** A living guard within `r` m of (x, y, z) (the framed reveals' rule). */
  guardWithin(x: number, y: number, z: number, r: number): boolean;
  /** The live section's guard count (the hoist reveal needs a last guard down). */
  sectionGuards(): number;
  /** The intro view (null: none). */
  view(intro: PianoIntro, onSkip: () => void): PianoView | null;
  /** (S4, knife PB5) The knife scene on this page's takedowns: every offer a lethal knife kill on one press (off: today's). */
  knifeScene(on: boolean): void;
}

/** (S4, knife PB5) The knife switch on a match: the gate is the flag, the map's `scene` and the scene's live state. */
export function knifeSwitch(g: { readonly takedown: { setKnifeScene(on: boolean): void }; readonly world: { readonly map: { readonly scene?: 'piano' } } }, on: boolean): void {
  g.takedown.setKnifeScene(knifeSceneOn(flags.pianoEscape, g.world.map.scene, on));
}

/** (S2) SectorMode's side of the scene: its spawn with the exception, its slots, its start state, its spots. */
export interface PianoModeSeam {
  spawn(): void;
  spawned(k: number): boolean;
  retakeStart(): void;
  sectionGuards(): number;
  /** The operators' start spots (the section's start and start2). */
  spots(): readonly { readonly x: number; readonly y: number; readonly z: number }[];
  view(intro: PianoIntro, onSkip: () => void): PianoView | null;
}

/** (S2) The scene's world on a live match. Not on a hot path (built once; the closures are made here, not per step). */
export function pianoWorld(g: GameState, m: PianoModeSeam): PianoWorld {
  const items: Interactable[] = [];
  const refs: PlayerRef[] = [];
  return {
    hooks: empHooks(
      g.world.level.lights,
      () => g.world.lightning,
      () => g.enemyMgr ?? null,
    ),
    music: g.app.music,
    spawn: () => m.spawn(),
    spawned: (k) => m.spawned(k),
    retakeStart: () => m.retakeStart(),
    sectionGuards: () => m.sectionGuards(),
    // the shared sim clock (`GameState.simNow`, private: the same `time` read here)
    simTime: () => g.net?.simTime?.() ?? (g as unknown as { time: number }).time,
    localPress: () => g.player.alive && g.app.input.state.pressed('interact'),
    empItems(on, use) {
      const ints = g.interactables;
      if (!ints) return;
      for (const it of items) ints.remove(it);
      items.length = 0;
      if (!on || !use) return;
      const spots = m.spots();
      for (let i = 0; i < spots.length; i++) {
        const s = spots[i]!;
        // no visuals ('vip' draws nothing); the label is the prompt
        const it = ints.add(`piano-emp-${i}`, 'vip', new Vector3(s.x, s.y, s.z), EMP_LABEL, 0);
        it.onUse = (_it, by) => use(by ?? 'local');
        ints.setEnabled(it, true);
        items.push(it);
      }
    },
    operatorAt(by, out) {
      let p = g.player.position;
      if (by !== 'local') {
        const rs = g.playerRefsInto(refs);
        for (let i = 0; i < rs.length; i++) if (rs[i]!.id === by) p = rs[i]!.feet;
      }
      out.x = p.x;
      out.y = p.y;
      out.z = p.z;
    },
    hud: (on) => g.hud.setVisible(on),
    cutLines(radio, objective) {
      g.hud.barks.say('lantern', radio, true);
      g.net?.radioLine?.(radio);
      g.hud.setObjective(objective);
      g.hud.showObjective();
    },
    guardWithin(x, y, z, r) {
      const es = g.enemyMgr?.enemies;
      if (!es) return false;
      for (let i = 0; i < es.length; i++) {
        const e = es[i]!;
        if (e.alive && hyp2(e.pos.x - x, e.pos.z - z) < r && Math.abs(e.pos.y - y) < 3) return true;
      }
      return false;
    },
    view: (intro, onSkip) => m.view(intro, onSkip),
    knifeScene: (on) => knifeSwitch(g, on),
  };
}

export class PianoScene {
  private shown = false;
  private fade: FadeLayer | null = null;
  private left = false;
  /** The end has begun (the fade runs; `leave` follows `PIANO_FADE_S` later). */
  finished = false;

  // ---- S2: the intro and the EMP (null / inert without a world: the S1 shell alone)
  /** The intro (made once; a restart never replays it). */
  intro: PianoIntro | null = null;
  private view: PianoView | null = null;
  /** No guard spawns (the intro, a restart's wait); `SectorMode.fill` returns at once. */
  holdsSpawn = false;
  /** Play has begun (the cut): the objective counts from here. */
  inPlay = true;
  /** The EMP was set off. */
  pressed = false;
  /** Who set it off ('local' or a remote id). */
  pressedBy = '';
  /** The press time on the shared sim clock (the lightning's t0; S4 sends it to the client). -1: not yet. */
  t0 = -1;
  /** Lamps the mains cut took. */
  lampsCut = 0;
  /** The search (`blackoutSearchSlots`) calls made and the last one's answer (tests, e2e). */
  searches = 0;
  searched = -1;
  /** The scene's dark is on (`sceneDark`). */
  dark = false;
  private itemsOn = false;
  /** (S4) The knife scene is on (`onKnifeScene`). */
  private knifeOn = false;
  private searchPending = false;
  private restartT = -1;
  private wasOpen = true;
  private readonly revealed = [false, false];
  private readonly at = { x: 0, y: 0, z: 0 };
  private readonly refs: PlayerRef[] = [];
  /** The EMP item's use (made once). */
  private readonly useItem = (by: string): void => void this.press(by);
  /** The view's skip (made once): the music jumps with the intro. */
  private readonly skipped = (): void => this.world?.music?.piano.seek(SKIP_SEEK);

  constructor(
    private readonly host: PianoHost,
    private readonly makeFade: () => FadeLayer | null = domFade,
    private readonly world: PianoWorld | null = null,
  ) {
    if (world && typeof window !== 'undefined') (window as unknown as { __piano?: PianoScene }).__piano = this;
  }

  /** Seam 1, the section's start (before `markCheckpoint`): the empty pistol, no gadgets. */
  start(): void {
    const w = this.host.weapons;
    const pistol = emptyKit(w.slots, w.gadgets.counts);
    if (pistol >= 0 && w.index !== pistol) w.switchTo(pistol);
    this.onIntro();
  }

  /**
   * (S2) The intro begins, once: guards held, the HUD hidden, the piano from 0 s (the intro clock waits for it), the view
   * (camera, fade, letterbox, actors, prompt; `introPose` is the knife job's S4b: until then the pistol stance stands).
   */
  protected onIntro(): void {
    const w = this.world;
    if (!w || this.intro) return;
    const intro = (this.intro = new PianoIntro(0));
    this.holdsSpawn = true;
    this.inPlay = false;
    // (S4) no flash in the intro: the lightning starts with the EMP
    w.hooks.lightningT0(LIGHTNING_OFF_T0);
    w.hud(false);
    const m = w.music;
    if (m) {
      m.scene(true);
      void m.piano.start().then(() => intro.musicStarted());
    }
    // TODO(knife S4b): introPose(true) here (the slide locked back, low-ready, back to the bins); introPose(false) at the cut
    this.view = w.view(intro, this.skipped);
  }

  /**
   * (S4, knife PB5) The knife scene: `takedown.setKnifeScene(knifeSceneOn(flags.pianoEscape, map.scene, true))` after
   * the EMP (a restart keeps it), `false` when the scene ends (the fade, or leaving it any other way). Once each way.
   */
  protected onKnifeScene(on: boolean): void {
    if (on === this.knifeOn) return;
    this.knifeOn = on;
    this.world?.knifeScene(on);
  }

  /**
   * (S2) Every sim step (SectorMode, host and solo): the prompt's items and the local press, the cut, a restart's spawn,
   * the search once the pair is in, the framed reveals. `objectiveOpen`: the section's objective is still open (the
   * hoist door locked). No allocation.
   */
  step(dt: number, objectiveOpen: boolean): void {
    const w = this.world;
    const intro = this.intro;
    if (!w || !intro) return;
    if (!this.pressed) {
      if (!intro.promptOn) return;
      if (!this.itemsOn) {
        this.itemsOn = true;
        w.empItems(true, this.useItem);
      }
      if (w.localPress()) this.press('local');
      return;
    }
    if (!this.inPlay && intro.done) this.cut();
    if (this.restartT >= 0) {
      this.restartT -= dt;
      if (this.restartT < 0) this.spawnBeat();
    }
    // the search goes once fill() has spawned the pair (a slot's guard is null until then), never in the spawn step
    if (this.searchPending && this.pairIn()) {
      this.searchPending = false;
      this.searches++;
      this.searched = w.hooks.blackoutSearchSlots(SEARCH_SLOTS, SEARCH_X, SEARCH_Z);
    }
    if (this.inPlay) this.revealStep(objectiveOpen);
  }

  private pairIn(): boolean {
    for (let i = 0; i < SEARCH_SLOTS.length; i++) if (!this.world!.spawned(SEARCH_SLOTS[i]!)) return false;
    return true;
  }

  /**
   * (S2) The EMP press by either operator (the local button, or a client's item use the host checked): the beat in the
   * PLAN's order. Only while the prompt is up; once. True when it took.
   */
  press(by: string): boolean {
    const w = this.world;
    const intro = this.intro;
    if (!w || !intro || this.pressed || !intro.press()) return false;
    this.pressed = true;
    this.pressedBy = by;
    this.itemsOn = false;
    w.empItems(false, null);
    w.operatorAt(by, this.at);
    const x = this.at.x;
    const y = this.at.y + BELT_Y;
    const z = this.at.z;
    this.view?.burst(x, y, z);
    // 1. the mains cut at the pressing operator, nearest first, all dead by 0.8 s
    this.lampsCut = w.hooks.mainsOff(x, y, z, EMP_OUT_S);
    // (stand-in until #602: a restart puts the recorded lamps back, so the dead ones are recorded; harmless after)
    w.retakeStart();
    // 2. the lightning clock from the press (solo: here; co-op: the host's t0 goes to the client in the sector state, S4)
    this.t0 = w.simTime();
    w.hooks.lightningT0(this.t0);
    // 3. the piano under the burst: the loop and the lightning start together on every page
    w.music?.piano.seek(EMP_SEEK);
    // 4-6. the dark, the spawn (the opening four on the actors' spots), then (next steps) the pair's search
    this.spawnBeat();
    // 7. (S4) the knife scene: every takedown from the cut on is the knife kill (the clips start loading now)
    this.onKnifeScene(true);
    return true;
  }

  /** The dark, the spawn with the exception, the search waiting for the pair. A restart runs it again. */
  private spawnBeat(): void {
    const w = this.world!;
    w.hooks.sceneDark(true);
    this.dark = true;
    this.holdsSpawn = false;
    w.spawn();
    this.searchPending = true;
  }

  /** (S2) The cut to play: input on (the view lets go), the HUD, the radio line, the objective line. */
  private cut(): void {
    const w = this.world!;
    this.inPlay = true;
    this.view?.cut();
    w.hud(true);
    w.cutLines(RADIO_LINE, OBJECTIVE_LINE);
  }

  /**
   * (S2) Everyone down, or the pause menu's restart: SectorMode is about to reload the section. Before the EMP nothing
   * changes (the intro runs on). After it the intro never replays and the music plays on; the spawn waits for the
   * respawn, then the dark, the spawn and the search run again (`mainsOff` holds, so the lamps stay dead).
   */
  restarted(): void {
    if (!this.pressed) return;
    this.holdsSpawn = true;
    this.searchPending = false;
    this.restartT = RESTART_SPAWN_S;
  }

  /** The framed reveals in play: the ladder top (a player there) and the hoist door (it unlocks), once each. */
  private revealStep(objectiveOpen: boolean): void {
    const w = this.world!;
    const opened = this.wasOpen && !objectiveOpen;
    this.wasOpen = objectiveOpen;
    if (this.view?.revealing) return;
    if (opened && !this.revealed[1]) {
      this.revealed[1] = true;
      // the door unlocks on the last guard down: a section with none has no such moment
      if (w.sectionGuards() > 0) this.tryReveal(1);
    }
    if (this.revealed[0]) return;
    const r = REVEALS[0]!;
    const refs = this.host.playerRefsInto(this.refs);
    for (let i = 0; i < refs.length; i++) {
      const f = refs[i]!.feet;
      if (hyp2(f.x - r.at[0], f.z - r.at[2]) > r.reach || Math.abs(f.y - r.at[1]) > 1) continue;
      this.revealed[0] = true;
      this.tryReveal(0);
      return;
    }
  }

  private tryReveal(i: number): void {
    const r = REVEALS[i]!;
    if (this.world!.guardWithin(r.at[0], r.at[1], r.at[2], REVEAL_CLEAR_M)) return;
    this.view?.reveal(i);
  }

  /**
   * Seam 2, every tick while the section's objective is open: a player on the porch with a guard still up gets the
   * porch line, once. No allocation.
   */
  porchStep(s: SectorDef, refs: readonly PlayerRef[]): void {
    if (this.shown) return;
    const zone = exitZone(s);
    if (!zone) return;
    for (let i = 0; i < refs.length; i++) {
      const r = refs[i]!;
      if (!inZone(zone, r.feet.x, r.feet.y, r.feet.z)) continue;
      this.shown = true;
      this.host.hud.feedItem(PORCH_LINE, 'warn');
      return;
    }
  }

  /** Seam 3, the extraction: the fade to black begins (the piano fades with it). Returns the seconds until `leave`. */
  finish(): number {
    if (this.finished) return PIANO_FADE_S;
    this.finished = true;
    this.onKnifeScene(false);
    this.world?.music?.piano.fadeOut(PIANO_FADE_S);
    this.fade = this.makeFade();
    this.fade?.to(1, PIANO_FADE_S);
    return PIANO_FADE_S;
  }

  /**
   * Seam 3, the fade is done: back to the menu (solo), no results screen, nothing written. Co-op, or no hook: the host's
   * ordinary end (S4 gives co-op its lobby). Once.
   */
  leave(): void {
    if (this.left) return;
    this.left = true;
    if (leaveToMenu && !this.host.net) leaveToMenu();
    else this.host.endSession(true, '');
  }

  /** Test / e2e view (`window.__piano.debug()`). */
  debug(): Record<string, unknown> {
    const i = this.intro;
    return {
      shot: i?.shot ?? null,
      t: i?.t ?? -1,
      prompt: i?.promptOn ?? false,
      skipped: i?.skipped ?? false,
      pressed: this.pressed,
      pressedBy: this.pressedBy,
      inPlay: this.inPlay,
      holdsSpawn: this.holdsSpawn,
      t0: this.t0,
      lampsCut: this.lampsCut,
      dark: this.dark,
      searches: this.searches,
      searched: this.searched,
      revealing: this.view?.revealing ?? false,
    };
  }

  dispose(): void {
    this.fade?.dispose();
    this.fade = null;
    this.view?.dispose();
    this.view = null;
    this.onKnifeScene(false);
    const w = this.world;
    if (w) {
      w.empItems(false, null);
      // the scene's dark ends with the scene
      if (this.dark) w.hooks.sceneDark(false);
      this.dark = false;
      w.music?.scene(false);
      if (typeof window !== 'undefined') {
        const win = window as unknown as { __piano?: PianoScene };
        if (win.__piano === this) delete win.__piano;
      }
    }
  }
}
