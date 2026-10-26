import { PhysicsRaycastResult, Vector3, type PhysicsEngine, type Scene } from '../core/babylon';
import { G } from '../physics/groups';
import { CT, LEAP, MOVEMENT } from '../config/movement';
import { pickTraversal, type Traversal, type TraversalProbe } from './movement';
import { gearCap } from './speedGears';
import { traversePath, type PathKind } from './traversePath';
import type { Player } from './player';
import { hyp2 } from '../core/mathx';
import type { AttachMachine, ExitReason } from './attach';
import type { MoveOverride } from './playerController';
import { AttachController, anchorFirst, LOWER_HOLD, type AttachInput } from './attachController';
import { nearestInReach, type Anchor, type AnchorKind, type AttachEntry, type ReachResult, type TraversalAnchors, type WindowAnchor } from '../world/anchors';
import type { Breakables } from '../world/breakables';
import type { AttachCamera } from '../config/camera';

const Q = { membership: G.PLAYER, collideWith: G.STATIC };
/** (player-hygiene S1) The probe's ray heights over the feet (m), in order, and the window probe's anchor kinds. */
const PROBE_HEIGHTS = [0.25, 0.6, 1.0, 1.4] as const;
const WINDOW_KINDS: readonly AnchorKind[] = ['window'];

/** Durations (s) of each committed traversal from a standstill; quicker in stride (see `duration`). */
export const TRAVERSE_TIME: Record<Exclude<Traversal, 'none'> | 'drop' | 'hop' | 'roll', number> = { step: 0.4, vault: 0.7, mantle: 1.0, drop: 0.35, hop: 0.5, roll: 0.62 };

/** Fastest each move gets at speed (s). (ct-prototype G4, AUDIT-TRAVERSAL #7 / #18, CT 110522 11.0-12.16 a crate mantle
 *  1.0-1.15 s, 111424 0.8-1.46 a rail vault 0.65 s, both at a walk or more) vault 0.42 -> 0.6, mantle 0.75 -> 0.9. */
export const MIN_TIME: Record<keyof typeof TRAVERSE_TIME, number> = { step: 0.22, vault: 0.6, mantle: 0.9, drop: 0.25, hop: 0.38, roll: 0.55 };
/** (G4, AUDIT-TRAVERSAL #18, CT 111424 3.63-4.30) A vault onto a floor this much lower than the take-off (m) lands crouched. */
export const VAULT_LAND_CROUCH = 0.3;
/** Landing roll: furthest it travels (m) and the least room it needs to be worth playing (m). */
const ROLL_LENGTH = 1.6;
const ROLL_MIN = 0.6;
/** (anim-n4b fix) Room kept clear past a roll's end (m, to a wall 0.45 m up): the grounded shoulder roll's dive puts the
 *  head ~0.8 m ahead of the feet late in the roll (animation `rollBody`; was 0.4 for the old tight somersault: the head
 *  went 30 cm into the wall after the vent drop, e2e-clip 'duct crawl + vent'). */
export const ROLL_CLEAR = 0.9;

/** Committed duration at an entry speed: in stride the move takes about as long as covering it. */
export function traverseDuration(kind: keyof typeof TRAVERSE_TIME, speed: number, length: number): number {
  const base = TRAVERSE_TIME[kind];
  if (speed < 1) return base;
  return Math.max(MIN_TIME[kind], Math.min(base, (length / speed) * 1.15));
}

/** Result of probing the space in front of the feet. */
export interface TraverseProbe {
  kind: Traversal | 'drop' | 'hop';
  /** Distance to the obstacle face (m), top height above the feet and depth. */
  front: number;
  height: number;
  depth: number;
  /** Feet position at the end of the move. */
  end: Vector3;
}

/**
 * Contextual "jump": there is no free jump. Pressing jump in front of an obstacle picks a step up,
 * vault (low and thin, clear landing) or mantle (up to chest height, room on top); at a ledge it is a
 * controlled drop. Each is a committed, eased kinematic move with the weapon at high ready. The
 * probe also runs a few times a second so the HUD can show what jump would do.
 */
