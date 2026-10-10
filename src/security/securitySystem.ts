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
  /** Light level on a body when its owner has not sampled one (the same field the guards read). */
  lightAt(x: number, y: number, z: number): number;
}

/** What a camera reports (S1 Part B turns these into desk responses). */
export type SecurityEvent =
  | { kind: 'stage'; camera: string; player: string; stage: 1 | 2; x: number; z: number }
  | { kind: 'cameraDown'; camera: string; x: number; z: number };

/**
 * Host-side security logic (S0 section 2): the cameras think at `CAMERA.thinkHz`, each tests every living player
 * with one ray to the head when the player is inside the frame, and fills a meter by the guard formula. Cameras
 * only report; they never touch enemies (the desk, Part B, is the one that answers).
 */
export class SecuritySystem {
  readonly cameras: CameraUnit[] = [];
  onEvent: ((e: SecurityEvent) => void) | null = null;
  private thinkT = 0;
  private readonly lens = new Vector3();
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
          if (c.covers(this.head.x, this.head.y, this.head.z)) {
            this.lens.set(c.x, c.y, c.z);
            const dist = hyp3(this.head.x - c.x, this.head.y - c.y, this.head.z - c.z);
            const h = this.host.ballistics.ray(this.lens, this.head, G.STATIC);
            if (!h.hit || h.distance > dist - 0.2) {
              const light = p.light ?? this.host.lightAt(this.head.x, this.head.y, this.head.z);
              rate = cameraRate(dist, light, p.crouched, p.speed);
            }
          }
        }
        const rose = stepCamMeter(m, rate, dt);
        if (rose) this.onEvent?.({ kind: 'stage', camera: c.def.id, player: p.id, stage: rose, x: p.feet.x, z: p.feet.z });
      }
    }
  }

  /** A hitscan shot from `from` to `to`: a camera whose housing it passes through is destroyed. Returns its id. */
  shotRay(from: Vector3, to: Vector3): string | null {
    for (let i = 0; i < this.cameras.length; i++) {
      const c = this.cameras[i]!;
      if (c.mode === 'destroyed') continue;
      if (!segmentHitsHousing(c, from.x, from.y, from.z, to.x, to.y, to.z)) continue;
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
