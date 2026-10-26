import { Vector3 } from '../core/babylon';
import type { PlayerRef } from '../ai/enemy';
import type { AmmoSlot } from '../weapons/loadoutSnapshot';
import type { GameState, SessionCallbacks } from './gameState';
import type { Interactable } from './interactables';
import { EMP_FLASH_AT, EMP_LABEL, EMP_OUT_S, EMP_SEEK, OBJECTIVE_LINE, PLAY_YAW, PianoIntro, RADIO_LINE, REVEALS, REVEAL_CLEAR_M, SKIP_SEEK } from './pianoIntro';
import { exitZone, inZone, type SectorDef } from './sectors';
import { hyp2 } from '../core/mathx';
import { flags } from '../core/flags';
import { knifeSceneOn } from './knifeKill';
import type { IntroVariant } from '../anim/introBreath';
import { createSceneStorm, type PianoStorm } from '../audio/sceneStorm';

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
 * (S2, S4) The EMP beat's world calls: `empHooks` drives the real APIs (#602 `mainsOff`, #603 `sceneDark` and
 * `blackoutSearchSlots`, #604 the lightning clock).
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

/** (S4) The lamps' side of the beat: `LightRegistry.mainsOff` (#602, piano SO1). */
export interface MainsLights {
  mainsOff(x: number, y: number, z: number, over?: number): number;
}

/** (S4) The guards' side of the beat: `EnemyManager`'s scene dark and blackout search (#603, GA1 / GA3). */
export interface SceneGuards {
  sceneDark: boolean;
  blackoutSearchSlots(slots: readonly number[], x: number, z: number): number;
}

/**
 * (S4) The beat's world calls on the real APIs: the mains cut (`world.level.lights.mainsOff`, #602: nearest first, for
 * good, through every restart), the lightning clock's t0 (`world.lightning`, #604; null on a map without lightning), the
 * scene's dark and the pair's search on the guards (`em`, #603; null before the manager exists).
 */
