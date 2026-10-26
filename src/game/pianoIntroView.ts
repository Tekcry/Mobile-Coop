import { Color3, CreateBox, StandardMaterial, TransformNode, Vector3, type InstancedMesh, type Mesh } from '../core/babylon';
import { hyp2, hyp3 } from '../core/mathx';
import type { GameState, SceneView } from './gameState';
import type { PartLibrary } from '../world/partLibrary';
import {
  ACTOR_LEN,
  ACTOR_RATE,
  ACTOR_WALK,
  actorHeightAt,
  actorPath,
  ACTOR_START,
  AIM_X,
  AIM_Y,
  AIM_Z,
  DRY_CLICK_AT,
  EMP_LABEL,
  INTRO_ACTORS,
  OPERATOR_SPOTS,
  PROMPT_AT,
  type PianoIntro,
  camFromRotation,
  empFlash,
  glideCamera,
  pressHand,
  pressHandAt,
  knifeHandAt,
  PRESS_S,
  REVEAL_S,
  SKIP_HOLD_S,
  TRACER_SPEED,
  actorAtDist,
  actorPose,
  introCam,
  muzzleFlicker,
  revealCamera,
  shotAt,
  shotLine,
  type IntroCam,
} from './pianoIntro';
import type { PianoView } from './pianoScene';
import { GuardActor } from '../ai/guardActor';
import { ENEMIES } from '../ai/enemyDefs';

/**
 * (piano-escape S2) The intro drawn (render only; `pianoIntro.ts` is the data): the camera override (the gameState
 * `SceneView` seam: placed after the game view, gameplay keeps reading `cam.gamePos`), the black fade and the muzzle
 * flicker (two DOM layers), the letterbox, the four intro actors (`IntroActor`: posed stand-ins until Guard AI's
 * GuardActor, #611), their tracers and grain dust at 0.3x, the EMP prompt and burst, and the two framed reveals in play.
 * (S8) One unbroken shot: the rounds punch splinters and dust out of W1 behind the operator, the press pose on the
 * presser's own page, a small spark at the belt (the existing muzzle flash and sparks), the black beat, the knife hand,
 * the view-side lightning (an unlit sheet on W1's face behind the operators and a cold screen lift: a strike, an
 * afterglow and a softer second strike through the glide; no light, so gameplay and the meter never see it), and the
 * glide into the shoulder camera.
 * Built once at the scene's start; every per-frame write goes into kept nodes and the scratch objects below (no
 * allocation per frame).
 */

/**
 * An intro actor: Guard AI's `GuardActor` (PR #611, `src/ai/guardActor.ts`) has exactly this API, and the posed stand-in
 * below implements it, so the swap is the one line in `makeActor`. `step` takes real seconds (the caller caps them).
 */
export interface IntroActor {
  /** Playback rate: 0.3 in the intro, 0 holds. */
  setRate(r: number): void;
  aimAt(x: number, y: number, z: number): void;
  step(realDt: number): void;
  /** One shot (the kick, the muzzle flash); false while not re-armed. */
  fire(): boolean;
  /** The muzzle's world position (the tracer origin) into `out`. */
  muzzle(out: Vector3): Vector3;
  dispose(): void;
  readonly done: boolean;
  readonly pos: Readonly<Vector3>;
  readonly yaw: number;
  readonly travelled: number;
  readonly length: number;
  readonly playRate: number;
  readonly isDisposed: boolean;
}

/** A stand-in figure: legs, torso, head, a rifle up (a static pose). */
const FIGURE: readonly { s: readonly [number, number, number]; p: readonly [number, number, number]; c: string }[] = [
  { s: [0.36, 0.85, 0.24], p: [0, 0.43, 0], c: '#23262a' },
  { s: [0.48, 0.62, 0.28], p: [0, 1.17, 0], c: '#2c3134' },
  { s: [0.22, 0.24, 0.24], p: [0, 1.62, 0], c: '#3a332d' },
  { s: [0.07, 0.09, 0.8], p: [0.14, 1.42, 0.38], c: '#121212' },
];

