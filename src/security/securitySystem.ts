import { Vector3 } from '../core/babylon';
import type { PlayerRef } from '../ai/enemy';
import type { Ballistics } from '../weapons/ballistics';
import { MASK } from '../physics/groups';
import { CAMERA } from '../config/security';
import { hyp3 } from '../core/mathx';
import { CameraUnit, cameraRate, nearestHousing, stepCamMeter, type CamMeter } from './camera';
import { cameraAlertsGuards, type SecurityData } from './data';
import type { SecurityView } from './securityView';

/** What the system needs from the match (kept small so tests and the view stay independent of `GameState`). */
export interface SecurityHost {
  ballistics: Ballistics;
  players(): readonly PlayerRef[];
}

/** What a camera reports (S1 Part B turns these into desk responses). */
export type SecurityEvent =
  | { kind: 'stage'; camera: string; player: string; stage: 1 | 2; x: number; z: number }
  | { kind: 'cameraDown'; camera: string; x: number; z: number };

/** The no-allocation static ray the camera test casts (`Ballistics.hitDistance`). */
export interface SightRay {
  hitDistance(from: Vector3, to: Vector3, collideWith: number): number;
}

const LENS = new Vector3();

/** (camera-cue fix) A body as the camera test reads it: head centre, crouch and speed (no light: the camera has its own IR). */
export interface SeenBody {
  head: Vector3;
  crouched: boolean;
  speed: number;
}

export function newSeenBody(): SeenBody {
  return { head: new Vector3(), crouched: false, speed: 0 };
}

/** The standing / crouched head height the host gives a remote body (`RemotePlayer.headPoint` off a wall). */
export function remoteHeadY(feetY: number, crouched: boolean): number {
  return feetY + (crouched ? 1.05 : 1.6);
}

/**
 * (camera-cue fix) One camera's per-player test, shared by the host's think and the co-op client's cue pulse: 0 unless
 * the head is in the camera's frame with a clear `MASK.SIGHT` ray from the lens, else the meter rate (the guard formula
 * at the camera's own IR light, `CAMERA.irLight`: lamps do not matter to a camera, marlow-jammer M3). The camera "sees"
 * the body when `seenAt(rate)` (the rate is over the leak level).
 */
export function cameraSight(c: CameraUnit, head: Vector3, crouched: boolean, speed: number, ray: SightRay): number {
  if (!c.covers(head.x, head.y, head.z)) return 0;
  // a hit within 0.2 m of the head is the body's own surroundings, not an occluder
  const dist = lensRay(c, head, 0.2, ray);
  // (camera-range) the falloff runs over this camera's own range (`c.range`, `camRange`): host and client alike
  return dist < 0 ? 0 : cameraRate(dist, crouched, speed, c.range);
}

/**
 * The one `MASK.SIGHT` ray (static, frosted glass: E2) from the camera's lens to `to`: the distance (m) when nothing is hit closer than `slack` short
 * of the point (no hit returns the length), else -1. Shared by the player test and the body pass.
 */
function lensRay(c: CameraUnit, to: Vector3, slack: number, ray: SightRay): number {
  LENS.set(c.x, c.y, c.z);
  const dist = hyp3(to.x - c.x, to.y - c.y, to.z - c.z);
  return ray.hitDistance(LENS, to, MASK.SIGHT) <= dist - slack ? -1 : dist;
}

/** (guard-ai S7, design 9) The camera body pass: its rate and where on a body the ray aims. */
export const CAM_BODY = {
  /** Body tests per second per camera (the player think stays at `CAMERA.thinkHz`). */
  hz: 2,
  /** The ray aims this far above the body's pelvis (`Body.pos`), the guards' own hips point (`Enemy.lookForBodies`). */
  hipsUp: 0.15,
  /** A hit this close short of the hips is the floor or wall the body lies on, not an occluder (the guards' slack). */
  slack: 0.35,
} as const;

/**
 * (guard-ai S7) A downed body as the camera pass reads it. `Body` (src/ai/body.ts) fits it as is, so the host can hand
 * over `EnemyManager.bodies` directly.
 */