export class TraversalController {
  kind: Traversal | 'drop' | 'hop' | 'roll' = 'none';
  /** The committed vault goes through a window (a low dive). */
  private throughWindow = false;
  /** The roll is the Chaos Theory forward roll (a crouch tap at speed; ends crouched), not a landing roll. */
  private ctRoll = false;
  /** Chaos Theory forward rolls started (GameState makes their noise). */
  forwardRolls = 0;
  /** Landing counter last seen (a new landing in the roll band starts a roll). */
  private landings = 0;
  t = 0;
  /** Committed duration of the current move, entry speed and whether a sprint carried into it. */
  private dur = 1;
  private speed0 = 0;
  /** What jump would do right now (for the prompt), refreshed at 5 Hz. */
  hint: TraverseProbe | null = null;
  /** Where the hint's obstacle face (or ledge) is: on the ground under it, at the feet height. */
  readonly hintAt = new Vector3();
  private eng: PhysicsEngine;
  private rr = new PhysicsRaycastResult();
  private a = new Vector3();
  private b = new Vector3();
  private from = new Vector3();
  private to = new Vector3();
  private kin = new Vector3();
  /** (player-hygiene S1) The committed move's override, every field reassigned each step (`kinematic` is `kin`). */
  private readonly moveOv: MoveOverride = { kinematic: this.kin, yaw: 0, crouch: false };
  /** (player-hygiene S1) The probe's result (`probe` and `windowProbe` share it: the hint is copied at the commit and
   *  read by the HUD in the same frame), `pickTraversal`'s input and `probeDir`'s direction. */
  private readonly probeOut: TraverseProbe = { kind: 'none', front: 0, height: 0, depth: 0, end: new Vector3() };
  private readonly pickIn: TraversalProbe = { height: 0, depth: 0, landingClear: false, topClear: false };
  private readonly probeD = { x: 0, z: 0 };
  /** (player-hygiene S1) Each window's glass key (`glass:<id>`), built once. */
  private readonly glassKeys = new WeakMap<WindowAnchor, string>();
  private dir = new Vector3(0, 0, 1);
  private top = 0;
  private probeT = 0;
  /** (3.2.0) The manual jump: seconds since the take-off (-1: not in one), the split gap under it, the pause before
   *  the next one and a counter (tests). */
  private leapT = -1;
  private leapSplit: ReachResult | null = null;
  private leapCool = 0;
  leaps = 0;
  /** Attached locomotion (ladder, pipe, hang, duct, zipline). */
  readonly attachCtl: AttachController;
  /** The window the vault hint goes through (glazed: the vault breaks it), or null. */
  hintWindow: WindowAnchor | null = null;
  /** Window glass and duct grates (set by GameState). */
  private _breakables: Breakables | null = null;
  get breakables(): Breakables | null {
    return this._breakables;
  }
  set breakables(b: Breakables | null) {
    this._breakables = b;
    this.attachCtl.breakables = b;
  }
  private anchors: TraversalAnchors;
  /** Where the attach hint's grip is (prompt). */
  readonly attachAt = new Vector3();
  constructor(
    scene: Scene,
    private player: Player,
    anchors: TraversalAnchors,
  ) {
    this.eng = scene.getPhysicsEngine() as PhysicsEngine;
    this.anchors = anchors;
    this.attachCtl = new AttachController(
      player,
      anchors,
      this.kin,
      (x, y, z) => this.roomAt(x, y, z),
      (x, z, y) => (this.floorHit(x, z, y, 3) ? this.hitY : null),
      (ax, ay, az, bx, by, bz) => !this.rayHit(this.a.set(ax, ay, az), this.b.set(bx, by, bz)),
    );
    // (3.2.0) off a rope through a window beside it: the window vault from there (the glass breaks)
    this.attachCtl.onKickThrough = (w, fx, fy, fz, tx, ty, tz) => {
      if (!w.open) this.breakables?.open(`glass:${w.id}`, 'break');
      this.throughWindow = true;
      this.ctRoll = false;
      this.kind = 'vault';
      this.t = 0;
      this.speed0 = 2;
      this.dur = TRAVERSE_TIME.vault * 0.9;
      this.from.set(fx, fy, fz);
      this.to.set(tx, ty, tz);
      this.top = Math.max(fy, w.sillHeight) + 0.05;
      const l = hyp2(tx - fx, tz - fz) || 1;
      this.dir.set((tx - fx) / l, 0, (tz - fz) / l);
      this.hint = null;
      this.moves = (this.moves + 1) & 255;
    };
  }