export function empHooks(lights: MainsLights, lightning: () => { t0: number } | null, em: () => SceneGuards | null): PianoEmpHooks {
  return {
    mainsOff: (x, y, z, over) => lights.mainsOff(x, y, z, over),
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
  /** The EMP burst at the pressing operator's belt (and the EMP sound). `mine`: this page pressed (S8: the press pose). */
  burst(x: number, y: number, z: number, mine: boolean): void;
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
  /** (S6) The storm's sound (rain, thunder; `createSceneStorm`): started with the intro, stepped on the shared clock. */
  readonly storm?: PianoStorm | null;
  /** The section's guards spawn now: the opening four on their stop spots (the scene's start-spawn exception). */
  spawn(): void;
  /** Guard-list slot `k` of the live section has a living guard (fill has spawned it). */
  spawned(k: number): boolean;
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
  /**
   * (piano-knife S4b) The intro pose on this page's operator (`GameState.introPose`): back to the bins, the pistol (the
   * selected weapon: `start` selects it first) at low ready, slide locked. Absent: no pose (tests).
   */
  introPose?(on: boolean, variant: IntroVariant): void;
  /**
   * (S8) The knife drawn at the flash (placeholder: the pistol holstered, the knife model in the right fist of this
   * page's operator; no clip; the remote figure does not show it: that needs a wire field) and put away at the cut.
   */
  knifeReady?(on: boolean): void;
  /** (S8) The game camera's look (yaw) for play, set at the press so the glide lands on an open boom. */
  playLook?(yaw: number): void;
  /**
   * (S4) Co-op client only (absent on the host and solo): send this page's EMP press to the host, which checks it like
   * any item use. The client's spawn, search, mains cut and reveals are the host's; its intro ends on `hostEmp`.
   */
  askEmp?(): void;
  /** (S4) Co-op host only: the client's page fades with ours (the existing `end` message; the client shows no results). */
  endNet?(): void;
  /** (S4) Co-op host only: every page back to the room's lobby (the session's `lobby` hook). False: no hook. */
  toLobby?(): boolean;
}

/** (S2, S4) The EMP items' ids: `piano-emp-<k>`, k the operator spot (0 the section's start, 1 its start2). */
export const EMP_ITEM = 'piano-emp-';

/** (S4) The EMP item nearest (x, z) on the map's first section (a client's `use` names it; the host checks the reach). */
export function nearestEmpItem(map: { readonly sectors?: readonly SectorDef[] }, x: number, z: number): string {
  const s = map.sectors?.[0];
  if (!s) return `${EMP_ITEM}0`;
  const b = s.start2;
  return b && hyp2(b.x - x, b.z - z) < hyp2(s.start.x - x, s.start.z - z) ? `${EMP_ITEM}1` : `${EMP_ITEM}0`;
}

/** (S4) What the co-op client hands the scene: the intro view (Babylon, built by the client) and its press to the host. */
export interface PianoClientSeam {
  view(intro: PianoIntro, onSkip: () => void): PianoView | null;
  askEmp(): void;
}

/**
 * (S4) The scene's world on a co-op client page: its own intro, music, HUD and knife switch; the lightning's t0 from the
 * host's press (`hostEmp`); no mains cut (the host's `lamps` snapshot carries the dark), no guards of its own, no items
 * (the press goes to the host as a `use`). The radio line at the cut comes from the host as a feed line. Built once.
 */
export function pianoClientWorld(g: GameState, c: PianoClientSeam): PianoWorld {
  const sec = g.world.map.sectors?.[0];
  return {
    hooks: {
      mainsOff: () => 0,
      lightningT0(simTime) {
        const lt = g.world.lightning;
        if (lt) lt.t0 = simTime;
      },
      sceneDark: () => undefined,
      blackoutSearchSlots: () => 0,
    },
    music: g.app.music,
    storm: createSceneStorm(g.app.audio, g.world.map.lightning ?? null),
    spawn: () => undefined,
    spawned: () => false,
    sectionGuards: () => sec?.guards.length ?? 0,
    simTime: () => g.net?.simTime?.() ?? (g as unknown as { time: number }).time,
    localPress: () => g.player.alive && g.app.input.state.pressed('interact'),
    empItems: () => undefined,
    operatorAt(_by, out) {
      const p = g.player.position;
      out.x = p.x;
      out.y = p.y;
      out.z = p.z;
    },
    hud: (on) => g.hud.setVisible(on),
    cutLines(_radio, objective) {
      g.hud.setObjective(objective);
      g.hud.showObjective();
    },
    guardWithin: () => true,
    view: (intro, onSkip) => c.view(intro, onSkip),
    knifeScene: (on) => knifeSwitch(g, on),
    introPose: (on, v) => void g.introPose(on, v),
    knifeReady: (on) => knifeReady(g, on),
    playLook: (yaw) => playLook(g, yaw),
    askEmp: () => c.askEmp(),
  };
}

/** (S8) The knife drawn for the flash (the pistol holstered first) or put away: the knife model and the stance's holster. */
export function knifeReady(g: { readonly player: { readonly stance: { holster(): void } }; readonly weapons: { readonly knife: { show(on: boolean): void } } }, on: boolean): void {
  if (on) g.player.stance.holster();
  g.weapons.knife.show(on);
}

/** (S8) The game camera's look for play: this yaw, level. */
export function playLook(g: { readonly player: { readonly cam: { yaw: number; pitch: number } } }, yaw: number): void {
  g.player.cam.yaw = yaw;
  g.player.cam.pitch = 0;
}

/** (S4, knife PB5) The knife switch on a match: the gate is the flag, the map's `scene` and the scene's live state. */
export function knifeSwitch(g: { readonly takedown: { setKnifeScene(on: boolean): void }; readonly world: { readonly map: { readonly scene?: 'piano' } } }, on: boolean): void {
  g.takedown.setKnifeScene(knifeSceneOn(flags.pianoEscape, g.world.map.scene, on));
}

/** (S2) SectorMode's side of the scene: its spawn with the exception, its slots, its spots. */
export interface PianoModeSeam {
  spawn(): void;
  spawned(k: number): boolean;
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
    storm: createSceneStorm(g.app.audio, g.world.map.lightning ?? null),
    spawn: () => m.spawn(),
    spawned: (k) => m.spawned(k),
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
        const it = ints.add(`${EMP_ITEM}${i}`, 'vip', new Vector3(s.x, s.y, s.z), EMP_LABEL, 0);
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
    introPose: (on, v) => void g.introPose(on, v),
    knifeReady: (on) => knifeReady(g, on),
    playLook: (yaw) => playLook(g, yaw),
    endNet: () => g.net?.onEnd?.(true, ''),
    toLobby() {
      // the session's callbacks (`GameState.cb`, private: the pause menu's own lobby hook reads the same)
      const cb = (g as unknown as { cb: SessionCallbacks }).cb;
      if (!g.net || !cb.lobby) return false;
      cb.lobby();
      return true;
    },
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
  /** (S4) The press is news for the co-op client (`takeEmpNews`). */
  private empNews = false;
  /** (S4) The knife scene is on (`onKnifeScene`). */
  private knifeOn = false;
  private searchPending = false;
  private restartT = -1;
  /** (S4b) The intro pose is on; a restart before the EMP takes it off and puts it back after the respawn. */
  private posed = false;
  private rePoseT = -1;
  /** (S8) This page asked the host for the EMP (co-op client: the press pose is ours); the knife is drawn (the flash). */
  private asked = false;
  private drawn = false;
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
   * (camera, fade, letterbox, actors, prompt) and the intro pose (knife S4b).
   */
  protected onIntro(): void {
    const w = this.world;
    if (!w || this.intro) return;
    // (S4) a co-op client frames its own operator, the partner (slot 1)
    const intro = (this.intro = new PianoIntro(w.askEmp ? 1 : 0));
    this.holdsSpawn = true;
    this.inPlay = false;
    // (S4) no flash in the intro: the lightning starts with the EMP
    w.hooks.lightningT0(LIGHTNING_OFF_T0);
    w.hud(false);
    // (S6) the rain from the first intro frame
    w.storm?.start();
    const m = w.music;
    if (m) {
      m.scene(true);
      void m.piano.start().then(() => intro.musicStarted());
    }
    // (knife S4b) the pose: the host / solo 'stand', the client (start2) 'mirror'; off at the cut (on the wall, pistol away)
    this.pose(true);
    this.view = w.view(intro, this.skipped);
  }

  /** (S4b) The intro pose on / off, once each way. */
  private pose(on: boolean): void {
    if (on === this.posed) return;
    this.posed = on;
    this.world?.introPose?.(on, this.world.askEmp ? 'mirror' : 'stand');
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
    // (S6) the storm's sound: thunder from the scene clock (t0 off before the press), rain by the operator's height
    if (w.storm) {
      w.operatorAt('local', this.at);
      w.storm.step(w.simTime(), this.t0 >= 0 ? this.t0 : LIGHTNING_OFF_T0, this.at.y);
    }
    // (S4b) a restart in the intro: the pose back once the operator has respawned
    if (this.rePoseT >= 0) {
      this.rePoseT -= dt;
      if (this.rePoseT < 0 && !this.inPlay) this.pose(true);
    }
    if (!this.pressed) {
      if (!intro.promptOn) return;
      // (S4) a co-op client sends its press to the host (once per button press); its beat comes with `hostEmp`
      if (w.askEmp) {
        if (w.localPress()) {
          this.asked = true;
          w.askEmp();
        }
        return;
      }
      if (!this.itemsOn) {
        this.itemsOn = true;
        w.empItems(true, this.useItem);
      }
      if (w.localPress()) this.press('local');
      return;
    }
    // (S8) the flash: the operators rising, knives drawn (this page's operator; a placeholder pose)
    if (!this.inPlay && !this.drawn && intro.sinceEmp >= EMP_FLASH_AT) {
      this.drawn = true;
      w.knifeReady?.(true);
    }
    if (!this.inPlay && intro.done) this.cut();
    // (S4) a co-op client: the spawn, the search and the reveals are the host's
    if (w.askEmp) return;
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
    this.view?.burst(x, y, z, by === 'local');
    // (S8) the game camera's look for play, so the glide from the hero shot lands on an open boom
    w.playLook?.(PLAY_YAW[intro.slot] ?? 0);
    // 1. the mains cut at the pressing operator, nearest first, all dead by 0.8 s
    this.lampsCut = w.hooks.mainsOff(x, y, z, EMP_OUT_S);
    // 2. the lightning clock from the press (solo: here; co-op: the host's t0 goes to the client in the sector state, S4)
    this.t0 = w.simTime();
    w.hooks.lightningT0(this.t0);
    this.empNews = true;
    // 3. the piano under the burst: the loop and the lightning start together on every page
    w.music?.piano.seek(EMP_SEEK);
    // 4-6. the dark, the spawn (the opening four on the actors' spots), then (next steps) the pair's search
    this.spawnBeat();
    // 7. (S4) the knife scene: every takedown from the cut on is the knife kill (the clips start loading now)
    this.onKnifeScene(true);
    return true;
  }

  /**
   * (S4) Co-op client: the host's EMP press (`ep` in its `sector` message, its sim time) ends this page's intro now: the
   * burst at our operator, the lightning's t0 = the host's press (so the flashes match on the shared clock), the music's
   * switch to the mission track at the same moment, the knife scene; the cut follows `EMP_CUT_S` later. The dark is the
   * host's lamps snapshot. Once (every later message repeats it). True when it took.
   */
  hostEmp(t0: number): boolean {
    const w = this.world;
    const intro = this.intro;
    if (!w || !intro || this.pressed || !intro.hostPress()) return false;
    this.pressed = true;
    this.pressedBy = 'host';
    w.operatorAt('local', this.at);
    this.view?.burst(this.at.x, this.at.y + BELT_Y, this.at.z, this.asked);
    w.playLook?.(PLAY_YAW[intro.slot] ?? 0);
    this.t0 = t0;
    w.hooks.lightningT0(t0);
    w.music?.piano.seek(EMP_SEEK);
    this.holdsSpawn = false;
    this.onKnifeScene(true);
    return true;
  }

  /** (S4) Host: the press happened since the last call (SectorMode then sends its `sector` message at once). */
  takeEmpNews(): boolean {
    const n = this.empNews;
    this.empNews = false;
    return n;
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
    this.rePoseT = -1;
    this.knifeAway();
    this.pose(false);
    this.view?.cut();
    w.hud(true);
    w.cutLines(RADIO_LINE, OBJECTIVE_LINE);
  }

  /** (S8) The flash's knife goes away (at the cut, or the scene ends first). Once. */
  private knifeAway(): void {
    if (!this.drawn) return;
    this.drawn = false;
    this.world?.knifeReady?.(false);
  }

  /**
   * (S2) Everyone down, or the pause menu's restart: SectorMode is about to reload the section. Before the EMP nothing
   * changes (the intro runs on). After it the intro never replays and the music plays on; the spawn waits for the
   * respawn, then the dark, the spawn and the search run again (`mainsOff` holds, so the lamps stay dead).
   */
  restarted(): void {
    if (!this.pressed) {
      // (S4b) the respawn moves the operator: the pose off now, back on after it
      if (this.posed) {
        this.pose(false);
        this.rePoseT = RESTART_SPAWN_S;
      }
      return;
    }
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
    this.pose(false);
    this.onKnifeScene(false);
    this.world?.music?.piano.fadeOut(PIANO_FADE_S);
    this.world?.storm?.fadeOut(PIANO_FADE_S);
    this.fade = this.makeFade();
    this.fade?.to(1, PIANO_FADE_S);
    // (S4) co-op host: the client's page fades at the same moment (no results screen there either)
    if (this.host.net) this.world?.endNet?.();
    return PIANO_FADE_S;
  }

  /**
   * Seam 3, the fade is done: back to the menu (solo), no results screen, nothing written. (S4) Co-op host: every page
   * back to the room's lobby (the client's page faded with ours on the `end` message). No hook: the ordinary end. Once.
   */
  leave(): void {
    if (this.left) return;
    this.left = true;
    if (leaveToMenu && !this.host.net) leaveToMenu();
    else if (this.host.net && this.world?.toLobby?.()) return;
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
      // (S4) the co-op client's scene, the knife switch, the end's fade
      client: !!this.world?.askEmp,
      knife: this.knifeOn,
      finished: this.finished,
    };
  }

  dispose(): void {
    this.fade?.dispose();
    this.fade = null;
    this.view?.dispose();
    this.view = null;
    this.knifeAway();
    this.pose(false);
    this.onKnifeScene(false);
    const w = this.world;
    if (w) {
      w.empItems(false, null);
      w.storm?.dispose();
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