export interface CamBody {
  readonly id: string;
  /** Pelvis world position. */
  readonly pos: { readonly x: number; readonly y: number; readonly z: number };
  /** Killed (true) or knocked out (false). */
  readonly lethal: boolean;
  readonly carried: boolean;
  readonly hidden: boolean;
  /** On the floor (not carried, not hidden, its rig alive). */
  readonly present: boolean;
}

/** (guard-ai S7) The bodies the cameras look for: called once per body pass, must not allocate (return a kept array). */
export type CamBodySource = () => readonly CamBody[];

/** (guard-ai S7) A camera's first sight of a body (once per camera per body). Position is the body's pelvis. */
export interface CameraBodyEvent {
  camera: string;
  bodyId: string;
  lethal: boolean;
  x: number;
  y: number;
  z: number;
  /** The camera's Sector Ops section (none = a camera of every section). */
  section: number | undefined;
}

const HIPS = new Vector3();

/**
 * (guard-ai S7) Pure decision: does camera `c` see the body (pelvis at `bx, by, bz`) now? Online and not frozen (jammed,
 * looped, off and destroyed cameras are blind), hips inside the frame and range (`covers`), and one clear static ray from
 * the lens to the hips. IR (G240): no light term, a body in the dark is seen the same.
 */
export function cameraSeesBody(c: CameraUnit, bx: number, by: number, bz: number, ray: SightRay): boolean {
  if (c.frozen) return false;
  HIPS.set(bx, by + CAM_BODY.hipsUp, bz);
  if (!c.covers(HIPS.x, HIPS.y, HIPS.z)) return false;
  return lensRay(c, HIPS, CAM_BODY.slack, ray) >= 0;
}

/**
 * Host-side security logic (S0 section 2): the cameras think at `CAMERA.thinkHz`, each tests every living player
 * with one ray to the head when the player is inside the frame, and fills a meter by the guard formula. Cameras
 * only report; they never touch enemies (the desk, Part B, is the one that answers).
 */
export class SecuritySystem {
  readonly cameras: CameraUnit[] = [];
  onEvent: ((e: SecurityEvent) => void) | null = null;
  /**
   * (guard-ai S7) A camera's first sight of a downed body. Separate from `onEvent`, which `CtDevices` takes over (it is
   * replaced, not chained). Host only (the system exists only there).
   */
  onBody: ((e: CameraBodyEvent) => void) | null = null;
  /** (sector-redesign E8) A round ricocheted off a bulletproof camera at (x, y, z): the effect and sound (GameState). */
  onRicochet: ((x: number, y: number, z: number) => void) | null = null;
  /** (marlow-final S10) Rounds a bulletproof housing turned (tests). */
  ricochets = 0;
  private thinkT = 0;
  private bodyT = 0;
  private bodySrc: CamBodySource | null = null;
  /** Per camera (same index as `cameras`): the body ids it has already reported. */
  private readonly bodySeen: Set<string>[] = [];
  private readonly head = new Vector3();

  constructor(
    data: SecurityData,
    private host: SecurityHost,
    private view: SecurityView | null = null,
  ) {
    for (const d of data.devices) {
      if (d.kind !== 'camera') continue;
      const c = new CameraUnit(d, data.levels?.[d.level] ?? 0);
      this.cameras.push(c);
      this.bodySeen.push(new Set());
      view?.addCamera(c);
    }
  }

  /** (guard-ai S7) Where the body pass reads the downed bodies (`() => enemyManager.bodies`); null stops the pass. */
  setBodySource(src: CamBodySource | null): void {
    this.bodySrc = src;
  }

  /** (guard-ai S7) Every camera forgets which bodies it has reported (a Sector Ops restart). */
  clearBodyReports(): void {
    for (let i = 0; i < this.bodySeen.length; i++) this.bodySeen[i]!.clear();
  }

  camera(id: string): CameraUnit | undefined {
    return this.cameras.find((c) => c.def.id === id);
  }

  /** The meter a camera holds on a player (undefined until it has thought about them). */
  meterOf(cameraId: string, playerId: string): CamMeter | undefined {
    return this.camera(cameraId)?.meters.get(playerId);
  }