  /** A standing body's worth of free space above (x, y, z) (and nothing solid at the feet). */
  private roomAt(x: number, y: number, z: number): boolean {
    return !this.rayHit(this.a.set(x, y + 0.05, z), this.b.set(x, y + MOVEMENT.standHeight, z));
  }

  get attach(): AttachMachine {
    return this.attachCtl.m;
  }

  get input(): AttachInput {
    return this.attachCtl.input;
  }

  get active(): boolean {
    return this.kind !== 'none' || this.attachCtl.active;
  }

  /** Attached (ladder, pipe, hang, duct, zipline), including its enter / exit blends. */
  get attached(): boolean {
    return this.attachCtl.active;
  }

  /** Camera framing preset while attached (null otherwise). */
  get cameraPreset(): AttachCamera | null {
    return this.attachCtl.camera;
  }

  /** Anchor a traverse press would attach to from the ground (prompt). */
  get attachHint(): ReachResult | null {
    return this.attachCtl.hint;
  }

  /** Attach to an anchor now (tests, chains): blends from the current feet onto it. */
  attachTo(a: Anchor, s: number, entry: AttachEntry = 'side', face = 1): boolean {
    if (this.kind !== 'none') return false;
    this.hint = null;
    return this.attachCtl.attachTo(a, s, entry, face);
  }

  detach(reason: ExitReason): void {
    this.attachCtl.detach(reason);
  }

  /** Render frame: hand / foot contacts while attached. */
  frameUpdate(dt: number, alpha: number): void {
    this.attachCtl.frameUpdate(dt, alpha);
  }

  /**
   * (player-hygiene S1b) A cast's ends (from x, y, z, to x, y, z): the probe writes them here and `segHit` builds the ray
   * from them with `Vector3.FromArrayToRef`, so no double crosses a call. A double passed to or returned from a call V8
   * does not inline boxes (16 B), and the probe has more `Vector3.set` calls than V8's inlining budget covers. (A number
   * array, Babylon's `FloatArray`: it holds doubles unboxed.)
   */
  private readonly seg: number[] = [0, 0, 0, 0, 0, 0];
  /** (player-hygiene S1b) The last hit point (`segHit`), and its distance and height: never null. */
  private readonly hitP: number[] = [0, 0, 0];
  private hitD = 0;
  private hitY = 0;

  /**
   * The ray from `seg[0..2]` to `seg[3..5]`: true on a hit, its distance in `hitD` and height in `hitY`. (player-hygiene
   * S1b) A boolean and number fields, not `number | null`; the distance is Babylon's `Vector3.Distance` written out in its
   * order. (S1) `rr.reset(from, to)`, not `reset()`: Babylon's no-argument reset builds two zero vectors.
   */
  private segHit(): boolean {
    const s = this.seg;
    const from = Vector3.FromArrayToRef(s, 0, this.a);
    const to = Vector3.FromArrayToRef(s, 3, this.b);
    this.rr.reset(from, to);
    this.eng.raycastToRef(from, to, this.rr, Q);
    if (!this.rr.hasHit) return false;
    const p = this.hitP;
    this.rr.hitPoint.toArray(p, 0);
    const x = s[0]! - p[0]!;
    const y = s[1]! - p[1]!;
    const z = s[2]! - p[2]!;
    this.hitD = Math.sqrt(x * x + y * y + z * z);
    this.hitY = p[1]!;
    return true;
  }

  /** A ray from `from` to `to` (`segHit`): true on a hit, its distance in `hitD` (player-hygiene S1b). */
  private rayHit(from: Vector3, to: Vector3): boolean {
    from.toArray(this.seg, 0);
    to.toArray(this.seg, 3);
    return this.segHit();
  }