/**
 * The posed stand-in (no rig, no animation): `GuardActor`'s API on a box figure walked along actor `i`'s path at
 * `speed` x rate (constant pace; the stair's height from the path data, as GuardActor's from the nav), always aimed.
 */
export class PosedStandIn implements IntroActor {
  private readonly root: TransformNode;
  private readonly parts: InstancedMesh[] = [];
  private readonly at = actorPose();
  private readonly p = new Vector3();
  private rate = 0;
  private s = 0;
  private ax = AIM_X;
  private az = AIM_Z;
  private disposed = false;

  constructor(
    scene: GameState['scene'],
    lib: PartLibrary,
    private readonly i: number,
    private readonly speed: number,
  ) {
    this.root = new TransformNode(`piano-actor-${i}`, scene);
    for (const f of FIGURE) {
      const m = lib.instance('box', f.c, 'piano-actor');
      m.parent = this.root;
      m.scaling.set(f.s[0], f.s[1], f.s[2]);
      m.position.set(f.p[0], f.p[1], f.p[2]);
      this.parts.push(m);
    }
    this.place();
  }

  get done(): boolean {
    return this.s >= this.length;
  }
  get pos(): Readonly<Vector3> {
    return this.p;
  }
  get yaw(): number {
    return this.root.rotation.y;
  }
  get travelled(): number {
    return this.s;
  }
  get length(): number {
    return ACTOR_LEN[this.i]!;
  }
  get playRate(): number {
    return this.rate;
  }
  get isDisposed(): boolean {
    return this.disposed;
  }

  setRate(r: number): void {
    this.rate = r > 0 ? r : 0;
  }

  aimAt(x: number, _y: number, z: number): void {
    this.ax = x;
    this.az = z;
  }

  step(realDt: number): void {
    if (this.disposed || !(realDt > 0)) return;
    this.s = Math.min(this.length, this.s + this.speed * this.rate * realDt);
    this.place();
  }

  fire(): boolean {
    return !this.disposed;
  }

  muzzle(out: Vector3): Vector3 {
    const y = this.root.rotation.y;
    return out.set(this.p.x + Math.sin(y) * 0.55, this.p.y + 1.45, this.p.z + Math.cos(y) * 0.55);
  }

  private place(): void {
    const a = actorAtDist(this.i, this.s, this.at);
    this.p.set(a.x, a.y, a.z);
    this.root.position.copyFrom(this.p);
    this.root.rotation.y = Math.atan2(this.ax - a.x, this.az - a.z);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const m of this.parts) m.dispose();
    this.parts.length = 0;
    this.root.dispose();
  }
}

/** The letterbox through the intro (s; cleared at the cut). */
const LETTERBOX_HOLD = 1e6;
/** The letterbox's tail after the cut and around a reveal (s). */
const LETTERBOX_TAIL = 0.6;
/** The longest real step an actor takes in one frame (s; `step` does not cap it). */
const ACTOR_DT_MAX = 0.1;
/** A tracer's streak (m). */
const STREAK = 1.2;
/** Grain dust per impact, its life (s, at 0.3x) and its fall (m/s^2, at 0.3x). */
const DUST_N = 3;
const DUST_S = 1.2;
const DUST_FALL = 9.8 * ACTOR_RATE * ACTOR_RATE;
/** (S8 fix) The EMP's spark at the belt: the existing muzzle flash (size m, life s) and a few cold sparks. */
const SPARK_FLASH = 0.1;
const SPARK_FLASH_S = 0.05;
const SPARK_N = 6;
const SPARK_HEX = '#9cc8ff';
/** (S8 fix) The flash sheet's alpha stays under 1 so it never leaves the alpha-blend pass (no new shader at the flash). */
const FLASH_ALPHA_MAX = 0.99;
/** (S8) Rounds punch through W1: splinters and grain dust out of its west face (x) behind the operators, drifting slow. */
const W1_WEST_X = 4.5;
/** (S8) The flash's backlight: a sheet on W1's west face (x, y 0-2.8, z 3-7.5), so the operators stand black against it. */
const FLASH_X = 4.47;
const FLASH_H = 2.8;
const FLASH_Z0 = 3;
const FLASH_Z1 = 7.5;
/** (S8) The cold flash over the whole picture (screen blend) at its peak. */
const FLASH_SCREEN = 0.3;
/** Opacity strings 0..1 by hundredths (style writes allocate nothing). */
const OPACITY: readonly string[] = Array.from({ length: 101 }, (_, i) => String(i / 100));

