import { Vector3 } from '../core/babylon';
import type { PlayerRef } from '../ai/enemy';
import type { Ballistics } from '../weapons/ballistics';
import { G } from '../physics/groups';
import { CAMERA } from '../config/security';
import { hyp3 } from '../core/mathx';
import { CameraUnit, cameraRate, segmentHitsHousing, stepCamMeter, type CamMeter } from './camera';
import type { SecurityData } from './data';
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
 * the head is in the camera's frame with a clear `G.STATIC` ray from the lens, else the meter rate (the guard formula
 * at the camera's own IR light, `CAMERA.irLight`: lamps do not matter to a camera, marlow-jammer M3). The camera "sees"
 * the body when `seenAt(rate)` (the rate is over the leak level).
 */
export function cameraSight(c: CameraUnit, head: Vector3, crouched: boolean, speed: number, ray: SightRay): number {
  if (!c.covers(head.x, head.y, head.z)) return 0;
  LENS.set(c.x, c.y, c.z);
  const dist = hyp3(head.x - c.x, head.y - c.y, head.z - c.z);
  // a hit within 0.2 m of the head is the body's own surroundings, not an occluder (no hit returns the length)
  if (ray.hitDistance(LENS, head, G.STATIC) <= dist - 0.2) return 0;
  // (camera-range) the falloff runs over this camera's own range (`c.range`, `camRange`): host and client alike
  return cameraRate(dist, crouched, speed, c.range);
}

/**
 * Host-side security logic (S0 section 2): the cameras think at `CAMERA.thinkHz`, each tests every living player
 * with one ray to the head when the player is inside the frame, and fills a meter by the guard formula. Cameras
 * only report; they never touch enemies (the desk, Part B, is the one that answers).
 */
export class SecuritySystem {
  readonly cameras: CameraUnit[] = [];
  onEvent: ((e: SecurityEvent) => void) | null = null;
  /** (sector-redesign E8) A round ricocheted off a bulletproof camera at (x, y, z): the effect and sound (GameState). */
  onRicochet: ((x: number, y: number, z: number) => void) | null = null;
  private thinkT = 0;
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
      view?.addCamera(c);
    }
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
    this.view?.update(this.cameras);
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
    for (let i = 0; i < this.cameras.length; i++) {
      const c = this.cameras[i]!;
      if (c.mode === 'destroyed') continue;
      if (!segmentHitsHousing(c, from.x, from.y, from.z, to.x, to.y, to.z)) continue;
      if (c.def.bulletproof) {
        this.onRicochet?.(c.x, c.y, c.z);
        return null;
      }
      c.destroy();
      this.view?.update(this.cameras);
      this.onEvent?.({ kind: 'cameraDown', camera: c.def.id, x: c.x, z: c.z });
      return c.def.id;
    }
    return null;
  }

  dispose(): void {
    this.view?.dispose();
    this.onEvent = null;
  }
}