  /** A floor under (x, z) between yFrom and yFrom - depth (`segHit`): true on a hit, its height in `hitY`
   *  (player-hygiene S1b). */
  private floorHit(x: number, z: number, yFrom: number, depth: number): boolean {
    const s = this.seg;
    s[0] = x;
    s[1] = yFrom;
    s[2] = z;
    s[3] = x;
    s[4] = yFrom - depth;
    s[5] = z;
    return this.segHit();
  }

  /** (player-hygiene S1) The window's breakable glass key (`glass:<id>`), built once per window. */
  private glassKey(w: WindowAnchor): string {
    let k = this.glassKeys.get(w);
    if (k === undefined) {
      k = `glass:${w.id}`;
      this.glassKeys.set(w, k);
    }
    return k;
  }

  /**
   * Look along `dir` from the feet and classify the obstacle (or ledge). (player-hygiene S1b) Every cast's ends go into
   * `seg` and the result's end into `probeOut.end` through it (`segHit`): no double crosses a call here.
   */
  probe(feet: Vector3, dx: number, dz: number): TraverseProbe | null {
    this.hintWindow = null;
    const wp = this.windowProbe(feet, dx, dz);
    if (wp) return wp;
    const o = this.probeOut;
    const s = this.seg;
    const px = feet.x;
    const py = feet.y;
    const pz = feet.z;
    const reach = 1.3;
    let front = Infinity;
    for (let i = 0; i < PROBE_HEIGHTS.length; i++) {
      const h = PROBE_HEIGHTS[i]!;
      s[0] = px;
      s[1] = py + h;
      s[2] = pz;
      s[3] = px + dx * reach;
      s[4] = py + h;
      s[5] = pz + dz * reach;
      if (this.segHit()) front = Math.min(front, this.hitD);
    }
    if (front === Infinity) {
      // nothing in front: a ledge?
      const ax = px + dx * 0.75;
      const az = pz + dz * 0.75;
      // (the floor casts: `floorHit`'s ends)
      s[0] = ax;
      s[1] = py + 0.3;
      s[2] = az;
      s[3] = ax;
      s[4] = py + 0.3 - 4;
      s[5] = az;
      const fHit = this.segHit();
      const f = this.hitY;
      if ((!fHit || py - f > 0.6) && this.player.controller.speed > 3.5) {
        // running at a gap: a quick hop if there is floor at about the same height beyond it
        for (let d = 1.4; d <= 3.2; d += 0.3) {
          s[0] = px + dx * d;
          s[1] = py + 0.5;
          s[2] = pz + dz * d;
          s[3] = px + dx * d;
          s[4] = py + 0.5 - 1.0;
          s[5] = pz + dz * d;
          const gHit = this.segHit();
          const g = this.hitY;
          if (gHit && Math.abs(g - py) < 0.35) {
            const out = d + 0.5;
            s[0] = px;
            s[1] = py + 0.9;
            s[2] = pz;
            s[3] = px + dx * out;
            s[4] = py + 0.9;
            s[5] = pz + dz * out;
            if (!this.segHit()) {
              o.kind = 'hop';
              o.front = d;
              o.height = 0;
              o.depth = d;
              s[0] = px + dx * out;
              s[1] = g;
              s[2] = pz + dz * out;
              Vector3.FromArrayToRef(s, 0, o.end);
              return o;
            }
          }
        }
      }
      if (!fHit || py - f > 0.6) {
        const land = fHit ? f : py - 4;
        // step out far enough that the capsule clears the edge
        const out = 0.75 + MOVEMENT.radius + 0.2;
        o.kind = 'drop';
        o.front = 0.75;
        o.height = land - py;
        o.depth = 0;
        s[0] = px + dx * out;
        s[1] = land;
        s[2] = pz + dz * out;
        Vector3.FromArrayToRef(s, 0, o.end);
        return o;
      }
      return null;
    }
    if (front < MOVEMENT.radius - 0.05) return null;
    // top of the obstacle just past its face
    const fx = px + dx * (front + 0.12);
    const fz = pz + dz * (front + 0.12);
    s[0] = fx;
    s[1] = py + 2.0;
    s[2] = fz;
    s[3] = fx;
    s[4] = py + 2.0 - 2.0;
    s[5] = fz;
    if (!this.segHit()) return null;
    const topY = this.hitY;
    const height = topY - py;
    // depth: walk across the top until it ends
    let depth = 0.12;
    while (depth < 1.6) {
      s[0] = px + dx * (front + depth + 0.1);
      s[1] = topY + 0.3;
      s[2] = pz + dz * (front + depth + 0.1);
      s[3] = s[0]!;
      s[4] = topY + 0.3 - 0.45;
      s[5] = s[2]!;
      if (!this.segHit() || Math.abs(this.hitY - topY) > 0.12) break;
      depth += 0.1;
    }
    // landing beyond (vault): floor near the feet height, and the arc over the top is clear
    const lx = px + dx * (front + depth + 0.55);
    const lz = pz + dz * (front + depth + 0.55);
    s[0] = lx;
    s[1] = topY + 0.3;
    s[2] = lz;
    s[3] = lx;
    s[4] = topY + 0.3 - (height + 1.2);
    s[5] = lz;
    const landHit = this.segHit();
    const landY = this.hitY;
    const arcY = topY + 0.45;
    s[0] = px;
    s[1] = arcY;
    s[2] = pz;
    s[3] = lx;
    s[4] = arcY;
    s[5] = lz;
    const arcClear = !this.segHit();
    const landingClear = landHit && Math.abs(landY - py) < 0.6 && arcClear;
    // standing room on top (mantle)
    const mx = px + dx * (front + 0.4);
    const mz = pz + dz * (front + 0.4);
    s[0] = mx;
    s[1] = topY + 0.05;
    s[2] = mz;
    s[3] = mx;
    s[4] = topY + MOVEMENT.standHeight;
    s[5] = mz;
    let topClear = !this.segHit();
    if (topClear) {
      s[0] = px;
      s[1] = topY + 0.5;
      s[2] = pz;
      s[3] = mx;
      s[4] = topY + 0.5;
      s[5] = mz;
      topClear = !this.segHit();
    }
    const pi = this.pickIn;
    pi.height = height;
    pi.depth = depth;
    pi.landingClear = landingClear;
    pi.topClear = topClear;
    const kind = pickTraversal(pi);
    if (kind === 'none') return null;
    o.kind = kind;
    o.front = front;
    o.height = height;
    o.depth = depth;
    s[0] = kind === 'vault' ? lx : mx;
    s[1] = kind === 'vault' ? (landHit ? landY : py) : topY;
    s[2] = kind === 'vault' ? lz : mz;
    Vector3.FromArrayToRef(s, 0, o.end);
    return o;
  }