const op = (x: number): string => OPACITY[Math.max(0, Math.min(100, Math.round(x * 100)))]!;

export class PianoIntroView implements SceneView, PianoView {
  private readonly cam: IntroCam = introCam();
  /** (S8) The shoulder camera's own pose this frame (the glide's end). */
  private readonly shoulder: IntroCam = introCam();
  private readonly hand = pressHand();
  private readonly knifeHand = pressHand();
  /** (S8 fix) The spark's place and direction (kept: the burst writes into them). */
  private readonly sparkP = new Vector3();
  private readonly sparkN = new Vector3();
  private readonly shot = shotLine();
  private readonly actors: IntroActor[] = [];
  /** Per actor: the shot number last fired (-1 none), whether it fired, and its muzzle at the shot (x, y, z). */
  private readonly firedN: number[] = [];
  private readonly firedOk: boolean[] = [];
  private readonly from = new Float32Array(INTRO_ACTORS.length * 3);
  private readonly mz = new Vector3();
  private readonly tracerBase: Mesh;
  private readonly dustBase: Mesh;
  private readonly flashMesh: Mesh;
  private readonly flashMat: StandardMaterial;
  private readonly tracers: InstancedMesh[] = [];
  private readonly dust: InstancedMesh[] = [];
  /** (S8) Per actor `DUST_N` bits out of W1's west face (the first a splinter). */
  private readonly exit: InstancedMesh[] = [];
  private readonly mats: StandardMaterial[] = [];
  private readonly black: HTMLDivElement | null;
  private readonly flash: HTMLDivElement | null;
  private readonly cold: HTMLDivElement | null;
  private readonly prompt: HTMLDivElement | null;
  private lastBlack = '';
  private lastFlash = '';
  private lastCold = '';
  /** (S8) This page pressed: the press pose plays on our operator; it holds the left hand's reach while on. */
  private pressMine = false;
  private handOn = false;
  /** (S8 fix) The knife hand's reach is held (released at the cut). */
  private knifeOn = false;
  private promptShown = false;
  private boxed = false;
  private clicked = false;
  private actorsGone = false;
  private isCut = false;
  private revealI = -1;
  private revealT = -1;
  private disposed = false;