  /** Fixed step: the sweeps turn, the cameras think at their own rate. */
  fixedUpdate(dt: number): void {
    for (let i = 0; i < this.cameras.length; i++) this.cameras[i]!.advance(dt);
    this.thinkT += dt;
    const step = 1 / CAMERA.thinkHz;
    while (this.thinkT >= step) {
      this.thinkT -= step;
      this.think(step);
    }
    this.bodyT += dt;
    const bstep = 1 / CAM_BODY.hz;
    while (this.bodyT >= bstep) {
      this.bodyT -= bstep;
      this.bodyPass();
    }
    this.view?.update(this.cameras);
  }

  /**
   * (guard-ai S7, design 9) Every online camera looks for downed bodies: present ones (not carried, not hidden) it has
   * not reported yet, by `cameraSeesBody` (frame, range, one ray; IR, no light). The first sight emits `onBody` once per
   * camera per body (another camera that sees the same body reports it too). No allocation but the event itself.
   */
  private bodyPass(): void {
    const src = this.bodySrc;
    const emit = this.onBody;
    if (!src || !emit) return;
    const bodies = src();
    if (bodies.length === 0) return;
    const ray = this.host.ballistics;
    for (let i = 0; i < this.cameras.length; i++) {
      const c = this.cameras[i]!;
      // (guard-ai walk 4.82 item 6) a training camera (`guardResponse` false) reports no body: no guard response
      if (!c.sees || c.frozen || !cameraAlertsGuards(c.def)) continue;
      const seen = this.bodySeen[i]!;
      for (let j = 0; j < bodies.length; j++) {
        const b = bodies[j]!;
        if (!b.present || b.carried || b.hidden || seen.has(b.id)) continue;
        if (!cameraSeesBody(c, b.pos.x, b.pos.y, b.pos.z, ray)) continue;
        seen.add(b.id);
        emit({ camera: c.def.id, bodyId: b.id, lethal: b.lethal, x: b.pos.x, y: b.pos.y, z: b.pos.z, section: c.def.section });
      }
    }
  }

  private think(dt: number): void {
    const players = this.host.players();
    for (let i = 0; i < this.cameras.length; i++) {
      const c = this.cameras[i]!;
      if (c.mode === 'destroyed') continue;
      for (let j = 0; j < players.length; j++) {
        const p = players[j]!;
        const m = c.meter(p.id);
        let rate = 0;
        if (c.sees && p.target.alive) {
          if (p.target.headPoint) p.target.headPoint(this.head);
          else p.target.aimPoint(this.head);
          rate = cameraSight(c, this.head, p.crouched, p.speed, this.host.ballistics);
        }
        const rose = stepCamMeter(m, rate, dt);
        if (rose) this.onEvent?.({ kind: 'stage', camera: c.def.id, player: p.id, stage: rose, x: p.feet.x, z: p.feet.z });
      }
    }
  }

  /**
   * A hitscan shot from `from` to `to`: a camera whose housing it passes through is destroyed. Returns its id.
   * (sector-redesign E8) A bulletproof housing stops the round instead: `onRicochet` plays the sparks and impact sound
   * at the lens, the camera stays as it was and null is returned.
   */
  shotRay(from: Vector3, to: Vector3): string | null {
    // (polish 11) the housing nearest along the round, not the first in the list (a far bulletproof camera listed first
    // no longer shields a near shootable one)
    const c = nearestHousing(this.cameras, from.x, from.y, from.z, to.x, to.y, to.z);
    if (!c) return null;
    if (c.def.bulletproof) {
      this.ricochets++;
      this.onRicochet?.(c.x, c.y, c.z);
      return null;
    }
    c.destroy();
    this.view?.update(this.cameras);
    this.onEvent?.({ kind: 'cameraDown', camera: c.def.id, x: c.x, z: c.z });
    return c.def.id;
  }

  dispose(): void {
    this.view?.dispose();
    this.onEvent = null;
    this.onBody = null;
    this.bodySrc = null;
  }
}