  /** Through a window (open, or glazed and breakable): a vault over the sill to the floor on the far side. */
  private windowProbe(feet: Vector3, dx: number, dz: number): TraverseProbe | null {
    const r = nearestInReach(this.anchors, feet.x, feet.y, feet.z, dx, dz, WINDOW_KINDS);
    if (!r) return null;
    const w = r.anchor as WindowAnchor;
    if (!w.open && !w.breakable && !(this.breakables?.isOpen(this.glassKey(w)) ?? true)) return null;
    const nx = Math.sin(w.yaw);
    const nz = Math.cos(w.yaw);
    const side = (feet.x - w.c.x) * nx + (feet.z - w.c.z) * nz;
    const through = side > 0 ? -1 : 1;
    // land a stride beyond the frame on the far floor
    const lat = r.s - w.w / 2;
    const cx = w.c.x + nz * lat;
    const cz = w.c.z - nx * lat;
    const ex = cx + nx * through * 0.9;
    const ez = cz + nz * through * 0.9;
    if (!this.floorHit(ex, ez, w.sillHeight + 0.2, 2.5)) return null;
    const land = this.hitY;
    if (Math.abs(land - feet.y) > 0.6) return null;
    this.hintWindow = w;
    const o = this.probeOut;
    o.kind = 'vault';
    o.front = r.dist;
    o.height = w.sillHeight - feet.y;
    o.depth = 0.3;
    o.end.set(ex, land, ez);
    return o;
  }