  constructor(
    private readonly g: GameState,
    private readonly intro: PianoIntro,
    private readonly onSkip: () => void,
  ) {
    const scene = g.scene;
    const unlit = (name: string, r: number, gr: number, b: number, alpha = 1): StandardMaterial => {
      const m = new StandardMaterial(name, scene);
      m.disableLighting = true;
      m.diffuseColor = Color3.Black();
      m.specularColor = Color3.Black();
      m.emissiveColor = new Color3(r, gr, b);
      m.alpha = alpha;
      this.mats.push(m);
      return m;
    };
    const base = (mesh: Mesh, mat: StandardMaterial): Mesh => {
      mesh.material = mat;
      mesh.isPickable = false;
      mesh.isVisible = false;
      return mesh;
    };
    this.tracerBase = base(CreateBox('piano-tracer', { size: 1 }, scene), unlit('piano-tracer', 1, 0.82, 0.45));
    this.dustBase = base(CreateBox('piano-dust', { size: 1 }, scene), unlit('piano-dust', 0.62, 0.55, 0.42));
    // (S8) the flash's backlight sheet (unlit, render only: no light, so gameplay and the meter never see it)
    this.flashMat = unlit('piano-flash', 0.78, 0.86, 1, 0);
    this.flashMesh = base(CreateBox('piano-flash', { size: 1 }, scene), this.flashMat);
    this.flashMesh.scaling.set(0.01, FLASH_H, FLASH_Z1 - FLASH_Z0);
    this.flashMesh.position.set(FLASH_X, FLASH_H / 2, (FLASH_Z0 + FLASH_Z1) / 2);
    // compiled now (in the intro's black), not on the flash's first frame
    this.flashMat.forceCompilation(this.flashMesh);
    for (let i = 0; i < INTRO_ACTORS.length; i++) {
      const t = this.tracerBase.createInstance(`piano-tracer-${i}`);
      t.isVisible = false;
      this.tracers.push(t);
      for (let j = 0; j < DUST_N; j++) {
        const d = this.dustBase.createInstance(`piano-dust-${i}-${j}`);
        d.isVisible = false;
        d.scaling.setAll(0.07);
        this.dust.push(d);
        const x = this.dustBase.createInstance(`piano-exit-${i}-${j}`);
        x.isVisible = false;
        if (j === 0) x.scaling.set(0.018, 0.018, 0.14);
        else x.scaling.setAll(0.06);
        this.exit.push(x);
      }
      const a = this.makeActor(i);
      a.setRate(0);
      a.aimAt(AIM_X, AIM_Y, AIM_Z);
      this.actors.push(a);
      this.firedN.push(-1);
      this.firedOk.push(false);
    }
    // the black layer and the muzzle flicker (over the picture, under the menus), and the prompt
    const doc = typeof document !== 'undefined' ? document : null;
    const layer = (css: string): HTMLDivElement | null => {
      if (!doc) return null;
      const el = doc.createElement('div');
      el.style.cssText = `position:fixed;inset:0;pointer-events:none;${css}`;
      doc.body.appendChild(el);
      return el;
    };
    this.flash = layer('background:#ffb45a;mix-blend-mode:screen;opacity:0;z-index:8998');
    this.cold = layer('background:#a9c8ff;mix-blend-mode:screen;opacity:0;z-index:8998');
    this.black = layer('background:#000;opacity:1;z-index:8999');
    this.prompt = layer(
      "inset:auto 0 18% 0;text-align:center;font:600 22px/1.4 'Barlow Condensed',sans-serif;letter-spacing:.08em;color:#e8edf2;text-shadow:0 1px 3px #000;opacity:0;transition:opacity .4s;z-index:9001",
    );
    if (this.prompt) this.prompt.textContent = `A / E   ${EMP_LABEL.toUpperCase()}`;
    g.sceneView = this;
  }

  /**
   * Intro actor `i` (built at the intro's start, rate 0 until his start time): Guard AI's GuardActor (#611), a real guard
   * rig walking its path with the aimed walk and the fire pose (`PosedStandIn` stays as the API's test double).
   */
  private makeActor(i: number): IntroActor {
    const g = this.g;
    const a = INTRO_ACTORS[i]!;
    // the co-op client has no nav: the stair height from the actor's own path data (S7 check)
    const nav = g.nav ?? { heightAt: (x: number, z: number) => actorHeightAt(i, x, z) };
    return new GuardActor(g.scene, g.world, ENEMIES.grunt, actorPath(i), { speed: ACTOR_WALK, rate: 0, vfx: g.vfx, nav, y: a.pts[0]![1], name: `piano-actor-${i}` });
  }

  /** The intro (to the cut) and a framed reveal hold the operator's input. */
  get holdsInput(): boolean {
    return !this.isCut || this.revealT >= 0;
  }

  /** Before the prompt the pause button is the skip (hold 1 s). */
  get ownsPause(): boolean {
    return !this.isCut && this.intro.pressT < 0 && this.intro.t < PROMPT_AT;
  }

  get revealing(): boolean {
    return this.revealT >= 0;
  }

  frame(dt: number): void {
    if (this.disposed) return;
    const g = this.g;
    const rdt = g.menuPaused ? 0 : dt;
    if (this.revealT >= 0) {
      this.revealFrame(rdt);
      return;
    }
    if (this.isCut) return;
    const intro = this.intro;
    intro.step(rdt);
    if (this.ownsPause) {
      const inp = g.app.input.state;
      if (Math.max(inp.heldTime('pause'), inp.heldTime('objective')) >= SKIP_HOLD_S && intro.skip()) {
        this.onSkip();
        this.actorsToSpots();
      }
    }
    if (!this.boxed) {
      this.boxed = true;
      g.letterbox(LETTERBOX_HOLD);
    }
    intro.camera(this.cam);
    // (S8) the glide: from the hero shot into the shoulder camera's own pose this frame (the game view placed it just
    // before this; `cam.gamePos` and the aim are untouched)
    const gl = intro.glide;
    if (gl > 0) {
      const gc = g.player.cam.camera;
      camFromRotation(gc.position.x, gc.position.y, gc.position.z, gc.rotation.x, gc.rotation.y, gc.fov, this.shoulder);
      glideCamera(this.cam, this.shoulder, gl, this.cam);
    }
    this.place(this.cam);
    const t = intro.t;
    const pressed = intro.pressT >= 0;
    // (S8) the flash: the sheet behind the operators and a cold lift over the picture
    const fl = pressed ? empFlash(intro.sinceEmp) : 0;
    this.flashMesh.isVisible = fl > 0.01;
    this.flashMat.alpha = Math.min(FLASH_ALPHA_MAX, fl);
    const cf = op(fl * FLASH_SCREEN);
    if (cf !== this.lastCold && this.cold) this.cold.style.opacity = this.lastCold = cf;
    if (this.pressMine) this.pressPose(intro.sinceEmp);
    if (pressed) this.knifePose(intro.sinceEmp);
    // the layers: the fade, the flicker on the bins and the face, the prompt
    const b = op(intro.fade());
    if (b !== this.lastBlack && this.black) this.black.style.opacity = this.lastBlack = b;
    const f = op(pressed ? 0 : muzzleFlicker(t) * 0.22);
    if (f !== this.lastFlash && this.flash) this.flash.style.opacity = this.lastFlash = f;
    const pr = intro.promptOn;
    if (pr !== this.promptShown && this.prompt) {
      this.promptShown = pr;
      this.prompt.style.opacity = pr ? '1' : '0';
    }
    // about 14 s: one dry trigger click
    if (!this.clicked && t >= DRY_CLICK_AT && !intro.skipped) {
      this.clicked = true;
      g.weapons.events.onDryFire?.(g.weapons.current.def);
    }
    // the actors and their rounds; at the press they go (the guards spawn on their spots)
    if (pressed) this.actorsOff();
    else this.actorsFrame(t, Math.min(rdt, ACTOR_DT_MAX));
  }

  /**
   * (S8) The press pose (a placeholder, no clip): this page's operator's left hand to the device at his belt, up as he
   * presses it, then back (the rig's world reach; render only). Ends by `PRESS_S`.
   */
  private pressPose(e: number): void {
    const h = pressHandAt(e, this.hand);
    const pl = this.g.player;
    const r = pl.rig.reachL;
    if (e >= PRESS_S) {
      if (this.handOn) r.w = 0;
      this.handOn = false;
      this.pressMine = false;
      return;
    }
    this.reachAt(r, h);
    this.handOn = true;
  }

  /**
   * (S8 fix) The knife hand (a placeholder, no clip): this page's operator's right fist, the knife in it, out in front
   * and to his right (outside his outline against the lit bin face), from the black through the flash, eased off over
   * the glide's end (the rig's world reach; render only).
   */
  private knifePose(e: number): void {
    const h = knifeHandAt(e, this.knifeHand);
    const pl = this.g.player;
    const r = pl.rig.reachR;
    if (h.w <= 0) {
      if (this.knifeOn) r.w = 0;
      this.knifeOn = false;
      return;
    }
    this.reachAt(r, h);
    this.knifeOn = true;
  }

  /** A body-frame hand offset (forward, up, left) from the operator's feet into world reach `r`. */
  private reachAt(r: { x: number; y: number; z: number; w: number }, h: { f: number; u: number; s: number; w: number }): void {
    const pl = this.g.player;
    const yaw = pl.controller.renderYaw;
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    // the left of a +z-facing body is -x: left = (-cos, +sin)
    const p = pl.position;
    r.x = p.x + fx * h.f - fz * h.s;
    r.y = p.y + h.u;
    r.z = p.z + fz * h.f + fx * h.s;
    r.w = h.w;
  }