  /** Movement direction to probe along: the stick if pushed, else where the body faces. */
  private probeDir(): { x: number; z: number } {
    const c = this.player.controller;
    const w = c.wishDir;
    const l = hyp2(w.x, w.z);
    const o = this.probeD;
    if (l > 0.3) {
      o.x = w.x / l;
      o.z = w.z / l;
      return o;
    }
    o.x = Math.sin(c.yaw);
    o.z = Math.cos(c.yaw);
    return o;
  }

  /**
   * Fixed step. `jumpPressed` is the contextual action; `blocked` while another system (cover) owns
   * the controller. Returns true while a traversal drives the player.
   */
  fixedUpdate(dt: number, jumpPressed: boolean, blocked: boolean, dir: { x: number; z: number } | null = null): boolean {
    const p = this.player;
    const c = p.controller;
    const pose = p.pose;
    if (this.attachCtl.active) {
      this.attachCtl.fixedUpdate(dt, jumpPressed);
      return true;
    }
    if (this.attachCtl.updateVent(dt)) return true;
    // teleported mid-move (respawn, tests): the committed move is gone
    if (c.teleports !== this.teleports) {
      this.teleports = c.teleports;
      this.landings = c.landings;
      if (this.active) {
        c.override = null;
        this.kind = 'none';
        this.ctRoll = false;
        pose.traverse = 'none';
        pose.traverseT = 0;
      }
    }
    if (this.active) {
      this.t += dt;
      const k = Math.min(1, this.t / this.dur);
      this.path(k);
      pose.traverse = this.throughWindow ? 'windowVault' : this.kind;
      pose.traverseT = k;
      // (anim-n4b) the move's geometry for the mantle's hand plant (animation only)
      pose.traverseH = this.top - this.from.y;
      pose.traverseD = hyp2(this.to.x - this.from.x, this.to.z - this.from.z);
      const mo = this.moveOv;
      mo.kinematic = this.kin;
      mo.yaw = Math.atan2(this.dir.x, this.dir.z);
      mo.crouch = this.kind === 'vault' || this.ctRoll;
      c.override = mo;
      if (k >= 1) {
        const inStride = this.speed0 >= 1;
        // a standing climb settles; in stride the move lands straight into the gait it came from
        if ((this.kind === 'vault' || this.kind === 'mantle') && !inStride) c.landT = Math.max(c.landT, 0.2);
        c.override = null;
        if (inStride && this.kind !== 'mantle') {
          c.motion.carry(this.dir.x * this.speed0, this.dir.z * this.speed0);
        }
        // the forward roll comes up crouched; (G4) so does a vault down onto a lower floor
        if (this.ctRoll || (this.kind === 'vault' && !this.throughWindow && this.from.y - this.to.y >= VAULT_LAND_CROUCH)) c.setCrouchToggle();
        this.kind = 'none';
        this.throughWindow = false;
        this.ctRoll = false;
        pose.traverse = 'none';
        pose.traverseT = 0;
      }
      return true;
    }
    // a landing from 2.5-4.5 m: roll out of it, keeping the momentum
    if (c.landings !== this.landings) {
      this.landings = c.landings;
      if (c.lastLanding === 'roll' && c.grounded && p.alive && !blocked && this.startRoll()) return this.fixedUpdate(0, false, false);
    }
    const ac = this.attachCtl;
    this.leapCool = Math.max(0, this.leapCool - dt);
    // falling past a lip: traverse grabs it
    if (!c.grounded && p.alive && !blocked) {
      this.hint = null;
      ac.lower = null;
      // (3.2.0) a manual jump: a second press over a split gap braces in it; the hands take what comes in reach
      if (this.leapT >= 0) {
        this.leapT += dt;
        const sp = this.leapSplit;
        if (sp && jumpPressed && this.leapT <= LEAP.doubleTap) {
          this.leapT = -1;
          this.leapSplit = null;
          // facing along the hallway the way the jump was going (else the way the body faces)
          if (sp.anchor.kind === 'split') {
            const v = c.vel;
            const moving = v.x * v.x + v.z * v.z > 0.25;
            const dx = moving ? v.x : Math.sin(c.yaw);
            const dz = moving ? v.z : Math.cos(c.yaw);
            sp.face = dx * sp.anchor.tx + dz * sp.anchor.tz >= 0 ? 1 : -1;
          }
          return ac.attachFrom(sp);
        }
        if (!sp || this.leapT >= LEAP.splitWait) {
          const g = ac.fallProbe(c.pos) ?? ac.leapProbe(c.pos);
          if (g) {
            this.leapT = -1;
            this.leapSplit = null;
            return ac.attachFrom(g, 0.15);
          }
        }
      }
      ac.hint = ac.fallProbe(c.pos);
      if (ac.hint && jumpPressed) return ac.attachFrom(ac.hint, 0.15);
      return false;
    }
    if (blocked || !p.alive || !c.grounded) {
      this.hint = null;
      ac.hint = null;
      ac.lower = null;
      return false;
    }
    // (landed from a manual jump)
    if (this.leapT > 0.1) {
      this.leapT = -1;
      this.leapSplit = null;
    }
    // (G32) crouch HELD standing at the run is a committed forward roll (a tap just crouches)
    if (c.rollHeld && this.canForwardRoll() && this.startRoll(true)) {
      c.takeRollHold();
      return this.fixedUpdate(0, false, false);
    }
    this.probeT -= dt;
    if (this.probeT <= 0 || jumpPressed) {
      this.probeT = 0.2;
      const d = dir ?? this.probeDir();
      this.hint = this.probe(c.pos, d.x, d.z);
      ac.hint = ac.probe(c.pos, d.x, d.z);
      if (this.hint) {
        this.dir.set(d.x, 0, d.z);
        const f = this.hint.kind === 'hop' || this.hint.kind === 'drop' ? 0.6 : this.hint.front;
        this.hintAt.set(c.pos.x + d.x * f, c.pos.y, c.pos.z + d.z * f);
      }
    }
    // anchors: a climb / grab when nothing closer is offered (a step, vault or mantle wins)
    const h = this.hint;
    const ah = ac.hint;
    const geo = h && h.kind !== 'drop' && !anchorFirst(ah);
    // lowering into a hang is the drop control (held); traverse at the edge still drops down
    // (a press made at the edge: crouch held for a while in hold mode never lowers you over it)
    const low = ac.lower;
    const lower = !!low && ac.input.dropHeldT >= LOWER_HOLD && ac.input.dropHeldT < LOWER_HOLD + 0.5;
    if (lower && low && !geo) {
      this.hint = null;
      return ac.attachFrom(low);
    }
    if (ah && !geo && jumpPressed) {
      this.hint = null;
      return ac.attachFrom(ah);
    }
    if (jumpPressed && this.hint) {
      // a glazed window shatters as the vault goes through it (loud)
      const w = this.hintWindow;
      if (w && !w.open) this.breakables?.open(this.glassKey(w), 'break');
      this.throughWindow = !!w;
      this.kind = this.hint.kind;
      this.t = 0;
      this.speed0 = c.speed;
        this.dur = traverseDuration(this.kind as keyof typeof TRAVERSE_TIME, this.speed0, hyp2(this.hint.end.x - c.pos.x, this.hint.end.z - c.pos.z));
      this.from.copyFrom(c.pos);
      this.to.copyFrom(this.hint.end);
      this.top = c.pos.y + Math.max(0, this.hint.height);
      this.hint = null;
      this.moves = (this.moves + 1) & 255;
      return this.fixedUpdate(0, false, false);
    }
    // nothing on offer: traverse is a jump (a second press over a split gap braces in it)
    if (jumpPressed) this.leap();
    return false;
  }

  /**
   * (3.2.0) The manual jump from the ground: straight up at `LEAP.vy` keeping the run's pace (standing up from a
   * crouch). In the air `fixedUpdate` grabs what comes within reach and takes a second press over a split gap.
   */
  leap(): boolean {
    const p = this.player;
    const c = p.controller;
    if (this.leapCool > 0 || !c.grounded || c.override || this.kind !== 'none' || this.attachCtl.active || !p.alive) return false;
    c.clearCrouchToggle();
    const sp = hyp2(c.vel.x, c.vel.z);
    const v = Math.min(LEAP.maxSpeed, sp * LEAP.carry);
    const k = sp > 1e-3 ? v / sp : 0;
    c.launch(c.vel.x * k, LEAP.vy, c.vel.z * k);
    this.leapT = 0;
    this.leapSplit = this.attachCtl.split;
    this.leapCool = LEAP.cooldown;
    this.leaps++;
    this.hint = null;
    this.attachCtl.hint = null;
    return true;
  }

  /** A held crouch now would roll: standing, free, moving at the top gear with the stick pushed. */
  private canForwardRoll(): boolean {
    const c = this.player.controller;
    if (c.crouched || c.override || !c.grounded || this.player.ads) return false;
    if (c.gear < CT.rollGear) return false;
    const w = c.wishDir;
    return c.speed >= CT.rollMinSpeed && hyp2(w.x, w.z) > 0.3;
  }