  /** The actors walk from their start times at 0.3x, fire on the timetable (tracers from their muzzles), idle aimed. */
  private actorsFrame(t: number, adt: number): void {
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i]!;
      a.setRate(t >= ACTOR_START[i]! ? ACTOR_RATE : 0);
      a.step(adt);
      this.tracers[i]!.isVisible = false;
      for (let j = 0; j < DUST_N; j++) this.dust[i * DUST_N + j]!.isVisible = this.exit[i * DUST_N + j]!.isVisible = false;
      if (t >= PROMPT_AT || !shotAt(i, t, this.shot)) continue;
      const s = this.shot;
      if (s.n !== this.firedN[i]) {
        // a new shot on the timetable: the actor fires, the round leaves his muzzle
        this.firedN[i] = s.n;
        this.firedOk[i] = a.fire();
        a.muzzle(this.mz);
        this.from[i * 3] = this.mz.x;
        this.from[i * 3 + 1] = this.mz.y;
        this.from[i * 3 + 2] = this.mz.z;
      }
      if (!this.firedOk[i]) continue;
      s.fx = this.from[i * 3]!;
      s.fy = this.from[i * 3 + 1]!;
      s.fz = this.from[i * 3 + 2]!;
      this.drawShot(i);
    }
  }

  /** The skip: every actor to his spot at once (small capped steps: GuardActor eases its stop). */
  private actorsToSpots(): void {
    for (const a of this.actors) {
      a.setRate(ACTOR_RATE);
      for (let k = 0; k < 600 && !a.done; k++) a.step(ACTOR_DT_MAX);
    }
  }

  /** At the press: the actors, rounds and dust go. */
  private actorsOff(): void {
    if (this.actorsGone) return;
    this.actorsGone = true;
    for (const a of this.actors) a.dispose();
    for (const t of this.tracers) t.isVisible = false;
    for (const d of this.dust) d.isVisible = false;
    for (const d of this.exit) d.isVisible = false;
  }

  /** Actor `i`'s round in flight (a streak) or its impact's grain dust. */
  private drawShot(i: number): void {
    const s = this.shot;
    const dx = s.tx - s.fx;
    const dy = s.ty - s.fy;
    const dz = s.tz - s.fz;
    const len = hyp3(dx, dy, dz);
    const flight = len / TRACER_SPEED;
    if (s.age < flight) {
      const u = s.age / flight;
      const k = Math.min(STREAK, u * len) / len;
      const tr = this.tracers[i]!;
      // the streak's middle, behind its head
      const m = u - k / 2;
      tr.position.set(s.fx + dx * m, s.fy + dy * m, s.fz + dz * m);
      tr.rotation.set(-Math.atan2(dy, hyp2(dx, dz)), Math.atan2(dx, dz), 0);
      tr.scaling.set(0.03, 0.03, Math.max(0.05, k * len));
      tr.isVisible = true;
      return;
    }
    const h = s.age - flight;
    if (h >= DUST_S) return;
    // (S8) the round punches through W1: splinters and grain dust out of its west face beside this page's operator
    const opz = (OPERATOR_SPOTS[this.intro.slot] ?? OPERATOR_SPOTS[0]!)[1];
    const sgn = (s.n + i) % 2 === 0 ? 1 : -1;
    const ez = opz + sgn * (0.25 + ((s.n * 1.3 + i * 0.7) % 0.3));
    const ey = 1.2 + ((s.n * 0.9 + i * 0.37) % 0.6);
    for (let j = 0; j < DUST_N; j++) {
      const d = this.exit[i * DUST_N + j]!;
      const sp = ((s.n * 5 + j * 3) % 5) / 5 - 0.4;
      const v = 0.25 + j * 0.1;
      d.position.set(W1_WEST_X - v * h, ey + 0.2 * v * h - 0.5 * DUST_FALL * h * h, ez + sp * 0.3 * h);
      if (j === 0) d.rotation.set(h * 2.1, 0.6 + h * 1.3, 0);
      d.isVisible = true;
    }
    // the dust bursts back off the bins' face (north face for the stair pair, east face for the aisle pair)
    const nx = i < 2 ? 0 : 1;
    const nz = i < 2 ? 1 : 0;
    for (let j = 0; j < DUST_N; j++) {
      const d = this.dust[i * DUST_N + j]!;
      const sp = ((s.n * 7 + j * 3) % 5) / 5 - 0.4;
      const v = 0.35 + j * 0.12;
      d.position.set(s.tx + (nx * v + nz * sp * 0.4) * h, s.ty + 0.25 * v * h - 0.5 * DUST_FALL * h * h, s.tz + (nz * v + nx * sp * 0.4) * h);
      d.isVisible = true;
    }
  }

  /** The rendered camera from an intro camera (render only: `cam.gamePos` stays the game view). */
  private place(c: IntroCam): void {
    const cam = this.g.player.cam.camera;
    cam.position.set(c.x, c.y, c.z);
    const dx = c.tx - c.x;
    const dy = c.ty - c.y;
    const dz = c.tz - c.z;
    cam.rotation.set(-Math.atan2(dy, hyp2(dx, dz)), Math.atan2(dx, dz), 0);
    cam.fov = c.fov;
  }

  /**
   * (`PianoView`) The EMP burst at the pressing operator's belt, and the existing EMP sound. `mine`: this page pressed,
   * so the press pose plays on our operator (the partner's figure does not show it: that needs a wire field).
   */
  burst(x: number, y: number, z: number, mine: boolean): void {
    this.pressMine = mine;
    // (S8 fix) the prompt goes the moment of the press (no fade)
    if (this.prompt) {
      this.prompt.style.transition = 'none';
      this.prompt.style.opacity = '0';
    }
    this.promptShown = false;
    // (S8 fix) a small, short spark at the belt (the existing muzzle flash and sparks), out in front of him
    const yaw = this.g.player.controller.renderYaw;
    this.sparkN.set(Math.sin(yaw), 0.3, Math.cos(yaw));
    this.sparkP.set(x + this.sparkN.x * 0.15, y, z + this.sparkN.z * 0.15);
    this.g.vfx.muzzleFlash(this.sparkP, SPARK_FLASH, SPARK_FLASH_S);
    this.g.vfx.sparks(this.sparkP, this.sparkN, SPARK_N, SPARK_HEX);
    this.g.events.emit('gadget', { kind: 'emp', phase: 'detonate' });
  }

  /** (`PianoView`) The cut: the shoulder camera again, the layers and stand-ins gone, the letterbox eases off. */
  cut(): void {
    if (this.isCut) return;
    this.isCut = true;
    this.g.letterbox(LETTERBOX_TAIL);
    this.clearIntro();
  }

  /** (`PianoView`) Framed reveal `i` (1.5 s, input held). */
  reveal(i: number): void {
    if (!this.isCut || this.revealT >= 0) return;
    this.revealI = i;
    this.revealT = 0;
    this.g.letterbox(REVEAL_S + LETTERBOX_TAIL);
  }

  private revealFrame(rdt: number): void {
    this.revealT += rdt;
    if (this.revealT >= REVEAL_S) {
      this.revealT = -1;
      return;
    }
    this.place(revealCamera(this.revealI, this.revealT / REVEAL_S, this.cam));
  }

  /** The intro's own things go (once): the actors, rounds, dust, burst, layers. */
  private clearIntro(): void {
    this.actorsOff();
    this.actors.length = 0;
    for (const t of this.tracers) t.dispose();
    this.tracers.length = 0;
    for (const d of this.dust) d.dispose();
    this.dust.length = 0;
    for (const d of this.exit) d.dispose();
    this.exit.length = 0;
    this.tracerBase.dispose();
    this.dustBase.dispose();
    this.flashMesh.dispose();
    for (const m of this.mats) m.dispose();
    this.mats.length = 0;
    if (this.handOn) this.g.player.rig.reachL.w = 0;
    if (this.knifeOn) this.g.player.rig.reachR.w = 0;
    this.handOn = this.pressMine = this.knifeOn = false;
    this.black?.remove();
    this.flash?.remove();
    this.cold?.remove();
    this.prompt?.remove();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (!this.isCut) {
      this.isCut = true;
      this.clearIntro();
    }
    this.revealT = -1;
    if (this.g.sceneView === this) this.g.sceneView = null;
  }
}