  /**
   * Roll along the landing velocity (or the facing), as far as there is room. `forward`: the Chaos Theory forward
   * roll along the travel direction (`CT.rollLength` in `CT.rollTime`, comes up crouched).
   */
  private startRoll(forward = false): boolean {
    const c = this.player.controller;
    let dx = forward ? c.motion.vx : c.landVX;
    let dz = forward ? c.motion.vz : c.landVZ;
    let sp = hyp2(dx, dz);
    if (sp < 0.5) {
      dx = Math.sin(c.yaw);
      dz = Math.cos(c.yaw);
      sp = 0;
    } else {
      dx /= sp;
      dz /= sp;
    }
    const full = forward ? CT.rollLength : ROLL_LENGTH;
    const hit = this.rayHit(this.a.set(c.pos.x, c.pos.y + 0.45, c.pos.z), this.b.set(c.pos.x + dx * (full + ROLL_CLEAR), c.pos.y + 0.45, c.pos.z + dz * (full + ROLL_CLEAR)));
    const len = !hit ? full : Math.min(full, this.hitD - ROLL_CLEAR);
    if (len < ROLL_MIN) return false;
    this.kind = 'roll';
    this.throughWindow = false;
    this.ctRoll = forward;
    this.t = 0;
    // the forward roll comes out at the crouched pace of the gear it went in at
    this.speed0 = forward ? Math.min(sp, gearCap(c.gear, true)) : Math.max(sp, 2.5);
    this.dur = forward ? CT.rollTime : TRAVERSE_TIME.roll;
    if (forward) {
      this.forwardRolls++;
    }
    this.dir.set(dx, 0, dz);
    this.from.copyFrom(c.pos);
    this.to.set(c.pos.x + dx * len, c.pos.y, c.pos.z + dz * len);
    this.top = c.pos.y;
    c.landT = 0;
    this.moves = (this.moves + 1) & 255;
    return true;
  }

  /** Feet position along the committed path at progress k (`traversePath`, shared with co-op remotes). */
  private path(k: number): void {
    traversePath(this.kind === 'none' ? 'step' : (this.kind as PathKind), this.from, this.to, this.top, this.speed0, k, this.kin);
  }

  /** The committed move under way (co-op: remotes replay it from its start): kind, path ends, top, speed, duration. */
  get committed(): { kind: Traversal | 'drop' | 'hop' | 'roll'; window: boolean; from: Vector3; to: Vector3; top: number; speed: number; dur: number; t: number; n: number } | null {
    if (this.kind === 'none') return null;
    const c = this.commitInfo;
    c.kind = this.kind;
    c.window = this.throughWindow;
    c.from = this.from;
    c.to = this.to;
    c.top = this.top;
    c.speed = this.speed0;
    c.dur = this.dur;
    c.t = this.t;
    c.n = this.moves;
    return c;
  }

  private commitInfo = { kind: 'none' as Traversal | 'drop' | 'hop' | 'roll', window: false, from: new Vector3(), to: new Vector3(), top: 0, speed: 0, dur: 1, t: 0, n: 0 };
  /** Committed moves started (a counter the network state carries). */
  private moves = 0;
  private teleports = 0;

  reset(): void {
    // a committed move owns the controller's kinematic override: hand it back
    if (this.kind !== 'none') this.player.controller.override = null;
    this.leapT = -1;
    this.leapSplit = null;
    this.kind = 'none';
    this.ctRoll = false;
    this.hint = null;
    this.attachCtl.reset();
  }
}
